import { beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, type LiveShareConfig } from './config';
import { parseClientMessage, type ClientMessage, type ServerMessage } from './protocol';
import { SessionManager, type Transport } from './sessionManager';

class FakeTransport implements Transport {
  out = new Map<string, ServerMessage[]>();
  closed = new Map<string, string>();
  backlogBytes = new Map<string, number>();
  send(id: string, m: ServerMessage) { (this.out.get(id) ?? this.out.set(id, []).get(id)!).push(m); }
  close(id: string, _c: number, reason: string) { this.closed.set(id, reason); }
  backlog(id: string) { return this.backlogBytes.get(id) ?? 0; }
  of<T extends ServerMessage['type']>(id: string, type: T) {
    return (this.out.get(id) ?? []).filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type);
  }
  last<T extends ServerMessage['type']>(id: string, type: T) { return this.of(id, type).at(-1); }
}

let now = 1_000_000;
let transport: FakeTransport;
let manager: SessionManager;
let config: LiveShareConfig;

function setup(overrides: Partial<LiveShareConfig> = {}) {
  now = 1_000_000;
  transport = new FakeTransport();
  // Most tests here exercise the host-approval flow; the no-approval default has its own describe block.
  config = loadConfig({}, { requireApproval: true, ...overrides });
  manager = new SessionManager(config, transport, () => now);
}
const send = (id: string, m: ClientMessage) => manager.handle(id, m);

function createHost(id = 'host', ip = '10.0.0.1') {
  manager.connect(id, ip);
  send(id, { type: 'CREATE_SESSION', protocol: 1 });
  const created = transport.last(id, 'SESSION_CREATED')!;
  return { id, token: created.hostToken, state: created.state, code: created.state.code! };
}

function joinViewer(host: ReturnType<typeof createHost>, id: string, ip = '10.0.0.2', approve = true) {
  manager.connect(id, ip);
  send(id, { type: 'JOIN_REQUEST', code: host.code, name: id });
  const pending = transport.last(host.id, 'HOST_STATE')!.state.pending.at(-1)!;
  if (approve) send(host.id, { type: 'APPROVE', requestId: pending.requestId });
  return pending.requestId;
}

const update = (version: number, fields: Record<string, string>, full = false, toolId = 'tool-json-formatter'): ClientMessage =>
  ({ type: 'CONTENT_UPDATE', toolId, version, full, fields });

beforeEach(() => setup());

