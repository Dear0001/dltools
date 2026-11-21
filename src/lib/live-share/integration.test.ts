import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket, { WebSocketServer } from 'ws';
import { loadConfig } from './config';
import { Connection, type ConnectionStatus } from './connection';
import { HostController } from './hostController';
import { ViewerController, type CredentialStore } from './viewerController';
import { createLiveShareServer, type LiveShareServer } from './server';
import type { ServerMessage } from './protocol';

const ORIGIN = 'http://localhost:4028';
const sockets: WebSocket[] = [];

/** Browser-like WebSocket: sends an Origin header and records instances so tests can cut the network. */
class TestSocket extends WebSocket {
  constructor(url: string) {
    super(url, { origin: ORIGIN });
    sockets.push(this);
  }
}
const Impl = TestSocket as unknown as typeof globalThis.WebSocket;

let server: LiveShareServer;
let url: string;
const controllers: Array<{ dispose(): void }> = [];

async function until<T>(fn: () => T | undefined | false | null, ms = 3000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - start > ms) throw new Error(`timeout waiting for condition: ${fn.toString()}`);
    await new Promise((r) => setTimeout(r, 15));
  }
}

const newHost = () => { const h = new HostController({ url, WebSocketImpl: Impl, debounceMs: 20, maxWaitMs: 60 }); controllers.push(h); return h; };
const newViewer = () => { const v = new ViewerController({ url, WebSocketImpl: Impl }); controllers.push(v); return v; };
const newViewerWith = (credentials: CredentialStore) => { const v = new ViewerController({ url, WebSocketImpl: Impl, credentials }); controllers.push(v); return v; };

async function pair(host: HostController, name: string) {
  const viewer = newViewer();
  const code = host.state.host!.code!;
  viewer.start(code, name);
  const pending = await until(() => host.state.host?.pending.find((p) => p.name === name));
  expect(viewer.state.phase).toBe('pending');
  host.approve(pending.requestId);
  await until(() => viewer.state.phase === 'joined');
  return viewer;
}

async function startedHost() {
  const host = newHost();
  host.start();
  await until(() => host.state.phase === 'active');
  return host;
}

beforeEach(async () => {
  server = createLiveShareServer({
    port: 0,
    host: '127.0.0.1',
    allowedOrigins: [ORIGIN],
    config: loadConfig({}, { hostGraceMs: 1500, viewerGraceMs: 5000, requireApproval: true }),
    tickMs: 50,
  });
  const port = await server.start();
  url = `ws://127.0.0.1:${port}/live-share`;
});

afterEach(async () => {
  controllers.splice(0).forEach((c) => c.dispose());
  sockets.splice(0).forEach((s) => s.terminate());
  await server.stop();
});

