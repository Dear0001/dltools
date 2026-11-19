/**
 * Live Share session manager: pure state machine, no sockets. The WebSocket server feeds it
 * validated messages and it answers through an injected Transport. Session state lives only
 * in memory and is dropped when the session ends — shared content is never persisted.
 *
 * Single-instance by design (see docs/live-share.md for scaling notes).
 */
import { detectSecret } from './secrets';
import { generateId, generatePairingCode, generateToken, hashToken, tokenMatches } from './codes';
import type { LiveShareConfig } from './config';
import { FailureLockout, SlidingWindowLimiter, TokenBucket } from './rateLimiter';
import {
  formatCode,
  normalizeCode,
  type ClientMessage,
  type ErrorCode,
  type HostState,
  type LeaveReason,
  type ServerMessage,
  type Snapshot,
} from './protocol';
import { getLiveShareTool, isFreeText } from './registry';

export interface Transport {
  send(connId: string, message: ServerMessage): void;
  close(connId: string, code: number, reason: string): void;
  /** Bytes queued but not yet flushed to the socket. */
  backlog(connId: string): number;
}

interface Conn {
  id: string;
  ip: string;
  role: 'none' | 'host' | 'viewer' | 'pending';
  sessionId?: string;
  participantId?: string;
  bucket: TokenBucket;
  badJoins: number;
  violations: number;
}

interface Viewer {
  id: string;
  name: string;
  tokenHash: string;
  conn: string | null;
  joinedAt: number;
  disconnectedAt: number | null;
  /** Skipped updates because the socket was backed up; a fresh snapshot is owed. */
  stale: boolean;
  lastSeq: number;
}

interface Pending {
  id: string;
  name: string;
  conn: string;
  requestedAt: number;
  expiresAt: number;
}

interface Session {
  id: string;
  hostTokenHash: string;
  hostConn: string | null;
  hostDisconnectedAt: number | null;
  code: string | null;
  codeExpiresAt: number | null;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  paused: boolean;
  allowFiles: boolean;
  viewers: Map<string, Viewer>;
  pending: Map<string, Pending>;
  toolId: string | null;
  unsupported: boolean;
  fields: Record<string, string>;
  hostVersion: number;
  seq: number;
}

export interface ManagerStats {
  sessions: number;
  connections: number;
  droppedStale: number;
}

const CLOSE_POLICY = 1008;
const CLOSE_NORMAL = 1000;

export class SessionManager {
  private sessions = new Map<string, Session>();
  private codeIndex = new Map<string, string>();
  private conns = new Map<string, Conn>();
  private joinLimiter: SlidingWindowLimiter;
  private createLimiter: SlidingWindowLimiter;
  private lockout: FailureLockout;
  private droppedStale = 0;

  constructor(
    private config: LiveShareConfig,
    private transport: Transport,
    private now: () => number = Date.now,
  ) {
    this.joinLimiter = new SlidingWindowLimiter(config.joinAttemptsPerMinute, 60_000);
    this.createLimiter = new SlidingWindowLimiter(config.createsPerHour, 60 * 60_000);
    this.lockout = new FailureLockout(config.failedJoinLockThreshold, config.failedJoinWindowMs, config.failedJoinLockMs);
  }

  get stats(): ManagerStats {
    return { sessions: this.sessions.size, connections: this.conns.size, droppedStale: this.droppedStale };
  }

  // ---------- connection lifecycle ----------

  connect(connId: string, ip: string): void {
    this.conns.set(connId, {
      id: connId,
      ip,
      role: 'none',
      bucket: new TokenBucket(this.config.messagesPerSecond, this.config.messageBurst, this.now()),
      badJoins: 0,
      violations: 0,
    });
  }

  disconnect(connId: string): void {
    const conn = this.conns.get(connId);
    if (!conn) return;
    this.conns.delete(connId);
    const session = conn.sessionId ? this.sessions.get(conn.sessionId) : undefined;
    if (!session) return;
    const t = this.now();
    if (conn.role === 'host' && session.hostConn === connId) {
      session.hostConn = null;
      session.hostDisconnectedAt = t;
      this.broadcast(session, { type: 'HOST_STATUS', connected: false });
    } else if (conn.role === 'viewer') {
      const viewer = session.viewers.get(conn.participantId ?? '');
      if (viewer && viewer.conn === connId) {
        viewer.conn = null;
        viewer.disconnectedAt = t;
        this.pushHostState(session);
      }
    } else if (conn.role === 'pending') {
      session.pending.delete(conn.participantId ?? '');
      this.pushHostState(session);
    }
  }