describe('session creation and pairing', () => {
  it('creates a session with an unambiguous 8-char code and secrets', () => {
    const host = createHost();
    expect(host.code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    expect(host.token.length).toBeGreaterThanOrEqual(32);
    expect(host.state.pairingExpiresAt).toBe(now + config.pairingTtlMs);
    expect(host.state.sessionExpiresAt).toBe(now + config.sessionTtlMs);
    expect(host.state.viewers).toEqual([]);
  });

  it('generates distinct codes and session ids', () => {
    const a = createHost('a', '1.1.1.1');
    const b = createHost('b', '1.1.1.2');
    expect(a.code).not.toBe(b.code);
    expect(a.state.sessionId).not.toBe(b.state.sessionId);
  });

  it('does not reveal the host token to anyone but the host', () => {
    const host = createHost();
    joinViewer(host, 'v1');
    const everything = JSON.stringify([...transport.out.get('v1')!]);
    expect(everything).not.toContain(host.token);
  });

  it('expires the pairing code after the TTL', () => {
    const host = createHost();
    manager.connect('v', '9.9.9.9');
    now += config.pairingTtlMs + 1;
    send('v', { type: 'JOIN_REQUEST', code: host.code, name: 'v' });
    expect(transport.last('v', 'ERROR')?.code).toBe('CODE_EXPIRED');
  });

  it('keeps the session alive after the code expires, and a refreshed code works', () => {
    const host = createHost();
    now += config.pairingTtlMs + 1;
    manager.tick();
    expect(transport.last(host.id, 'HOST_STATE')!.state.code).toBeNull();
    send(host.id, { type: 'REFRESH_CODE' });
    const fresh = transport.last(host.id, 'HOST_STATE')!.state.code!;
    expect(fresh).not.toBe(host.code);
    manager.connect('v', '9.9.9.9');
    send('v', { type: 'JOIN_REQUEST', code: fresh.toLowerCase().replace('-', ' '), name: 'v' });
    expect(transport.last('v', 'JOIN_PENDING')).toBeTruthy();
  });

  it('invalidates the old code when refreshed', () => {
    const host = createHost();
    send(host.id, { type: 'REFRESH_CODE' });
    manager.connect('v', '9.9.9.9');
    send('v', { type: 'JOIN_REQUEST', code: host.code, name: 'v' });
    expect(transport.last('v', 'ERROR')?.code).toBe('INVALID_CODE');
  });
});

describe('no approval (default)', () => {
  beforeEach(() => setup({ requireApproval: false }));

  it('defaults to admitting viewers without approval', () => {
    expect(loadConfig({}).requireApproval).toBe(false);
    expect(loadConfig({ LIVE_SHARE_REQUIRE_APPROVAL: 'true' }).requireApproval).toBe(true);
  });

  it('a valid code admits the viewer immediately with the current snapshot', () => {
    const host = createHost();
    send(host.id, update(1, { input: 'hello', output: 'HELLO', status: 'success' }, true));
    manager.connect('v', '10.0.0.2');
    send('v', { type: 'JOIN_REQUEST', code: host.code, name: 'v' });
    expect(transport.of('v', 'JOIN_PENDING')).toHaveLength(0);
    expect(transport.last('v', 'JOIN_APPROVED')!.snapshot.fields.input).toBe('hello');
    const state = transport.last(host.id, 'HOST_STATE')!.state;
    expect(state.viewers).toHaveLength(1);
    expect(state.pending).toHaveLength(0);
    send(host.id, update(2, { input: 'next' }));
    expect(transport.last('v', 'CONTENT_UPDATE')?.fields.input).toBe('next');
  });

  it('still rejects wrong and expired codes, and still caps viewers', () => {
    const host = createHost();
    manager.connect('bad', '10.0.0.9');
    send('bad', { type: 'JOIN_REQUEST', code: 'AAAA-AAAA', name: 'bad' });
    expect(transport.last('bad', 'ERROR')?.code).toBe('INVALID_CODE');
    expect(transport.of('bad', 'JOIN_APPROVED')).toHaveLength(0);
    for (let i = 0; i < config.maxViewers; i++) {
      manager.connect(`v${i}`, `10.0.1.${i}`);
      send(`v${i}`, { type: 'JOIN_REQUEST', code: host.code, name: `v${i}` });
      expect(transport.last(`v${i}`, 'JOIN_APPROVED')).toBeTruthy();
    }
    manager.connect('extra', '10.0.2.1');
    send('extra', { type: 'JOIN_REQUEST', code: host.code, name: 'extra' });
    expect(transport.last('extra', 'ERROR')?.code).toBe('SESSION_FULL');
    now += config.pairingTtlMs + 1;
    manager.connect('late', '10.0.3.1');
    send('late', { type: 'JOIN_REQUEST', code: host.code, name: 'late' });
    expect(transport.of('late', 'JOIN_APPROVED')).toHaveLength(0);
  });
});

describe('host approval', () => {
  it('requires approval: a pending viewer receives nothing', () => {
    const host = createHost();
    send(host.id, update(1, { input: '{"a":1}' }, true));
    joinViewer(host, 'v', '10.0.0.2', false);
    expect(transport.last('v', 'JOIN_PENDING')).toBeTruthy();
    expect(transport.of('v', 'SNAPSHOT')).toHaveLength(0);
    expect(transport.of('v', 'JOIN_APPROVED')).toHaveLength(0);
    send(host.id, update(2, { input: '{"secret":"x"}' }));
    expect(transport.of('v', 'CONTENT_UPDATE')).toHaveLength(0);
  });

  it('notifies the host of a request and approves with the current snapshot', () => {
    const host = createHost();
    send(host.id, update(1, { input: 'hello', output: 'HELLO', status: 'success' }, true));
    joinViewer(host, 'v');
    const approved = transport.last('v', 'JOIN_APPROVED')!;
    expect(approved.snapshot.fields.input).toBe('hello');
    expect(approved.snapshot.toolId).toBe('tool-json-formatter');
    expect(transport.last(host.id, 'HOST_STATE')!.state.viewers).toHaveLength(1);
  });

  it('rejects: viewer is told and disconnected, and gets no content', () => {
    const host = createHost();
    manager.connect('v', '10.0.0.2');
    send('v', { type: 'JOIN_REQUEST', code: host.code, name: 'v' });
    const { requestId } = transport.last(host.id, 'HOST_STATE')!.state.pending[0];
    send(host.id, { type: 'REJECT', requestId });
    expect(transport.last('v', 'JOIN_REJECTED')?.reason).toBe('rejected');
    expect(transport.closed.get('v')).toBe('rejected');
    send(host.id, update(1, { input: 'x' }, true));
    expect(transport.of('v', 'CONTENT_UPDATE')).toHaveLength(0);
  });

  it('times out unanswered requests', () => {
    const host = createHost();
    joinViewer(host, 'v', '10.0.0.2', false);
    now += config.joinRequestTtlMs + 1;
    manager.tick();
    expect(transport.last('v', 'JOIN_REJECTED')?.reason).toBe('timeout');
    expect(transport.last(host.id, 'HOST_STATE')!.state.pending).toHaveLength(0);
  });

  it('enforces the viewer limit', () => {
    setup({ maxViewers: 2 });
    const host = createHost();
    joinViewer(host, 'v1');
    joinViewer(host, 'v2');
    manager.connect('v3', '10.0.0.9');
    send('v3', { type: 'JOIN_REQUEST', code: host.code, name: 'v3' });
    expect(transport.last('v3', 'ERROR')?.code).toBe('SESSION_FULL');
  });
});

describe('real-time sync', () => {
  it('relays patches to all approved viewers (multiple viewers)', () => {
    const host = createHost();
    joinViewer(host, 'v1');
    joinViewer(host, 'v2', '10.0.0.3');
    send(host.id, update(1, { input: 'a', output: 'A' }, true));
    send(host.id, update(2, { output: 'B' }));
    for (const v of ['v1', 'v2']) {
      const updates = transport.of(v, 'CONTENT_UPDATE');
      expect(updates.map((u) => u.seq)).toEqual([1, 2]);
      expect(updates[1].fields).toEqual({ output: 'B' });
    }
  });

  it('drops duplicate and out-of-order host updates', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(5, { input: 'five' }, true));
    send(host.id, update(5, { input: 'five-dup' }));
    send(host.id, update(3, { input: 'three-stale' }));
    expect(transport.of('v', 'CONTENT_UPDATE')).toHaveLength(1);
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields.input).toBe('five');
    expect(manager.stats.droppedStale).toBe(2);
  });

  it('requires a full update when the tool changes', () => {
    const host = createHost();
    send(host.id, update(1, { input: 'a' }, true));
    send(host.id, update(2, { pattern: 'x' }, false, 'tool-regex-tester'));
    expect(transport.last(host.id, 'ERROR')?.code).toBe('NEED_FULL_UPDATE');
    send(host.id, update(3, { pattern: 'x', testString: 'y' }, true, 'tool-regex-tester'));
    joinViewer(host, 'v');
    expect(transport.last('v', 'JOIN_APPROVED')!.snapshot.toolId).toBe('tool-regex-tester');
  });

  it('lets a viewer resync with a full snapshot after a gap', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: 'a', output: 'b' }, true));
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot).toMatchObject({ seq: 1, fields: { input: 'a', output: 'b' } });
  });

  it('coalesces updates for a backed-up viewer and sends one snapshot when it drains', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: 'a' }, true));
    transport.backlogBytes.set('v', config.backpressureBytes + 1);
    send(host.id, update(2, { input: 'ab' }));
    send(host.id, update(3, { input: 'abc' }));
    expect(transport.of('v', 'CONTENT_UPDATE')).toHaveLength(1);
    transport.backlogBytes.set('v', 0);
    manager.tick();
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields.input).toBe('abc');
  });

  it('pauses and resumes: nothing is relayed or stored while paused', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: 'before' }, true));
    send(host.id, { type: 'PAUSE' });
    expect(transport.last('v', 'SHARING')?.paused).toBe(true);
    send(host.id, update(2, { input: 'while paused' }));
    expect(transport.of('v', 'CONTENT_UPDATE')).toHaveLength(1);
    send(host.id, { type: 'RESUME' });
    expect(transport.last('v', 'SHARING')?.paused).toBe(false);
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields.input).toBe('before');
  });
});