describe('two-device flow over a real WebSocket server', () => {
  it('Device A creates a session, Device B joins with the code, A approves, B sees A\'s JSON Formatter live', async () => {
    const host = await startedHost();
    expect(host.state.host!.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    host.publish('tool-json-formatter', { input: '{"name":"DLTools"}', output: '{\n  "name": "DLTools"\n}', status: 'success' });
    const viewer = await pair(host, 'Device B');
    expect(viewer.state.toolId).toBe('tool-json-formatter');
    expect(viewer.state.fields.output).toBe('{\n  "name": "DLTools"\n}');

    host.publish('tool-json-formatter', { input: '{"a":1}', output: '{\n  "a": 1\n}', status: 'success' });
    await until(() => viewer.state.fields.input === '{"a":1}');
    expect(viewer.state.fields.output).toBe('{\n  "a": 1\n}');
    expect(viewer.state.connection).toBe('open');
  });

  it('debounces typing: a burst of keystrokes produces far fewer messages and the final text arrives', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    let relayed = 0;
    viewer.store.subscribe(() => { relayed += 1; });
    let text = '';
    for (let i = 0; i < 40; i += 1) {
      text += 'x';
      host.publish('tool-sql-formatter', { input: text, output: '', dialect: 'postgresql', status: 'idle' });
      await new Promise((r) => setTimeout(r, 2));
    }
    await until(() => viewer.state.fields.input === text);
    expect(relayed).toBeLessThan(15);
  });

  it('does not resend unchanged content', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-regex-tester', { pattern: 'a+', flags: 'g', testString: 'aaa', replacement: '', mode: 'match', output: 'aaa' });
    await until(() => viewer.state.fields.pattern === 'a+');
    const at = viewer.state.lastUpdateAt;
    host.publish('tool-regex-tester', { pattern: 'a+', flags: 'g', testString: 'aaa', replacement: '', mode: 'match', output: 'aaa' });
    await new Promise((r) => setTimeout(r, 120));
    expect(viewer.state.lastUpdateAt).toBe(at);
  });

  it('syncs SQL Formatter and Regex Tester, including switching tools', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-sql-formatter', { input: 'select 1', output: 'SELECT\n  1', dialect: 'mysql', status: 'success' });
    await until(() => viewer.state.toolId === 'tool-sql-formatter');
    expect(viewer.state.fields).toMatchObject({ output: 'SELECT\n  1', dialect: 'mysql' });
    host.publish('tool-regex-tester', { pattern: '(\\d+)', flags: 'gi', testString: 'a1 b22', replacement: '', mode: 'match' });
    await until(() => viewer.state.toolId === 'tool-regex-tester');
    expect(viewer.state.fields).toMatchObject({ pattern: '(\\d+)', testString: 'a1 b22' });
    expect(viewer.state.fields.dialect).toBeUndefined(); // previous tool's fields are gone
  });

  it('viewers are told when the host opens a tool that cannot be shared', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-json-formatter', { input: '{}', output: '{}', status: 'success' });
    await until(() => viewer.state.toolId === 'tool-json-formatter');
    host.publish('tool-password-generator', { password: randomUUID() });
    await until(() => viewer.state.toolId === null);
    expect(viewer.state.fields).toEqual({});
    expect(viewer.state.hostToolUnsupported).toBe(true);
    expect(host.state.activeToolSupported).toBe(false);
    // Leaving to a page with no tool is a different state from an unshareable tool.
    host.release('tool-password-generator');
    await until(() => !viewer.state.hostToolUnsupported);
    expect(viewer.state.toolId).toBeNull();
  });

  it('fans out to multiple viewers', async () => {
    const host = await startedHost();
    const [v1, v2, v3] = [await pair(host, 'V1'), await pair(host, 'V2'), await pair(host, 'V3')];
    host.publish('tool-json-formatter', { input: '[1,2]', output: '[\n 1,\n 2\n]', status: 'success' });
    await until(() => [v1, v2, v3].every((v) => v.state.fields.input === '[1,2]'));
    expect(host.state.host!.viewers).toHaveLength(3);
  });

  it('withholds credentials: viewers receive a blank field, host is told', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-json-formatter', { input: '{"api_key":"sk_live_abcdef123456"}', output: '', status: 'idle' });
    await until(() => host.state.withheld.length > 0);
    await until(() => viewer.state.toolId === 'tool-json-formatter');
    expect(viewer.state.fields.input).toBe('');
    expect(JSON.stringify(viewer.state)).not.toContain('sk_live');
  });

  it('pause stops delivery; resume sends the current content', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-json-formatter', { input: '1', output: '1', status: 'success' });
    await until(() => viewer.state.fields.input === '1');
    host.pause();
    await until(() => viewer.state.paused);
    host.publish('tool-json-formatter', { input: '2-while-paused', output: '2', status: 'success' });
    await new Promise((r) => setTimeout(r, 150));
    expect(viewer.state.fields.input).toBe('1');
    host.resume();
    await until(() => !viewer.state.paused && viewer.state.fields.input === '2-while-paused');
  });

  it('rejection: viewer sees rejected and never receives content', async () => {
    const host = await startedHost();
    host.publish('tool-json-formatter', { input: 'private', output: '', status: 'idle' });
    const viewer = newViewer();
    viewer.start(host.state.host!.code!, 'Nope');
    const pending = await until(() => host.state.host?.pending[0]);
    host.reject(pending.requestId);
    await until(() => viewer.state.phase === 'rejected');
    expect(viewer.state.fields).toEqual({});
  });

  it('host End Session ends viewers immediately', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.end();
    await until(() => viewer.state.phase === 'ended');
    expect(viewer.state.endedReason).toBe('host_ended');
    expect(viewer.state.fields).toEqual({});
  });

  it('host kicks a viewer', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.kick(host.state.host!.viewers[0].id);
    await until(() => viewer.state.phase === 'ended');
    expect(viewer.state.endedReason).toBe('kicked');
  });
});