  // ---------- message dispatch ----------

  handle(connId: string, msg: ClientMessage): void {
    const conn = this.conns.get(connId);
    if (!conn) return;
    const t = this.now();
    if (!conn.bucket.take(t)) {
      conn.violations += 1;
      this.error(connId, 'RATE_LIMITED', 'Too many messages. Slow down.');
      if (conn.violations >= 20) this.transport.close(connId, CLOSE_POLICY, 'rate limited');
      return;
    }

    if (msg.type === 'PING') return this.transport.send(connId, { type: 'PONG', t: msg.t });

    switch (msg.type) {
      case 'CREATE_SESSION': return this.createSession(conn);
      case 'RECONNECT_HOST': return this.reconnectHost(conn, msg.sessionId, msg.hostToken);
      case 'JOIN_REQUEST': return this.joinRequest(conn, msg.code, msg.name);
      case 'RECONNECT_VIEWER': return this.reconnectViewer(conn, msg.sessionId, msg.viewerToken);
      case 'LEAVE': return this.leave(conn);
      case 'SYNC_REQUEST': return this.syncRequest(conn);
      default: break;
    }

    // Everything below is a host-only command. Authorization comes from the connection's
    // server-side role — never from anything the client claims in the message.
    const session = this.hostSession(conn);
    if (!session) return this.error(connId, 'FORBIDDEN', 'Only the host can do that.');
    switch (msg.type) {
      case 'APPROVE': return this.approve(session, msg.requestId);
      case 'REJECT': return this.reject(session, msg.requestId);
      case 'KICK': return this.kick(session, msg.viewerId);
      case 'PAUSE': return this.setPaused(session, true);
      case 'RESUME': return this.setPaused(session, false);
      case 'EXTEND': return this.extend(session);
      case 'REFRESH_CODE': return this.refreshCode(session);
      case 'END': return this.endSession(session, 'host_ended');
      case 'CLEAR_TOOL': return this.clearTool(session, msg.unsupported === true);
      case 'SET_ALLOW_FILES': return this.setAllowFiles(session, msg.allow);
      case 'CONTENT_UPDATE': return this.contentUpdate(session, conn, msg);
      default: return this.error(connId, 'INVALID_MESSAGE', 'Unexpected message.');
    }
  }

  // ---------- host ----------

  private createSession(conn: Conn): void {
    if (conn.role !== 'none') return this.error(conn.id, 'FORBIDDEN', 'This connection is already in a session.');
    const t = this.now();
    if (!this.createLimiter.take(conn.ip, t)) return this.error(conn.id, 'RATE_LIMITED', 'Too many sessions created. Try again later.', true);
    if (this.sessions.size >= this.config.maxSessions) return this.error(conn.id, 'SERVER_BUSY', 'Live Share is busy. Try again soon.', true);

    const hostToken = generateToken();
    const session: Session = {
      id: generateId(),
      hostTokenHash: hashToken(hostToken),
      hostConn: conn.id,
      hostDisconnectedAt: null,
      code: null,
      codeExpiresAt: null,
      createdAt: t,
      expiresAt: t + this.config.sessionTtlMs,
      lastActivity: t,
      paused: false,
      allowFiles: false,
      viewers: new Map(),
      pending: new Map(),
      toolId: null,
      unsupported: false,
      fields: {},
      hostVersion: 0,
      seq: 0,
    };
    this.sessions.set(session.id, session);
    this.issueCode(session);
    conn.role = 'host';
    conn.sessionId = session.id;
    this.transport.send(conn.id, { type: 'SESSION_CREATED', hostToken, state: this.hostState(session) });
  }