describe('disconnection and reconnection', () => {
  it('a viewer can reconnect within the grace period with its token and gets current state', () => {
    const host = createHost();
    joinViewer(host, 'v1');
    const { viewerToken } = transport.last('v1', 'JOIN_APPROVED')!;
    send(host.id, update(1, { input: 'a' }, true));
    manager.disconnect('v1');
    expect(transport.last(host.id, 'HOST_STATE')!.state.viewers[0].connected).toBe(false);
    send(host.id, update(2, { input: 'b' }));
    manager.connect('v1b', '10.0.0.2');
    send('v1b', { type: 'RECONNECT_VIEWER', sessionId: host.state.sessionId, viewerToken });
    expect(transport.last('v1b', 'RECONNECTED')!.snapshot.fields.input).toBe('b');
    expect(transport.last(host.id, 'HOST_STATE')!.state.viewers[0].connected).toBe(true);
  });

  it('drops a viewer that stays away longer than the grace period', () => {
    const host = createHost();
    joinViewer(host, 'v1');
    manager.disconnect('v1');
    now += config.viewerGraceMs + 1;
    manager.tick();
    expect(transport.last(host.id, 'HOST_STATE')!.state.viewers).toHaveLength(0);
  });

  it('tells viewers when the host drops, and the host can resume in time', () => {
    const host = createHost();
    joinViewer(host, 'v');
    manager.disconnect(host.id);
    expect(transport.last('v', 'HOST_STATUS')?.connected).toBe(false);
    now += config.hostGraceMs - 1000;
    manager.tick();
    manager.connect('host2', '10.0.0.1');
    send('host2', { type: 'RECONNECT_HOST', sessionId: host.state.sessionId, hostToken: host.token });
    expect(transport.last('host2', 'SESSION_CREATED')).toBeTruthy();
    expect(transport.last('v', 'HOST_STATUS')?.connected).toBe(true);
  });

  it('ends the session when the host stays away past the grace period', () => {
    const host = createHost();
    joinViewer(host, 'v');
    manager.disconnect(host.id);
    now += config.hostGraceMs + 1;
    manager.tick();
    expect(transport.last('v', 'SESSION_ENDED')?.reason).toBe('host_disconnected');
    expect(manager.stats.sessions).toBe(0);
  });

  it('a viewer leaving frees its slot', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send('v', { type: 'LEAVE' });
    expect(transport.last(host.id, 'HOST_STATE')!.state.viewers).toHaveLength(0);
  });
});