describe('network interruption', () => {
  it('viewer reconnects after a dropped connection and catches up on missed updates', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-json-formatter', { input: 'before', output: '', status: 'idle' });
    await until(() => viewer.state.fields.input === 'before');
    const viewerSocket = sockets.at(-1)!; // newest socket belongs to the viewer
    viewerSocket.terminate();
    await until(() => viewer.state.connection !== 'open');
    expect(viewer.state.connection).toMatch(/reconnecting|connecting/); // never a false "open"
    host.publish('tool-json-formatter', { input: 'during outage', output: '', status: 'idle' });
    await until(() => viewer.state.connection === 'open' && viewer.state.fields.input === 'during outage', 6000);
    expect(viewer.state.phase).toBe('joined');
  });

  it('host reconnects within the grace period and resends full state', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.publish('tool-json-formatter', { input: 'x', output: 'y', status: 'success' });
    await until(() => viewer.state.fields.input === 'x');
    const hostSocket = sockets[0];
    hostSocket.terminate();
    await until(() => !viewer.state.hostConnected);
    await until(() => viewer.state.hostConnected && host.state.connection === 'open', 6000);
    host.publish('tool-json-formatter', { input: 'after', output: 'y', status: 'success' });
    await until(() => viewer.state.fields.input === 'after');
    expect(viewer.state.phase).toBe('joined');
  });

  it('session ends for viewers if the host never comes back', async () => {
    const host = await startedHost();
    const viewer = await pair(host, 'B');
    host.dispose(); // closes without ending: simulates the tab closing
    await until(() => viewer.state.phase === 'ended', 4000);
    expect(viewer.state.endedReason).toBe('host_disconnected');
  });
});

describe('service unreachable', () => {
  it('reports unreachable instead of spinning forever, then recovers by itself when the service appears', async () => {
    // Reserve a port, close it, and point the host at it: nothing is listening.
    const probe = createLiveShareServer({ port: 0, host: '127.0.0.1', allowedOrigins: [ORIGIN] });
    const port = await probe.start();
    await probe.stop();
    const host = new HostController({ url: `ws://127.0.0.1:${port}/live-share`, WebSocketImpl: Impl, connectTimeoutMs: 300 });
    controllers.push(host);
    host.start();
    await until(() => host.state.unreachable, 3000);
    expect(host.state.phase).toBe('starting');
    expect(host.state.connection).not.toBe('open'); // never a false "Connected"
    // Bring the service up on that port: the pending attempt should succeed without any user action.
    const revived = createLiveShareServer({ port, host: '127.0.0.1', allowedOrigins: [ORIGIN] });
    await revived.start();
    try {
      await until(() => host.state.phase === 'active', 15_000);
      expect(host.state.unreachable).toBe(false);
    } finally {
      host.dispose();
      await revived.stop();
    }
  }, 30_000);
});