  private reconnectHost(conn: Conn, sessionId: string, token: string): void {
    if (conn.role !== 'none') return this.error(conn.id, 'FORBIDDEN', 'This connection is already in a session.');
    const t = this.now();
    if (this.lockout.isLocked(conn.ip, t)) return this.error(conn.id, 'RATE_LIMITED', 'Too many failed attempts. Try again later.', true);
    const session = this.sessions.get(sessionId);
    // Same answer for "no such session" and "wrong token" so ids cannot be probed.
    if (!session || !tokenMatches(token, session.hostTokenHash)) {
      this.lockout.recordFailure(conn.ip, t);
      return this.error(conn.id, 'UNAUTHORIZED', 'Could not resume that session.', true);
    }
    if (session.hostConn) {
      const old = session.hostConn;
      session.hostConn = null;
      this.conns.delete(old);
      this.transport.close(old, CLOSE_NORMAL, 'replaced');
    }
    session.hostConn = conn.id;
    session.hostDisconnectedAt = null;
    conn.role = 'host';
    conn.sessionId = session.id;
    this.transport.send(conn.id, { type: 'SESSION_CREATED', hostToken: token, state: this.hostState(session) });
    this.broadcast(session, { type: 'HOST_STATUS', connected: true });
  }

  private hostSession(conn: Conn): Session | null {
    if (conn.role !== 'host' || !conn.sessionId) return null;
    const session = this.sessions.get(conn.sessionId);
    return session && session.hostConn === conn.id ? session : null;
  }

  private approve(session: Session, requestId: string): void {
    const pending = session.pending.get(requestId);
    if (!pending) return this.error(session.hostConn!, 'SESSION_NOT_FOUND', 'That request is no longer pending.');
    session.pending.delete(requestId);
    const viewerConn = this.conns.get(pending.conn);
    if (!viewerConn) return this.pushHostState(session);
    if (session.viewers.size >= this.config.maxViewers) {
      this.transport.send(viewerConn.id, { type: 'ERROR', code: 'SESSION_FULL', message: 'This session is full.', fatal: true });
      viewerConn.role = 'none';
      this.pushHostState(session);
      return;
    }
    const viewerToken = generateToken();
    const viewer: Viewer = {
      id: generateId(),
      name: pending.name,
      tokenHash: hashToken(viewerToken),
      conn: viewerConn.id,
      joinedAt: this.now(),
      disconnectedAt: null,
      stale: false,
      lastSeq: session.seq,
    };
    session.viewers.set(viewer.id, viewer);
    viewerConn.role = 'viewer';
    viewerConn.participantId = viewer.id;
    this.transport.send(viewerConn.id, {
      type: 'JOIN_APPROVED',
      sessionId: session.id,
      viewerId: viewer.id,
      viewerToken,
      paused: session.paused,
      sessionExpiresAt: session.expiresAt,
      snapshot: this.snapshotFor(session),
    });
    session.lastActivity = this.now();
    this.pushHostState(session);
  }

  private reject(session: Session, requestId: string): void {
    const pending = session.pending.get(requestId);
    if (!pending) return;
    session.pending.delete(requestId);
    const viewerConn = this.conns.get(pending.conn);
    if (viewerConn) {
      viewerConn.role = 'none';
      viewerConn.sessionId = undefined;
      this.transport.send(viewerConn.id, { type: 'JOIN_REJECTED', reason: 'rejected' });
      this.transport.close(viewerConn.id, CLOSE_NORMAL, 'rejected');
    }
    this.pushHostState(session);
  }

  private kick(session: Session, viewerId: string): void {
    const viewer = session.viewers.get(viewerId);
    if (!viewer) return;
    session.viewers.delete(viewerId);
    if (viewer.conn) {
      this.transport.send(viewer.conn, { type: 'SESSION_ENDED', reason: 'kicked' });
      this.transport.close(viewer.conn, CLOSE_NORMAL, 'kicked');
      this.conns.delete(viewer.conn);
    }
    this.pushHostState(session);
  }

  private setPaused(session: Session, paused: boolean): void {
    if (session.paused === paused) return;
    session.paused = paused;
    session.lastActivity = this.now();
    this.broadcast(session, { type: 'SHARING', paused });
    this.pushHostState(session);
  }

  private extend(session: Session): void {
    const t = this.now();
    const cap = session.createdAt + this.config.maxSessionLifetimeMs;
    session.expiresAt = Math.min(cap, Math.max(session.expiresAt, t) + this.config.sessionExtendMs);
    session.lastActivity = t;
    this.pushHostState(session);
  }

  private refreshCode(session: Session): void {
    this.issueCode(session);
    session.lastActivity = this.now();
    this.pushHostState(session);
  }