describe('termination and expiry', () => {
  it('host ends the session: everyone is notified and the session is gone', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, { type: 'END' });
    expect(transport.last('v', 'SESSION_ENDED')?.reason).toBe('host_ended');
    expect(transport.closed.get('v')).toBe('host_ended');
    expect(manager.stats.sessions).toBe(0);
    manager.connect('late', '5.5.5.5');
    send('late', { type: 'JOIN_REQUEST', code: host.code, name: 'late' });
    expect(transport.last('late', 'ERROR')?.code).toBe('INVALID_CODE');
  });

  it('expires after the session TTL and can be extended (capped)', () => {
    const host = createHost();
    joinViewer(host, 'v');
    now += config.sessionTtlMs - 1000;
    send(host.id, { type: 'EXTEND' });
    now += 5000;
    manager.tick();
    expect(manager.stats.sessions).toBe(1);
    now += config.maxSessionLifetimeMs;
    manager.tick();
    expect(transport.last('v', 'SESSION_ENDED')?.reason).toMatch(/expired|idle/);
  });

  it('ends idle sessions', () => {
    setup({ idleTimeoutMs: 60_000 });
    const host = createHost();
    joinViewer(host, 'v');
    now += 61_000;
    manager.tick();
    expect(transport.last('v', 'SESSION_ENDED')?.reason).toBe('idle');
  });

  it('kicks a single viewer without affecting others', () => {
    const host = createHost();
    joinViewer(host, 'v1');
    joinViewer(host, 'v2', '10.0.0.3');
    const id = transport.last(host.id, 'HOST_STATE')!.state.viewers[0].id;
    send(host.id, { type: 'KICK', viewerId: id });
    expect(transport.last('v1', 'SESSION_ENDED')?.reason).toBe('kicked');
    send(host.id, update(1, { input: 'x' }, true));
    expect(transport.of('v1', 'CONTENT_UPDATE')).toHaveLength(0);
    expect(transport.of('v2', 'CONTENT_UPDATE')).toHaveLength(1);
  });
});