describe('slow consumers', () => {
  it('a viewer that stops reading cannot stall the host or other viewers, and catches up afterwards', async () => {
    const host = await startedHost();
    const fast = await pair(host, 'Fast');
    const slow = await pair(host, 'Slow');
    const slowSocket = sockets.at(-1)!; // the most recent socket is the slow viewer's
    // Stop reading from the slow viewer's TCP socket: the server's send buffer for it will fill.
    (slowSocket as unknown as { _socket: { pause(): void; resume(): void } })._socket.pause();

    let slowUpdates = 0;
    slow.store.subscribe(() => { slowUpdates += 1; });
    const big = 'y'.repeat(150_000);
    for (let i = 1; i <= 60; i += 1) {
      host.publish('tool-json-formatter', { input: `${i}:${big}`, output: '', status: 'idle' });
      await new Promise((r) => setTimeout(r, 30));
    }
    await until(() => fast.state.fields.input?.startsWith('60:'), 8000);
    expect(host.state.phase).toBe('active');
    expect(host.state.connection).toBe('open');

    (slowSocket as unknown as { _socket: { resume(): void } })._socket.resume();
    await until(() => slow.state.fields.input?.startsWith('60:'), 10_000); // coalesced snapshot, not 60 stale patches
    expect(slow.state.phase).toBe('joined');
    expect(slowUpdates).toBeLessThan(60); // proves updates were coalesced rather than all queued
  }, 30_000);
});

describe('connection cap', () => {
  it('refuses new sockets from an address that already holds too many', async () => {
    await server.stop();
    server = createLiveShareServer({ port: 0, host: '127.0.0.1', allowedOrigins: [ORIGIN], config: loadConfig({}, { maxConnectionsPerIp: 3 }), tickMs: 50 });
    url = `ws://127.0.0.1:${await server.start()}/live-share`;
    const open: WebSocket[] = [];
    for (let i = 0; i < 3; i += 1) {
      const ws = new WebSocket(url, { origin: ORIGIN }); sockets.push(ws); open.push(ws);
      await new Promise((r) => ws.once('open', r));
    }
    const extra = new WebSocket(url, { origin: ORIGIN }); sockets.push(extra);
    const code = await new Promise<number>((r) => extra.on('close', (c) => r(c)));
    expect(code).toBe(1013);
    open[0].close();
    await until(() => open[0].readyState === WebSocket.CLOSED);
    await new Promise((r) => setTimeout(r, 50));
    const again = new WebSocket(url, { origin: ORIGIN }); sockets.push(again);
    await new Promise<void>((resolve, reject) => { again.once('open', () => resolve()); again.once('close', () => reject(new Error('still refused'))); });
  });
});

describe('dead-link detection', () => {
  it('a socket that stops answering is abandoned and reported as reconnecting, never "open"', async () => {
    // A server that accepts connections but never replies (a half-open link looks the same to the client).
    const silent = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise((r) => silent.once('listening', r));
    const port = (silent.address() as { port: number }).port;
    const statuses: ConnectionStatus[] = [];
    const conn = new Connection({
      url: `ws://127.0.0.1:${port}/live-share`, WebSocketImpl: Impl, pingIntervalMs: 40, pongTimeoutMs: 120, baseBackoffMs: 5_000,
      onOpen: () => {}, onMessage: () => {}, onStatus: (s) => statuses.push(s),
    });
    controllers.push({ dispose: () => conn.close() });
    conn.connect();
    await until(() => statuses.includes('open'));
    await until(() => statuses.at(-1) === 'reconnecting', 2000);
    expect(conn.isOpen).toBe(false);
    conn.close();
    await new Promise((r) => silent.close(r));
  });
});

