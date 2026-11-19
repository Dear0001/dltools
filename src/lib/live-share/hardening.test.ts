import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';
import { parseClientMessage, type ClientMessage, type ServerMessage } from './protocol';
import { SessionManager, type Transport } from './sessionManager';

/** Deterministic PRNG so a failing fuzz case can be replayed. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

class Sink implements Transport {
  out = new Map<string, ServerMessage[]>();
  send(id: string, m: ServerMessage) { (this.out.get(id) ?? this.out.set(id, []).get(id)!).push(m); }
  close() {}
  backlog() { return 0; }
}

describe('parser fuzzing', () => {
  const weird: unknown[] = [null, undefined, 0, -1, 1.5, NaN, Infinity, '', 'x', 'x'.repeat(100), true, [], {}, [1, 2], { a: 1 }, '__proto__', 'constructor'];
  const keys = ['type', 'toolId', 'version', 'full', 'fields', 'code', 'name', 'sessionId', 'hostToken', 'requestId', 'input', '__proto__', 'constructor', 'prototype'];
  const types = ['CREATE_SESSION', 'JOIN_REQUEST', 'CONTENT_UPDATE', 'APPROVE', 'KICK', 'PING', 'RECONNECT_HOST', 'RECONNECT_VIEWER', 'NOPE', 'toString', '__proto__'];

  it('never throws and only returns known message types, for 20,000 random inputs', () => {
    const r = rng(1234);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const known = new Set(['CREATE_SESSION', 'RECONNECT_HOST', 'JOIN_REQUEST', 'RECONNECT_VIEWER', 'APPROVE', 'REJECT', 'KICK', 'PAUSE', 'RESUME', 'EXTEND', 'REFRESH_CODE', 'END', 'CLEAR_TOOL', 'LEAVE', 'SYNC_REQUEST', 'PING', 'CONTENT_UPDATE']);
    for (let i = 0; i < 20_000; i += 1) {
      const obj: Record<string, unknown> = { type: pick(types) };
      for (let k = 0; k < Math.floor(r() * 6); k += 1) obj[pick(keys)] = r() < 0.3 ? { [pick(keys)]: pick(weird) } : pick(weird);
      const raw = r() < 0.1 ? JSON.stringify(obj).slice(0, Math.floor(r() * 40)) : JSON.stringify(obj);
      const result = parseClientMessage(raw, 1_000_000);
      if (result.ok) expect(known.has(result.message.type)).toBe(true);
    }
  });

  it('cannot pollute Object.prototype through update fields', () => {
    const raw = '{"type":"CONTENT_UPDATE","toolId":"tool-json-formatter","version":1,"full":true,"fields":{"__proto__":"x","constructor":"y","input":"ok"}}';
    expect(parseClientMessage(raw, 1_000_000).ok).toBe(false);
    const nested = '{"type":"CONTENT_UPDATE","toolId":"tool-json-formatter","version":1,"full":true,"fields":{"input":"ok"},"__proto__":{"polluted":true}}';
    parseClientMessage(nested, 1_000_000);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('state-machine fuzzing', () => {
  it('random message sequences never throw and never leak content to unapproved connections', () => {
    let approvals = 0; let relays = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = rng(seed);
      let now = 1_000_000;
      const sink = new Sink();
      const config = loadConfig({}, { joinAttemptsPerMinute: 10_000, failedJoinLockThreshold: 10_000, createsPerHour: 10_000, messagesPerSecond: 1e6, messageBurst: 1e6, maxViewers: 3, requireApproval: true });
      const m = new SessionManager(config, sink, () => now);
      const ids = Array.from({ length: 8 }, (_, i) => `c${i}`);
      ids.forEach((id) => m.connect(id, `10.0.0.${id.slice(1)}`));
      const codes: string[] = [];
      let version = 0;
      const approvedViewers = new Set<string>();
      const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

      for (let step = 0; step < 4000; step += 1) {
        const id = pick(ids);
        now += Math.floor(r() * 300);
        let msg: ClientMessage;
        switch (Math.floor(r() * 12)) {
          case 0: msg = { type: 'CREATE_SESSION', protocol: 1 }; break;
          case 1: msg = { type: 'JOIN_REQUEST', code: pick(codes.length ? codes : ['AAAA-AAAA']), name: 'n' }; break;
          case 2: { // approve from whichever connection actually holds a pending request (80%), else a random one
            let from = id; let requestId = 'zzzzzzzzzz';
            for (const [cid, msgs] of sink.out) {
              const st = [...msgs].reverse().find((x) => x.type === 'HOST_STATE');
              if (st?.type === 'HOST_STATE' && st.state.pending[0] && r() < 0.8) { from = cid; requestId = st.state.pending[0].requestId; break; }
            }
            msg = { type: 'APPROVE', requestId };
            expect(() => m.handle(from, msg)).not.toThrow();
            continue;
          }
          case 3: { // content update, usually from a real host
            const hosts = [...sink.out].filter(([, msgs]) => msgs.some((x) => x.type === 'SESSION_CREATED')).map(([cid]) => cid);
            const from = hosts.length && r() < 0.85 ? pick(hosts) : id;
            version += 1;
            msg = { type: 'CONTENT_UPDATE', toolId: 'tool-json-formatter', version, full: true, fields: { input: `v${step}` } };
            expect(() => m.handle(from, msg)).not.toThrow();
            continue;
          }
          case 4: msg = { type: r() < 0.5 ? 'PAUSE' : 'RESUME' }; break;
          case 5: msg = { type: 'SYNC_REQUEST' }; break;
          // Destructive commands are rare so sessions live long enough to relay content.
          case 6: msg = r() < 0.1 ? { type: 'LEAVE' } : { type: 'PING', t: 1 }; break;
          case 7: msg = r() < 0.05 ? { type: 'END' } : { type: 'PING', t: 1 }; break;
          case 8: msg = { type: 'REFRESH_CODE' }; break;
          case 9: msg = { type: 'KICK', viewerId: 'aaaaaaaaaaaa' }; break;
          case 10: m.disconnect(id); m.connect(id, `10.0.0.${id.slice(1)}`); continue;
          default: m.tick(); continue;
        }
        expect(() => m.handle(id, msg)).not.toThrow();
        for (const [cid, msgs] of sink.out) for (const o of msgs) {
          if (o.type === 'SESSION_CREATED' && o.state.code) codes.push(o.state.code);
          if (o.type === 'JOIN_APPROVED' || o.type === 'RECONNECTED') approvedViewers.add(cid);
        }
      }
      // Anyone who received content must have been approved at some point (hosts receive none).
      for (const [cid, msgs] of sink.out) {
        if (msgs.some((x) => x.type === 'CONTENT_UPDATE' || x.type === 'SNAPSHOT')) expect(approvedViewers.has(cid), `seed ${seed} ${cid}`).toBe(true);
      }
      for (const msgs of sink.out.values()) for (const x of msgs) { if (x.type === 'JOIN_APPROVED') approvals += 1; if (x.type === 'CONTENT_UPDATE') relays += 1; }
      m.shutdown();
      expect(m.stats.sessions).toBe(0);
    }
    // The fuzzer must actually reach the interesting states, or the invariants above prove nothing.
    expect(approvals).toBeGreaterThan(5);
    expect(relays).toBeGreaterThan(5);
  });
});

describe('resource cleanup (memory)', () => {
  it('leaves no sessions, codes or connections behind after many sessions come and go', () => {
    let now = 1_000_000;
    const sink = new Sink();
    const config = loadConfig({}, { createsPerHour: 1e6, joinAttemptsPerMinute: 1e6, messagesPerSecond: 1e6, messageBurst: 1e6 });
    const m = new SessionManager(config, sink, () => now);
    for (let i = 0; i < 300; i += 1) {
      const host = `h${i}`; const viewer = `v${i}`;
      m.connect(host, `1.1.${i % 250}.1`);
      m.handle(host, { type: 'CREATE_SESSION', protocol: 1 });
      const created = sink.out.get(host)!.find((x) => x.type === 'SESSION_CREATED');
      if (created?.type !== 'SESSION_CREATED') throw new Error('no session');
      m.connect(viewer, `2.2.${i % 250}.1`);
      m.handle(viewer, { type: 'JOIN_REQUEST', code: created.state.code!, name: 'v' });
      const pending = [...sink.out.get(host)!].reverse().find((x) => x.type === 'HOST_STATE');
      if (pending?.type === 'HOST_STATE' && pending.state.pending[0]) m.handle(host, { type: 'APPROVE', requestId: pending.state.pending[0].requestId });
      m.handle(host, { type: 'CONTENT_UPDATE', toolId: 'tool-json-formatter', version: 1, full: true, fields: { input: 'x'.repeat(1000) } });
      // Half end cleanly, a quarter vanish, a quarter just time out.
      if (i % 4 < 2) m.handle(host, { type: 'END' });
      else if (i % 4 === 2) { m.disconnect(host); m.disconnect(viewer); }
      sink.out.delete(host); sink.out.delete(viewer);
    }
    now += config.sessionTtlMs + config.hostGraceMs + 10_000;
    m.tick();
    // Disconnect any sockets still registered (server does this on close), then verify nothing is retained.
    for (let i = 0; i < 300; i += 1) { m.disconnect(`h${i}`); m.disconnect(`v${i}`); }
    expect(m.stats.sessions).toBe(0);
    expect(m.stats.connections).toBe(0);
    const internals = m as unknown as { codeIndex: Map<string, string>; sessions: Map<string, unknown>; conns: Map<string, unknown> };
    expect(internals.codeIndex.size).toBe(0);
    expect(internals.sessions.size).toBe(0);
    expect(internals.conns.size).toBe(0);
  });
});

describe('throughput', () => {
  it('relays 100 sessions × 5 viewers × 50 updates well under a second of CPU', () => {
    const sink = new Sink();
    const config = loadConfig({}, { createsPerHour: 1e6, joinAttemptsPerMinute: 1e6, messagesPerSecond: 1e6, messageBurst: 1e6, maxSessions: 1000 });
    const m = new SessionManager(config, sink, () => 1_000_000);
    const hosts: string[] = [];
    for (let s = 0; s < 100; s += 1) {
      const host = `h${s}`; hosts.push(host);
      m.connect(host, `3.3.${s}.1`);
      m.handle(host, { type: 'CREATE_SESSION', protocol: 1 });
      const code = (sink.out.get(host)![0] as Extract<ServerMessage, { type: 'SESSION_CREATED' }>).state.code!;
      for (let v = 0; v < 5; v += 1) {
        const id = `v${s}-${v}`;
        m.connect(id, `4.4.${s}.${v}`);
        m.handle(id, { type: 'JOIN_REQUEST', code, name: 'v' });
        const st = [...sink.out.get(host)!].reverse().find((x) => x.type === 'HOST_STATE');
        // Default config admits on a valid code; approve only if a request is actually pending.
        if (st?.type === 'HOST_STATE' && st.state.pending[0]) m.handle(host, { type: 'APPROVE', requestId: st.state.pending[0].requestId });
      }
    }
    const t0 = performance.now();
    for (let u = 1; u <= 50; u += 1) for (const host of hosts) m.handle(host, { type: 'CONTENT_UPDATE', toolId: 'tool-json-formatter', version: u, full: u === 1, fields: { input: `line ${u}`.repeat(20) } });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1000); // 25,000 relayed messages
  });
});