describe('security', () => {
  it('returns INVALID_CODE for unknown codes and never reveals session state', () => {
    createHost();
    manager.connect('x', '6.6.6.6');
    send('x', { type: 'JOIN_REQUEST', code: 'AAAA-AAAA', name: 'x' });
    const err = transport.last('x', 'ERROR')!;
    expect(err.code).toBe('INVALID_CODE');
    expect(JSON.stringify(transport.out.get('x'))).not.toMatch(/sessionId|hostToken/);
  });

  it('brute force: locks an address out after repeated failures, even for a valid code', () => {
    setup({ failedJoinLockThreshold: 4, joinAttemptsPerMinute: 100, pairingTtlMs: 60 * 60_000, sessionTtlMs: 3 * 60 * 60_000 });
    const host = createHost();
    for (let i = 0; i < 4; i += 1) {
      manager.connect(`g${i}`, '6.6.6.6');
      send(`g${i}`, { type: 'JOIN_REQUEST', code: `ZZZZ-ZZZ${i}`, name: 'g' });
    }
    manager.connect('g-late', '6.6.6.6');
    send('g-late', { type: 'JOIN_REQUEST', code: host.code, name: 'g' });
    expect(transport.last('g-late', 'ERROR')?.code).toBe('RATE_LIMITED');
    expect(transport.of('g-late', 'JOIN_PENDING')).toHaveLength(0);
    now += config.failedJoinLockMs + 1;
    manager.connect('g-ok', '6.6.6.6');
    send('g-ok', { type: 'JOIN_REQUEST', code: host.code, name: 'g' });
    expect(transport.last('g-ok', 'JOIN_PENDING')).toBeTruthy();
  });

  it('closes a connection after repeated invalid codes', () => {
    setup({ failedJoinLockThreshold: 100 });
    createHost();
    manager.connect('x', '6.6.6.6');
    for (let i = 0; i < 3; i += 1) send('x', { type: 'JOIN_REQUEST', code: `ZZZZ-ZZZ${i}`, name: 'x' });
    expect(transport.closed.has('x')).toBe(true);
  });

  it('rate limits join attempts per address', () => {
    setup({ joinAttemptsPerMinute: 3, failedJoinLockThreshold: 100 });
    createHost();
    for (let i = 0; i < 4; i += 1) {
      manager.connect(`c${i}`, '7.7.7.7');
      send(`c${i}`, { type: 'JOIN_REQUEST', code: 'AAAA-AAAA', name: 'x' });
    }
    expect(transport.last('c3', 'ERROR')?.code).toBe('RATE_LIMITED');
  });

  it('viewers cannot run host commands or modify host content', () => {
    const host = createHost();
    joinViewer(host, 'v');
    const before = transport.of(host.id, 'HOST_STATE').length;
    const attacks: ClientMessage[] = [
      update(99, { input: 'hijacked' }, true),
      { type: 'PAUSE' },
      { type: 'END' },
      { type: 'APPROVE', requestId: 'does-not-matter' },
      { type: 'KICK', viewerId: 'does-not-matter' },
      { type: 'EXTEND' },
      { type: 'REFRESH_CODE' },
    ];
    for (const attack of attacks) {
      send('v', attack);
      expect(transport.last('v', 'ERROR')?.code).toBe('FORBIDDEN');
    }
    expect(manager.stats.sessions).toBe(1);
    expect(transport.of(host.id, 'HOST_STATE').length).toBe(before);
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields.input).toBeUndefined();
  });

  it('pending (unapproved) connections cannot do anything either', () => {
    const host = createHost();
    joinViewer(host, 'p', '10.0.0.2', false);
    send('p', { type: 'SYNC_REQUEST' });
    expect(transport.last('p', 'ERROR')?.code).toBe('FORBIDDEN');
    send('p', { type: 'END' });
    expect(manager.stats.sessions).toBe(1);
  });

  it('cross-session: a viewer token cannot be used on another session, and tokens are not interchangeable with host tokens', () => {
    const hostA = createHost('hA', '1.1.1.1');
    const hostB = createHost('hB', '1.1.1.2');
    joinViewer(hostA, 'vA');
    const { viewerToken } = transport.last('vA', 'JOIN_APPROVED')!;
    manager.connect('evil', '8.8.8.8');
    send('evil', { type: 'RECONNECT_VIEWER', sessionId: hostB.state.sessionId, viewerToken });
    expect(transport.last('evil', 'ERROR')?.code).toBe('UNAUTHORIZED');
    manager.connect('evil2', '8.8.8.8');
    send('evil2', { type: 'RECONNECT_HOST', sessionId: hostA.state.sessionId, hostToken: viewerToken });
    expect(transport.last('evil2', 'ERROR')?.code).toBe('UNAUTHORIZED');
    // Content from host A never reaches viewers of B.
    joinViewer(hostB, 'vB', '10.0.0.5');
    send(hostA.id, update(1, { input: 'A-only' }, true));
    expect(transport.of('vB', 'CONTENT_UPDATE')).toHaveLength(0);
  });

  it('a wrong host token cannot hijack a session', () => {
    const host = createHost();
    manager.connect('evil', '8.8.8.8');
    send('evil', { type: 'RECONNECT_HOST', sessionId: host.state.sessionId, hostToken: 'x'.repeat(43) });
    expect(transport.last('evil', 'ERROR')?.code).toBe('UNAUTHORIZED');
    send(host.id, { type: 'PAUSE' }); // the real host is still in control
    expect(transport.last(host.id, 'HOST_STATE')?.state.paused).toBe(true);
    expect(transport.of('evil', 'HOST_STATE')).toHaveLength(0);
  });

  it('rejects credentials in shared content (server-side defense in depth)', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: '{"api_key": "sk_live_abcdef123456"}' }, true));
    expect(transport.last(host.id, 'ERROR')?.code).toBe('SENSITIVE_CONTENT');
    expect(transport.of('v', 'CONTENT_UPDATE')).toHaveLength(0);
  });

  it('floods are rate limited per connection', () => {
    const host = createHost();
    for (let i = 0; i < config.messageBurst + 5; i += 1) send(host.id, { type: 'PING', t: i });
    expect(transport.last(host.id, 'ERROR')?.code).toBe('RATE_LIMITED');
  });

  it('caps pending requests per session', () => {
    setup({ maxPendingRequests: 2, joinAttemptsPerMinute: 100 });
    const host = createHost();
    for (let i = 0; i < 3; i += 1) joinViewer(host, `p${i}`, `10.1.0.${i}`, false);
    expect(transport.last('p2', 'ERROR')?.code).toBe('RATE_LIMITED');
  });
});