  private issueCode(session: Session): void {
    if (session.code) this.codeIndex.delete(session.code);
    let code = generatePairingCode();
    while (this.codeIndex.has(code)) code = generatePairingCode();
    session.code = code;
    session.codeExpiresAt = this.now() + this.config.pairingTtlMs;
    this.codeIndex.set(code, session.id);
  }

  private contentUpdate(session: Session, conn: Conn, msg: Extract<ClientMessage, { type: 'CONTENT_UPDATE' }>): void {
    if (session.paused) return; // nothing is stored or relayed while paused
    if (msg.version <= session.hostVersion) {
      this.droppedStale += 1; // stale, reordered or duplicated update
      return;
    }
    const toolChanged = msg.toolId !== session.toolId;
    if (toolChanged && !msg.full) {
      return this.error(conn.id, 'NEED_FULL_UPDATE', 'Send a full update after switching tools.');
    }
    const spec = getLiveShareTool(msg.toolId);
    if (!spec) return this.error(conn.id, 'UNSUPPORTED_TOOL', 'This tool does not support Live Share.');
    // File/binary content is only relayed after the host opted in; otherwise it is blanked here as well
    // as on the client, so a modified client cannot smuggle it through.
    const fieldsIn: Record<string, string> = { ...msg.fields };
    if (!session.allowFiles) for (const key of Object.keys(fieldsIn)) if (spec.fields[key].optIn === 'files') fieldsIn[key] = '';
    msg = { ...msg, fields: fieldsIn };
    for (const [key, value] of Object.entries(msg.fields)) {
      if (isFreeText(spec.fields[key].kind) && detectSecret(value)) {
        return this.error(conn.id, 'SENSITIVE_CONTENT', `The "${key}" field looks like a credential and was not shared.`);
      }
    }
    const merged = msg.full ? { ...msg.fields } : { ...session.fields, ...msg.fields };
    const size = Object.values(merged).reduce((n, v) => n + v.length, 0);
    if (size > this.config.maxSnapshotChars) return this.error(conn.id, 'MESSAGE_TOO_LARGE', 'Shared content is too large.');

    session.hostVersion = msg.version;
    session.toolId = msg.toolId;
    session.unsupported = false;
    session.fields = merged;
    session.lastActivity = this.now();
    session.seq += 1;
    const relay: ServerMessage = { type: 'CONTENT_UPDATE', seq: session.seq, toolId: msg.toolId, full: msg.full || toolChanged, fields: msg.fields };
    for (const viewer of session.viewers.values()) {
      if (!viewer.conn) continue;
      if (viewer.stale || this.transport.backlog(viewer.conn) > this.config.backpressureBytes) {
        viewer.stale = true; // coalesce: skip patches, send one fresh snapshot once it drains
        continue;
      }
      viewer.lastSeq = session.seq;
      this.transport.send(viewer.conn, relay);
    }
  }

  private setAllowFiles(session: Session, allow: boolean): void {
    if (session.allowFiles === allow) return;
    session.allowFiles = allow;
    session.lastActivity = this.now();
    if (!allow && session.toolId) {
      // Revoking: wipe any file content already relayed and tell viewers immediately.
      const spec = getLiveShareTool(session.toolId);
      let changed = false;
      for (const [key, field] of Object.entries(spec?.fields ?? {})) {
        if (field.optIn === 'files' && session.fields[key]) { session.fields[key] = ''; changed = true; }
      }
      if (changed) {
        session.seq += 1;
        for (const viewer of session.viewers.values()) this.sendSnapshot(session, viewer);
      }
    }
    this.pushHostState(session);
  }

  /** Host switched to a tool that cannot be shared: viewers must not keep showing the previous tool. */
  private clearTool(session: Session, unsupported: boolean): void {
    if (session.paused) return;
    session.toolId = null;
    session.unsupported = unsupported;
    session.fields = {};
    session.lastActivity = this.now();
    session.seq += 1;
    for (const viewer of session.viewers.values()) this.sendSnapshot(session, viewer);
    this.pushHostState(session);
  }

  // ---------- viewer ----------

