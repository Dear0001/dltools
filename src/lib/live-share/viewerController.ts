/** Viewer-side controller. Read-only by construction: it can only join, sync and leave. */
import { Connection, type ConnectionStatus } from './connection';
import type { ErrorCode, LeaveReason, ServerMessage, Snapshot } from './protocol';
import { Store } from './store';

export type ViewerPhase = 'idle' | 'connecting' | 'pending' | 'joined' | 'rejected' | 'ended' | 'error';

export interface ViewerViewState {
  phase: ViewerPhase;
  connection: ConnectionStatus;
  latencyMs: number | null;
  toolId: string | null;
  /** The host is on a tool that cannot be shared (as opposed to having no tool open). */
  hostToolUnsupported: boolean;
  fields: Record<string, string>;
  paused: boolean;
  hostConnected: boolean;
  sessionExpiresAt: number | null;
  endedReason: LeaveReason | null;
  rejectedReason: 'rejected' | 'timeout' | null;
  error: { code: ErrorCode | 'UNAVAILABLE'; message: string } | null;
  /** Timestamp of the last content change, for the "live" indicator. */
  lastUpdateAt: number | null;
  syncing: boolean;
  /** The service hasn't answered within a few seconds (down or misconfigured). */
  unreachable: boolean;
}

const INITIAL: ViewerViewState = {
  phase: 'idle', connection: 'idle', latencyMs: null, toolId: null, hostToolUnsupported: false, fields: {}, paused: false, hostConnected: true,
  sessionExpiresAt: null, endedReason: null, rejectedReason: null, error: null, lastUpdateAt: null, syncing: false, unreachable: false,
};

export class ViewerController {
  readonly store = new Store<ViewerViewState>(INITIAL);
  private conn: Connection | null = null;
  private creds: { sessionId: string; viewerToken: string } | null = null;
  private seq = 0;
  private join: { code: string; name: string } | null = null;
  private reachTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private o: { url: string; WebSocketImpl?: typeof WebSocket }) {}
  get state() { return this.store.get(); }

  start(code: string, name: string): void {
    this.dispose();
    this.join = { code, name };
    this.seq = 0;
    this.creds = null;
    this.store.set({ ...INITIAL, phase: 'connecting' });
    this.conn = new Connection({
      url: this.o.url,
      WebSocketImpl: this.o.WebSocketImpl,
      onStatus: (connection) => this.store.set({ connection }),
      onLatency: (latencyMs) => this.store.set({ latencyMs }),
      onOpen: () => {
        if (this.creds) this.conn?.send({ type: 'RECONNECT_VIEWER', ...this.creds });
        else if (this.join) this.conn?.send({ type: 'JOIN_REQUEST', ...this.join });
      },
      onMessage: (m) => this.onMessage(m),
    });
    this.conn.connect();
    clearTimeout(this.reachTimer);
    this.reachTimer = setTimeout(() => {
      if (this.state.phase === 'connecting') this.store.set({ unreachable: true });
    }, 6000);
  }

  private apply(snapshot: Snapshot) {
    this.seq = snapshot.seq;
    this.store.set({ toolId: snapshot.toolId, hostToolUnsupported: snapshot.unsupported === true, fields: snapshot.fields, lastUpdateAt: Date.now(), syncing: false });
  }

  private onMessage(m: ServerMessage): void {
    switch (m.type) {
      case 'JOIN_PENDING':
        clearTimeout(this.reachTimer);
        this.store.set({ phase: 'pending', unreachable: false });
        break;
      case 'JOIN_APPROVED':
        this.creds = { sessionId: m.sessionId, viewerToken: m.viewerToken };
        this.join = null;
        this.store.set({ phase: 'joined', paused: m.paused, sessionExpiresAt: m.sessionExpiresAt, hostConnected: true, error: null });
        this.apply(m.snapshot);
        break;
      case 'RECONNECTED':
        this.store.set({ phase: 'joined', paused: m.paused, hostConnected: m.hostConnected, sessionExpiresAt: m.sessionExpiresAt, error: null });
        this.apply(m.snapshot);
        break;
      case 'SNAPSHOT':
        this.store.set({ paused: m.paused });
        this.apply(m.snapshot);
        break;
      case 'CONTENT_UPDATE':
        if (m.seq <= this.seq) break; // duplicate or stale
        if (m.seq > this.seq + 1) { // gap: ask for the full state instead of guessing
          this.store.set({ syncing: true });
          this.conn?.send({ type: 'SYNC_REQUEST' });
          break;
        }
        this.seq = m.seq;
        this.store.set({
          toolId: m.toolId,
          hostToolUnsupported: false,
          fields: m.full ? { ...m.fields } : { ...this.state.fields, ...m.fields },
          lastUpdateAt: Date.now(),
        });
        break;
      case 'SHARING':
        this.store.set({ paused: m.paused });
        break;
      case 'HOST_STATUS':
        this.store.set({ hostConnected: m.connected });
        break;
      case 'JOIN_REJECTED':
        this.teardown();
        this.store.set({ phase: 'rejected', rejectedReason: m.reason });
        break;
      case 'SESSION_ENDED':
        this.teardown();
        this.store.set({ phase: 'ended', endedReason: m.reason, fields: {}, toolId: null });
        break;
      case 'ERROR':
        if (m.fatal || m.code === 'UNAUTHORIZED') {
          this.teardown();
          this.store.set({ phase: this.creds || m.code === 'UNAUTHORIZED' ? 'ended' : 'error', endedReason: m.code === 'UNAUTHORIZED' ? 'host_disconnected' : null, error: { code: m.code, message: m.message } });
        } else this.store.set({ error: { code: m.code, message: m.message } });
        break;
      default: break;
    }
  }

  leave(): void {
    this.conn?.send({ type: 'LEAVE' });
    this.dispose();
    this.store.set({ ...INITIAL });
  }

  private teardown() {
    clearTimeout(this.reachTimer);
    this.conn?.close();
    this.conn = null;
    this.creds = null;
  }

  dispose(): void { this.teardown(); }
}