describe('message validation', () => {
  const parse = (v: unknown) => parseClientMessage(typeof v === 'string' ? v : JSON.stringify(v), 1_000_000);

  it('rejects malformed, oversized and unknown messages', () => {
    expect(parse('not json').ok).toBe(false);
    expect(parse('[]').ok).toBe(false);
    expect(parse({ type: 'NOPE' }).ok).toBe(false);
    expect(parseClientMessage('{"type":"PAUSE"}'.padEnd(200, ' '), 100)).toMatchObject({ ok: false, code: 'MESSAGE_TOO_LARGE' });
    expect(parseClientMessage(null, 100).ok).toBe(false);
  });

  it('validates content updates against the tool registry', () => {
    const good = { type: 'CONTENT_UPDATE', toolId: 'tool-json-formatter', version: 1, full: true, fields: { input: '{}', status: 'success' } };
    expect(parse(good).ok).toBe(true);
    expect(parse({ ...good, toolId: 'tool-password-generator' })).toMatchObject({ ok: false, code: 'UNSUPPORTED_TOOL' });
    expect(parse({ ...good, toolId: '__proto__' }).ok).toBe(false);
    expect(parse({ ...good, fields: { password: 'x' } }).ok).toBe(false);
    expect(parse({ ...good, fields: { status: 'bogus' } }).ok).toBe(false);
    expect(parse({ ...good, fields: { input: 5 } }).ok).toBe(false);
    expect(parse({ ...good, fields: { input: 'x'.repeat(200_001) } }).ok).toBe(false);
    expect(parse({ ...good, version: 0 }).ok).toBe(false);
    expect(parse({ ...good, version: 1.5 }).ok).toBe(false);
  });

  it('sanitizes viewer names', () => {
    const r = parse({ type: 'JOIN_REQUEST', code: 'ABCD-EFGH', name: '  <b>Eve</b>\u0000\n  '.repeat(5) });
    expect(r.ok && r.message.type === 'JOIN_REQUEST' && r.message.name).toBeTruthy();
    if (r.ok && r.message.type === 'JOIN_REQUEST') {
      expect(r.message.name.length).toBeLessThanOrEqual(24);
      expect(r.message.name).not.toMatch(/[<>\u0000]/);
    }
  });
});

