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
  /** The app route the host is on; the viewer's app navigates there with its own router. */
  route: string | null;
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
  /** Re-attaching to a session after a page refresh (no UI beyond a quiet status). */
  resuming: boolean;
}

const INITIAL: ViewerViewState = {
  phase: 'idle', connection: 'idle', latencyMs: null, toolId: null, route: null, hostToolUnsupported: false, fields: {}, paused: false, hostConnected: true,
  sessionExpiresAt: null, endedReason: null, rejectedReason: null, error: null, lastUpdateAt: null, syncing: false, unreachable: false, resuming: false,
};

/** Survives a reload of this tab only (never shared with other tabs or persisted to disk by us). */
export interface CredentialStore {
  load(): { sessionId: string; viewerToken: string } | null;
  save(creds: { sessionId: string; viewerToken: string }): void;
  clear(): void;
}

/** sessionStorage entry name (not a secret; the credentials live in the value). */
const CREDENTIALS_STORAGE_NAME = 'dltools-live-share-viewer';
const CRED_RE = /^[A-Za-z0-9_-]{8,128}$/;

/** `sessionStorage`-backed credentials, so refreshing a viewer tab rejoins the same session. */
export function browserCredentialStore(): CredentialStore {
  return {
    load() {
      try {
        const raw = window.sessionStorage.getItem(CREDENTIALS_STORAGE_NAME);
        if (!raw) return null;
        const v = JSON.parse(raw) as { sessionId?: unknown; viewerToken?: unknown };
        return typeof v.sessionId === 'string' && typeof v.viewerToken === 'string' && CRED_RE.test(v.sessionId) && CRED_RE.test(v.viewerToken)
          ? { sessionId: v.sessionId, viewerToken: v.viewerToken } : null;
      } catch { return null; }
    },
    save(creds) { try { window.sessionStorage.setItem(CREDENTIALS_STORAGE_NAME, JSON.stringify(creds)); } catch { /* refresh just won't resume */ } },
    clear() { try { window.sessionStorage.removeItem(CREDENTIALS_STORAGE_NAME); } catch { /* non-critical */ } },
  };
}

export class ViewerController {
  readonly store = new Store<ViewerViewState>(INITIAL);
  private conn: Connection | null = null;
  private creds: { sessionId: string; viewerToken: string } | null = null;
  private seq = 0;
  private join: { code: string; name: string } | null = null;
  private reachTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private o: { url: string; WebSocketImpl?: typeof WebSocket; credentials?: CredentialStore }) {}
  get state() { return this.store.get(); }

  start(code: string, name: string): void {
    this.dispose();
    this.o.credentials?.clear();
    this.join = { code, name };
    this.seq = 0;
    this.creds = null;
    this.store.set({ ...INITIAL, phase: 'connecting' });
    this.open();
  }

  /**
   * Rejoins the session this tab was viewing before a reload, if any. Returns false when there is nothing to
   * resume. A session that has since ended is dropped silently: the tab simply browses on its own again.
   */
  resume(): boolean {
    if (this.state.phase !== 'idle') return false;
    const saved = this.o.credentials?.load();
    if (!saved) return false;
    this.dispose();
    this.join = null;
    this.seq = 0;
    this.creds = saved;
    this.store.set({ ...INITIAL, phase: 'connecting', resuming: true });
    this.open();
    return true;
  }

  private open(): void {
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
    this.store.set({ toolId: snapshot.toolId, route: snapshot.route ?? null, hostToolUnsupported: snapshot.unsupported === true, fields: snapshot.fields, lastUpdateAt: Date.now(), syncing: false });
  }

  private onMessage(m: ServerMessage): void {
    switch (m.type) {
      case 'JOIN_PENDING':
        clearTimeout(this.reachTimer);
        this.store.set({ phase: 'pending', unreachable: false });
        break;
      case 'JOIN_APPROVED':
        this.creds = { sessionId: m.sessionId, viewerToken: m.viewerToken };
        this.o.credentials?.save(this.creds);
        this.join = null;
        this.store.set({ phase: 'joined', paused: m.paused, sessionExpiresAt: m.sessionExpiresAt, hostConnected: true, error: null });
        this.apply(m.snapshot);
        break;
      case 'RECONNECTED':
        this.store.set({ resuming: false, phase: 'joined', paused: m.paused, hostConnected: m.hostConnected, sessionExpiresAt: m.sessionExpiresAt, error: null });
        this.apply(m.snapshot);
        break;
      case 'SNAPSHOT':
        this.store.set({ paused: m.paused });
        this.apply(m.snapshot);
        break;
      case 'ROUTE':
      case 'CONTENT_UPDATE':
        if (m.seq <= this.seq) break; // duplicate or stale (e.g. an event from before a reconnect)
        if (m.seq > this.seq + 1) { // gap: ask for the full state instead of guessing
          this.store.set({ syncing: true });
          this.conn?.send({ type: 'SYNC_REQUEST' });
          break;
        }
        this.seq = m.seq;
        if (m.type === 'ROUTE') { this.store.set({ route: m.route }); break; }
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
        this.forget();
        this.store.set({ phase: 'rejected', rejectedReason: m.reason });
        break;
      case 'SESSION_ENDED':
        this.forget();
        this.store.set({ phase: 'ended', endedReason: m.reason, fields: {}, toolId: null, route: null });
        break;
      case 'ERROR':
        if (m.fatal || m.code === 'UNAUTHORIZED') {
          const wasResuming = this.state.resuming;
          const hadCreds = this.creds !== null;
          this.forget();
          // A reload after the session ended: just browse normally again, no "session ended" screen.
          if (wasResuming) { this.store.set({ ...INITIAL }); break; }
          this.store.set({ phase: hadCreds || m.code === 'UNAUTHORIZED' ? 'ended' : 'error', endedReason: m.code === 'UNAUTHORIZED' ? 'host_disconnected' : null, error: { code: m.code, message: m.message } });
        } else this.store.set({ error: { code: m.code, message: m.message } });
        break;
      default: break;
    }
  }

  leave(): void {
    this.conn?.send({ type: 'LEAVE' });
    this.forget();
    this.store.set({ ...INITIAL });
  }

  private teardown() {
    clearTimeout(this.reachTimer);
    this.conn?.close();
    this.conn = null;
    this.creds = null;
  }

  /** Ends this tab's membership for good: the next reload starts fresh. */
  private forget() {
    this.teardown();
    this.o.credentials?.clear();
  }

  dispose(): void { this.teardown(); }
}