  private joinRequest(conn: Conn, rawCode: string, name: string): void {
    if (conn.role !== 'none') return this.error(conn.id, 'FORBIDDEN', 'This connection is already in a session.');
    const t = this.now();
    if (this.lockout.isLocked(conn.ip, t)) return this.error(conn.id, 'RATE_LIMITED', 'Too many failed attempts. Try again later.', true);
    if (!this.joinLimiter.take(conn.ip, t)) return this.error(conn.id, 'RATE_LIMITED', 'Too many attempts. Wait a minute and try again.', true);

    const code = normalizeCode(rawCode);
    const session = this.sessions.get(this.codeIndex.get(code) ?? '');
    const fail = (errCode: ErrorCode, message: string) => {
      this.lockout.recordFailure(conn.ip, t);
      conn.badJoins += 1;
      this.error(conn.id, errCode, message, conn.badJoins >= 3);
      if (conn.badJoins >= 3) this.transport.close(conn.id, CLOSE_POLICY, 'too many invalid codes');
    };
    if (!session) return fail('INVALID_CODE', 'That pairing code is not valid.');
    if (session.codeExpiresAt !== null && t >= session.codeExpiresAt) {
      this.expireCode(session);
      return fail('CODE_EXPIRED', 'That pairing code has expired. Ask the host for a new one.');
    }
    if (session.pending.size >= this.config.maxPendingRequests) return this.error(conn.id, 'RATE_LIMITED', 'Too many pending requests for this session.', true);
    if (session.viewers.size >= this.config.maxViewers) return this.error(conn.id, 'SESSION_FULL', 'This session is full.', true);

    this.lockout.reset(conn.ip);
    const pending: Pending = { id: generateId(), name, conn: conn.id, requestedAt: t, expiresAt: t + this.config.joinRequestTtlMs };
    session.pending.set(pending.id, pending);
    conn.role = 'pending';
    conn.sessionId = session.id;
    conn.participantId = pending.id;
    this.transport.send(conn.id, { type: 'JOIN_PENDING', requestId: pending.id, expiresAt: pending.expiresAt });
    this.pushHostState(session);
  }

  private reconnectViewer(conn: Conn, sessionId: string, token: string): void {
    if (conn.role !== 'none') return this.error(conn.id, 'FORBIDDEN', 'This connection is already in a session.');
    const t = this.now();
    if (this.lockout.isLocked(conn.ip, t)) return this.error(conn.id, 'RATE_LIMITED', 'Too many failed attempts. Try again later.', true);
    const session = this.sessions.get(sessionId);
    const viewer = session && [...session.viewers.values()].find((v) => tokenMatches(token, v.tokenHash));
    if (!session || !viewer) {
      this.lockout.recordFailure(conn.ip, t);
      return this.error(conn.id, 'UNAUTHORIZED', 'Could not resume that session.', true);
    }
    if (viewer.conn) {
      this.conns.delete(viewer.conn);
      this.transport.close(viewer.conn, CLOSE_NORMAL, 'replaced');
    }
    viewer.conn = conn.id;
    viewer.disconnectedAt = null;
    viewer.stale = false;
    viewer.lastSeq = session.seq;
    conn.role = 'viewer';
    conn.sessionId = session.id;
    conn.participantId = viewer.id;
    this.transport.send(conn.id, {
      type: 'RECONNECTED',
      paused: session.paused,
      hostConnected: session.hostConn !== null,
      sessionExpiresAt: session.expiresAt,
      snapshot: this.snapshotFor(session),
    });
    this.pushHostState(session);
  }

  private leave(conn: Conn): void {
    const session = conn.sessionId ? this.sessions.get(conn.sessionId) : undefined;
    if (!session) return;
    if (conn.role === 'host') return this.endSession(session, 'host_ended');
    if (conn.role === 'viewer') session.viewers.delete(conn.participantId ?? '');
    if (conn.role === 'pending') session.pending.delete(conn.participantId ?? '');
    conn.role = 'none';
    conn.sessionId = undefined;
    this.transport.close(conn.id, CLOSE_NORMAL, 'left');
    this.pushHostState(session);
  }

  private syncRequest(conn: Conn): void {
    const session = conn.sessionId ? this.sessions.get(conn.sessionId) : undefined;
    const viewer = session?.viewers.get(conn.participantId ?? '');
    if (!session || !viewer || conn.role !== 'viewer') return this.error(conn.id, 'FORBIDDEN', 'Not a viewer of a session.');
    this.sendSnapshot(session, viewer);
  }

  private sendSnapshot(session: Session, viewer: Viewer): void {
    if (!viewer.conn) return;
    viewer.stale = false;
    viewer.lastSeq = session.seq;
    this.transport.send(viewer.conn, { type: 'SNAPSHOT', paused: session.paused, snapshot: this.snapshotFor(session) });
  }