describe('server hardening', () => {
  const raw = (origin?: string) => new Promise<{ ws: WebSocket; opened: boolean; code?: number }>((resolve) => {
    const ws = new WebSocket(url, origin ? { origin } : {});
    sockets.push(ws);
    ws.on('open', () => resolve({ ws, opened: true }));
    ws.on('unexpected-response', (_req, res) => resolve({ ws, opened: false, code: res.statusCode }));
    ws.on('error', () => undefined);
  });

  it('rejects connections from disallowed or missing origins', async () => {
    expect((await raw('https://evil.example')).code).toBe(403);
    expect((await raw()).code).toBe(403);
  });

  it('serves a health check with counts only', async () => {
    const port = new URL(url).port;
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(await res.json()).toEqual({ ok: true, sessions: 0 });
  });

  it('closes oversize frames and answers invalid JSON with an error, not a crash', async () => {
    const { ws } = await raw(ORIGIN);
    const messages: ServerMessage[] = [];
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));
    ws.send('{nope');
    await until(() => messages.find((m) => m.type === 'ERROR'));
    const closed = new Promise<number>((r) => ws.on('close', (c) => r(c)));
    ws.send('x'.repeat(2_000_000));
    expect([1006, 1009]).toContain(await closed); // server drops the connection (1009 too big / 1006 torn down mid-send)
  });

  it('a viewer socket cannot push content or control the host', async () => {
    const host = await startedHost();
    host.publish('tool-json-formatter', { input: 'host content', output: '', status: 'idle' });
    const viewer = await pair(host, 'B');
    await until(() => viewer.state.fields.input === 'host content');
    const attacker = await raw(ORIGIN);
    const got: ServerMessage[] = [];
    attacker.ws.on('message', (d) => got.push(JSON.parse(d.toString())));
    attacker.ws.send(JSON.stringify({ type: 'CONTENT_UPDATE', toolId: 'tool-json-formatter', version: 999, full: true, fields: { input: 'pwned' } }));
    attacker.ws.send(JSON.stringify({ type: 'END' }));
    await until(() => got.filter((m) => m.type === 'ERROR').length >= 2);
    expect(host.state.phase).toBe('active');
    expect(viewer.state.fields.input).toBe('host content');
  });

  it('brute-forcing codes over many sockets gets locked out', async () => {
    const host = await startedHost();
    const real = host.state.host!.code!;
    let locked = false;
    for (let i = 0; i < 20 && !locked; i += 1) {
      const { ws } = await raw(ORIGIN);
      const reply = new Promise<ServerMessage>((r) => ws.once('message', (d) => r(JSON.parse(d.toString()))));
      ws.send(JSON.stringify({ type: 'JOIN_REQUEST', code: `ZZZZ-${String(1000 + i).replace(/[01]/g, '2')}`, name: 'x' }));
      const m = await reply;
      if (m.type === 'ERROR' && m.code === 'RATE_LIMITED') locked = true;
    }
    expect(locked).toBe(true);
    // Even the correct code is refused from the same address while locked out.
    const { ws } = await raw(ORIGIN);
    const reply = new Promise<ServerMessage>((r) => ws.once('message', (d) => r(JSON.parse(d.toString()))));
    ws.send(JSON.stringify({ type: 'JOIN_REQUEST', code: real, name: 'x' }));
    expect(await reply).toMatchObject({ type: 'ERROR', code: 'RATE_LIMITED' });
  });
});

describe('warm-up (faster "Start sharing")', () => {
  it('opens the socket without creating a session, then Start sharing reuses that socket', async () => {
    const host = newHost();
    host.warmUp();
    await until(() => host.state.connection === 'open');
    expect(host.state.phase).toBe('idle');
    expect(server.manager.stats.sessions).toBe(0);

    const openSockets = sockets.length;
    host.start();
    await until(() => host.state.phase === 'active');
    expect(sockets.length).toBe(openSockets); // no second handshake
    expect(server.manager.stats.sessions).toBe(1);
  });

  it('cool() releases an unused warm socket and does not touch an active session', async () => {
    const warm = newHost();
    warm.warmUp();
    await until(() => warm.state.connection === 'open');
    warm.cool();
    await until(() => warm.state.connection === 'idle');

    const active = await startedHost();
    active.cool();
    expect(active.state.phase).toBe('active');
    expect(active.state.connection).toBe('open');
  });
});