describe('workspace fields and file opt-in', () => {
  it('relays host theme and language with the tool state', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: '{}', 'ws.theme': 'midnight', 'ws.locale': 'kh' }, true));
    expect(transport.last('v', 'CONTENT_UPDATE')!.fields).toMatchObject({ 'ws.theme': 'midnight', 'ws.locale': 'kh' });
    send(host.id, update(2, { 'ws.theme': 'sunrise' }));
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields).toMatchObject({ 'ws.theme': 'sunrise', 'ws.locale': 'kh' });
  });

  it('blanks file content unless the host opted in — even from a modified client', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: 'JVBERi0xLjQKJcfsj6IK', target: 'pdf', fileName: 'a' }, true, 'tool-base64-document'));
    const first = transport.last('v', 'CONTENT_UPDATE')!;
    expect(first.fields.input).toBe('');
    expect(first.fields.target).toBe('pdf'); // options still flow
    send(host.id, { type: 'SET_ALLOW_FILES', allow: true });
    expect(transport.last(host.id, 'HOST_STATE')!.state.allowFiles).toBe(true);
    send(host.id, update(2, { input: 'JVBERi0xLjQKJcfsj6IK' }, false, 'tool-base64-document'));
    expect(transport.last('v', 'CONTENT_UPDATE')!.fields.input).toBe('JVBERi0xLjQKJcfsj6IK');
  });

  it('revoking file sharing wipes the content already relayed and tells viewers at once', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, { type: 'SET_ALLOW_FILES', allow: true });
    send(host.id, update(1, { input: 'SGVsbG8gd29ybGQ=', target: 'auto', fileName: 'x' }, true, 'tool-base64-document'));
    send(host.id, { type: 'SET_ALLOW_FILES', allow: false });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields.input).toBe('');
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot.fields.input).toBe('');
  });

  it('only the host can change file sharing', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send('v', { type: 'SET_ALLOW_FILES', allow: true });
    expect(transport.last('v', 'ERROR')?.code).toBe('FORBIDDEN');
    expect(transport.last(host.id, 'HOST_STATE')!.state.allowFiles).toBe(false);
  });
});

describe('no tool vs unsupported tool', () => {
  it('tells viewers which one it is, in the snapshot too', () => {
    const host = createHost();
    joinViewer(host, 'v');
    send(host.id, update(1, { input: 'x' }, true));
    send(host.id, { type: 'CLEAR_TOOL', unsupported: true });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot).toMatchObject({ toolId: null, unsupported: true });
    send(host.id, { type: 'CLEAR_TOOL', unsupported: false });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot).toMatchObject({ toolId: null, unsupported: false });
    send(host.id, update(2, { input: 'y' }, true));
    send('v', { type: 'SYNC_REQUEST' });
    expect(transport.last('v', 'SNAPSHOT')!.snapshot).toMatchObject({ toolId: 'tool-json-formatter', unsupported: false });
  });
});