  // ---------- lifecycle ----------

  /** Call about once a second: expiry, idle timeout, grace periods and backpressure recovery. */
  tick(): void {
    const t = this.now();
    this.joinLimiter.sweep(t);
    this.createLimiter.sweep(t);
    this.lockout.sweep(t);
    for (const session of [...this.sessions.values()]) {
      if (t >= session.expiresAt) { this.endSession(session, 'expired'); continue; }
      if (t - session.lastActivity >= this.config.idleTimeoutMs) { this.endSession(session, 'idle'); continue; }
      if (session.hostDisconnectedAt !== null && t - session.hostDisconnectedAt >= this.config.hostGraceMs) {
        this.endSession(session, 'host_disconnected');
        continue;
      }
      let changed = false;
      if (session.code && session.codeExpiresAt !== null && t >= session.codeExpiresAt) {
        this.expireCode(session);
        changed = true;
      }
      for (const [id, p] of session.pending) {
        if (t >= p.expiresAt) {
          session.pending.delete(id);
          const c = this.conns.get(p.conn);
          if (c) {
            c.role = 'none';
            this.transport.send(c.id, { type: 'JOIN_REJECTED', reason: 'timeout' });
            this.transport.close(c.id, CLOSE_NORMAL, 'timeout');
          }
          changed = true;
        }
      }
      for (const [id, v] of session.viewers) {
        if (v.conn === null && v.disconnectedAt !== null && t - v.disconnectedAt >= this.config.viewerGraceMs) {
          session.viewers.delete(id);
          changed = true;
        } else if (v.stale && v.conn && this.transport.backlog(v.conn) <= this.config.backpressureBytes / 4) {
          this.sendSnapshot(session, v);
        }
      }
      if (changed) this.pushHostState(session);
    }
  }

  private expireCode(session: Session): void {
    if (session.code) this.codeIndex.delete(session.code);
    session.code = null;
    session.codeExpiresAt = null;
  }

  endSession(session: Session, reason: LeaveReason): void {
    if (!this.sessions.has(session.id)) return;
    this.sessions.delete(session.id);
    if (session.code) this.codeIndex.delete(session.code);
    const targets = [
      session.hostConn,
      ...[...session.viewers.values()].map((v) => v.conn),
      ...[...session.pending.values()].map((p) => p.conn),
    ];
    for (const id of targets) {
      if (!id) continue;
      this.transport.send(id, { type: 'SESSION_ENDED', reason });
      this.transport.close(id, CLOSE_NORMAL, reason);
      this.conns.delete(id);
    }
    session.fields = {}; // drop shared content immediately
    session.viewers.clear();
    session.pending.clear();
  }

  shutdown(): void {
    for (const session of [...this.sessions.values()]) this.endSession(session, 'server_shutdown');
  }

  // ---------- helpers ----------

  private snapshotFor(session: Session): Snapshot {
    return { toolId: session.toolId, seq: session.seq, fields: { ...session.fields }, unsupported: session.unsupported };
  }

  private hostState(session: Session): HostState {
    return {
      sessionId: session.id,
      code: session.code ? formatCode(session.code) : null,
      pairingExpiresAt: session.codeExpiresAt,
      sessionExpiresAt: session.expiresAt,
      maxViewers: this.config.maxViewers,
      paused: session.paused,
      allowFiles: session.allowFiles,
      toolId: session.toolId,
      viewers: [...session.viewers.values()].map((v) => ({ id: v.id, name: v.name, connected: v.conn !== null, joinedAt: v.joinedAt })),
      pending: [...session.pending.values()].map((p) => ({ requestId: p.id, name: p.name, requestedAt: p.requestedAt, expiresAt: p.expiresAt })),
    };
  }

  private pushHostState(session: Session): void {
    if (session.hostConn) this.transport.send(session.hostConn, { type: 'HOST_STATE', state: this.hostState(session) });
  }

  private broadcast(session: Session, message: ServerMessage): void {
    for (const viewer of session.viewers.values()) if (viewer.conn) this.transport.send(viewer.conn, message);
  }

  private error(connId: string, code: ErrorCode, message: string, fatal = false): void {
    this.transport.send(connId, { type: 'ERROR', code, message, fatal });
  }
}