/** Stand-in for this tab's sessionStorage: survives "reloading" (a new controller), like the browser one. */
function memoryCredentials(): CredentialStore & { value: { sessionId: string; viewerToken: string } | null } {
  return {
    value: null,
    load() { return this.value; },
    save(c) { this.value = c; },
    clear() { this.value = null; },
  };
}

describe('route synchronization: every device follows the host through the real routes', () => {
  it('A hosts on JSON Formatter; B, C, D join and follow A through SQL Formatter, Regex Tester and KHQR Builder; B survives a refresh; ending frees everyone', async () => {
    const host = await startedHost();
    host.setRoute('/tools/json-formatter');
    host.publish('tool-json-formatter', { input: '{"a":1}', indent: '2' });

    const storeB = memoryCredentials();
    const b = newViewerWith(storeB);
    b.start(host.state.host!.code!, 'B');
    host.approve((await until(() => host.state.host?.pending.find((p) => p.name === 'B'))).requestId);
    await until(() => b.state.phase === 'joined');
    const c = await pair(host, 'C');
    const d = await pair(host, 'D');
    const viewers = [b, c, d];

    // Join lands on the host's current route, with that tool's state.
    for (const v of viewers) {
      expect(v.state.route).toBe('/tools/json-formatter');
      await until(() => v.state.fields.input === '{"a":1}');
      expect(v.state.toolId).toBe('tool-json-formatter');
    }

    const steps: Array<[string, string, Record<string, string>]> = [
      ['/tools/sql-formatter', 'tool-sql-formatter', { input: 'select 1', dialect: 'mysql' }],
      ['/tools/regex-tester', 'tool-regex-tester', { pattern: '\\d+', flags: 'g', testString: 'a1b22' }],
      ['/tools/khqr-builder', 'tool-khqr-builder', { khqr: '00020101021229', fgColor: '#000000' }],
    ];
    for (const [route, toolId, fields] of steps) {
      host.release(viewers[0].state.toolId ?? ''); // the previous tool page unmounts
      host.setRoute(route);
      host.publish(toolId, fields);
      for (const v of viewers) {
        await until(() => v.state.route === route && v.state.toolId === toolId);
        for (const [k, val] of Object.entries(fields)) await until(() => v.state.fields[k] === val);
      }
    }
    expect(storeB.value).not.toBeNull();

    // Refresh B: a brand-new controller in the same tab resumes from the stored credentials.
    b.dispose();
    const b2 = newViewerWith(storeB);
    expect(b2.resume()).toBe(true);
    await until(() => b2.state.phase === 'joined');
    expect(b2.state.route).toBe('/tools/khqr-builder');
    expect(b2.state.fields.khqr).toBe('00020101021229');

    // Ending the session releases every viewer and forgets B's credentials.
    host.end();
    for (const v of [b2, c, d]) await until(() => v.state.phase === 'ended');
    expect(b2.state.route).toBeNull();
    expect(storeB.value).toBeNull();
    expect(newViewerWith(storeB).resume()).toBe(false);
  });

  it('a reload after the session ended quietly returns to normal browsing', async () => {
    const store = memoryCredentials();
    store.value = { sessionId: 'abcdefgh12345678', viewerToken: 'x'.repeat(40) };
    const v = newViewerWith(store);
    expect(v.resume()).toBe(true);
    await until(() => v.state.phase === 'idle' && !v.state.resuming);
    expect(store.value).toBeNull();
  });

  it('host route reports are deduplicated and only sent while sharing', async () => {
    const host = newHost();
    host.setRoute('/tools/json-formatter'); // not sharing yet: remembered, not sent
    host.start();
    await until(() => host.state.phase === 'active');
    const v = await pair(host, 'V');
    expect(v.state.route).toBe('/tools/json-formatter');
    host.setRoute(null); // a page that is not shared: viewers stay put
    host.setRoute('/tools/json-formatter');
    host.setRoute('/tools');
    await until(() => v.state.route === '/tools');
  });
});
