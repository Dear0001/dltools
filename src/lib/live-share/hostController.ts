/**
 * Host-side controller: owns the WebSocket, the session credentials and the outbound
 * update pipeline (allow-list → secret scan → debounce → diff → send). It is a plain
 * class so it can be tested against a real server; React wraps it with hooks.
 */
import { Connection, type ConnectionStatus } from './connection';
import { PROTOCOL_VERSION, type ErrorCode, type HostState, type LeaveReason, type ServerMessage } from './protocol';
import { getLiveShareTool, isFreeText, isLiveShareTool } from './registry';
import { detectSecret } from './secrets';
import { Store } from './store';

export type HostPhase = 'idle' | 'starting' | 'active' | 'ended' | 'error';

export interface HostViewState {
  phase: HostPhase;
  connection: ConnectionStatus;
  latencyMs: number | null;
  host: HostState | null;
  endedReason: LeaveReason | null;
  error: { code: ErrorCode | 'UNAVAILABLE'; message: string } | null;
  /** Fields blanked for viewers because they looked like credentials. */
  withheld: string[];
  /** Fields held back because they may hold file content and “share file content” is off. */
  fileGated: string[];
  /** The tool currently open on the host, and whether it can be shared. */
  activeToolId: string | null;
  activeToolSupported: boolean;
  /** True when the service hasn't answered within a few seconds of starting (it may be down or misconfigured). */
  unreachable: boolean;
}

const INITIAL: HostViewState = {
  phase: 'idle', connection: 'idle', latencyMs: null, host: null, endedReason: null, error: null,
  withheld: [], fileGated: [], activeToolId: null, activeToolSupported: true, unreachable: false,
};

export interface HostOptions {
  url: string;
  WebSocketImpl?: typeof WebSocket;
  debounceMs?: number;
  maxWaitMs?: number;
  /** How long to wait for the first connection before reporting `unreachable`. Default 4 s. */
  connectTimeoutMs?: number;
}

export class HostController {
  readonly store = new Store<HostViewState>(INITIAL);
  private conn: Connection | null = null;
  private creds: { sessionId: string; hostToken: string } | null = null;
  private version = 0;
  private latest: { toolId: string; fields: Record<string, string> } | null = null;
  private lastSent: { toolId: string; fields: Record<string, string> } | null = null;
  /** What viewers were last told when no shareable tool is open: nothing yet, "no tool", or "unsupported tool". */
  private cleared: 'none' | 'unsupported' | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private firstPendingAt = 0;
  private reachTimer: ReturnType<typeof setTimeout> | undefined;
  /** True once the user asked to start a session; a warmed-up socket stays silent until then. */
  private wantSession = false;
  /** The app route this tab is on (only shareable routes), and the one viewers were last told about. */
  private route: string | null = null;
  private routeSent: string | null = null;

  constructor(private o: HostOptions) {}

  get state() { return this.store.get(); }

  /**
   * Opens the socket ahead of time (e.g. when the Share dialog opens) so that "Start sharing"
   * only has to send CREATE_SESSION instead of also paying for DNS + TLS + the WebSocket handshake.
   * Creates nothing on the server: an idle socket holds no session and is released by `cool()`.
   */
  warmUp(): void {
    if (this.conn || this.state.phase === 'starting' || this.state.phase === 'active') return;
    this.ensureConnection();
  }

  /** Releases a warmed-up socket that was never used. Does nothing once a session is starting or active. */
  cool(): void {
    if (this.state.phase === 'starting' || this.state.phase === 'active') return;
    this.dispose();
    this.store.set({ connection: 'idle', unreachable: false });
  }

  private ensureConnection(): void {
    if (this.conn) return;
    this.conn = new Connection({
      url: this.o.url,
      WebSocketImpl: this.o.WebSocketImpl,
      onStatus: (connection) => this.store.set({ connection }),
      onLatency: (latencyMs) => this.store.set({ latencyMs }),
      onOpen: () => {
        if (this.creds) this.conn?.send({ type: 'RECONNECT_HOST', ...this.creds });
        else if (this.wantSession) this.conn?.send({ type: 'CREATE_SESSION', protocol: PROTOCOL_VERSION });
      },
      onMessage: (m) => this.onMessage(m),
    });
    this.conn.connect();
  }

  start(): void {
    if (this.state.phase === 'starting' || this.state.phase === 'active') return;
    this.version = 0;
    this.lastSent = null;
    this.creds = null;
    this.wantSession = true;
    this.store.set({ ...INITIAL, phase: 'starting', connection: this.state.connection, latencyMs: this.state.latencyMs, activeToolId: this.state.activeToolId, activeToolSupported: this.state.activeToolSupported });
    if (this.conn?.isOpen) {
      // Warm socket: no handshake left to wait for.
      this.conn.send({ type: 'CREATE_SESSION', protocol: PROTOCOL_VERSION });
    } else {
      this.ensureConnection();
    }
    clearTimeout(this.reachTimer);
    this.reachTimer = setTimeout(() => {
      if (this.state.phase === 'starting') this.store.set({ unreachable: true }); // keeps retrying in the background
    }, this.o.connectTimeoutMs ?? 4000);
  }

  /** Abandons a stuck attempt and starts over. */
  retry(): void {
    this.dispose();
    this.store.set({ phase: 'idle' });
    this.start();
  }

  private onMessage(m: ServerMessage): void {
    switch (m.type) {
      case 'SESSION_CREATED':
        this.creds = { sessionId: m.state.sessionId, hostToken: m.hostToken };
        this.lastSent = null; // after (re)connect the next update is always a full one
        this.cleared = null;
        clearTimeout(this.reachTimer);
        this.store.set({ phase: 'active', host: m.state, error: null, unreachable: false });
        this.routeSent = null; // a new or resumed session: tell viewers where we are
        this.sendRoute();
        this.scheduleFlush(true);
        break;
      case 'HOST_STATE': {
        const resumed = this.state.host?.paused && !m.state.paused;
        const filesChanged = this.state.host !== null && this.state.host.allowFiles !== m.state.allowFiles;
        this.store.set({ host: m.state });
        if (resumed) { this.routeSent = null; this.sendRoute(); } // routes are withheld while paused
        if (resumed || filesChanged) { this.lastSent = null; this.scheduleFlush(true); }
        break;
      }
      case 'SESSION_ENDED':
        this.finish('ended', m.reason);
        break;
      case 'ERROR':
        if (m.code === 'NEED_FULL_UPDATE') { this.lastSent = null; this.scheduleFlush(true); break; }
        if (m.code === 'UNAUTHORIZED' && this.creds) { this.finish('ended', 'host_disconnected'); break; }
        if (m.fatal) { this.store.set({ phase: 'error', error: { code: m.code, message: m.message } }); this.teardown(); break; }
        this.store.set({ error: { code: m.code, message: m.message } });
        break;
      default: break;
    }
  }

  private finish(phase: 'ended', reason: LeaveReason) {
    this.teardown();
    this.store.set({ phase, endedReason: reason, host: null });
  }

  private teardown() {
    clearTimeout(this.timer);
    clearTimeout(this.reachTimer);
    this.conn?.close();
    this.conn = null;
    this.creds = null;
    this.wantSession = false;
  }

  // ---------- commands ----------
  private cmd(message: Parameters<Connection['send']>[0]) { return this.conn?.send(message) ?? false; }
  approve(requestId: string) { this.cmd({ type: 'APPROVE', requestId }); }
  reject(requestId: string) { this.cmd({ type: 'REJECT', requestId }); }
  kick(viewerId: string) { this.cmd({ type: 'KICK', viewerId }); }
  pause() { this.cmd({ type: 'PAUSE' }); }
  resume() { this.cmd({ type: 'RESUME' }); }
  extend() { this.cmd({ type: 'EXTEND' }); }
  setAllowFiles(allow: boolean) { this.cmd({ type: 'SET_ALLOW_FILES', allow }); }
  refreshCode() { this.cmd({ type: 'REFRESH_CODE' }); }
  end() {
    this.cmd({ type: 'END' });
    this.finish('ended', 'host_ended');
  }
  /** Releases everything (page unload / provider teardown) without ending a resumable session. */
  dispose() { clearTimeout(this.timer); clearTimeout(this.reachTimer); this.conn?.close(); this.conn = null; }

  // ---------- route synchronization ----------

  /**
   * The host tab navigated. `route` must already be a shareable route (see `routes.ts`) or `null` for a page
   * that is not shared, in which case viewers simply stay where they are. Duplicate reports are ignored.
   */
  setRoute(route: string | null): void {
    this.route = route;
    this.sendRoute();
  }

  private sendRoute() {
    const route = this.route;
    if (!route || route === this.routeSent || this.state.phase !== 'active' || this.state.host?.paused) return;
    if (this.cmd({ type: 'ROUTE', route })) this.routeSent = route; // offline: resent after reconnect
  }

  // ---------- outbound content pipeline ----------

  /**
   * Called by tool panels with the fields they want to share. Cheap to call on every
   * render: unchanged content is never sent, and bursts are coalesced by the debounce.
   */
  publish(toolId: string, fields: Record<string, string>): void {
    const supported = isLiveShareTool(toolId);
    if (this.state.activeToolId !== toolId || this.state.activeToolSupported !== supported) {
      this.store.set({ activeToolId: toolId, activeToolSupported: supported });
    }
    if (!supported) {
      this.latest = null;
      this.lastSent = null;
      this.announceCleared('unsupported');
      return;
    }
    this.cleared = null;
    const prev = this.latest;
    this.latest = { toolId, fields };
    if (prev && prev.toolId === toolId && shallowEqual(prev.fields, fields)) return;
    this.scheduleFlush(false);
  }

  /** A panel unmounted: stop sharing its tool so viewers don't keep showing stale content. */
  release(toolId: string): void {
    if (this.state.activeToolId !== toolId) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.latest = null;
    this.lastSent = null;
    this.store.set({ activeToolId: null, activeToolSupported: true, withheld: [], fileGated: [] });
    this.announceCleared('none');
  }

  /** Tells viewers there is no shareable tool, and why — once per change, and again after a reconnect. */
  private announceCleared(kind: 'none' | 'unsupported') {
    if (this.state.phase !== 'active' || this.cleared === kind) return;
    if (this.cmd({ type: 'CLEAR_TOOL', unsupported: kind === 'unsupported' })) this.cleared = kind;
  }

  private scheduleFlush(immediate: boolean) {
    if (this.state.phase !== 'active') return;
    const now = Date.now();
    if (!this.timer) this.firstPendingAt = now;
    clearTimeout(this.timer);
    const wait = immediate ? 0 : Math.max(0, Math.min(this.o.debounceMs ?? 200, (this.o.maxWaitMs ?? 600) - (now - this.firstPendingAt)));
    this.timer = setTimeout(() => { this.timer = undefined; this.flush(); }, wait);
  }

  private flush() {
    const latest = this.latest;
    if (!latest || this.state.phase !== 'active' || this.state.host?.paused) return;
    const spec = getLiveShareTool(latest.toolId);
    if (!spec) return;

    // Allow-list + credential scan. Withheld fields are blanked, not skipped, so a viewer
    // never keeps showing an older value that no longer matches the host.
    const safe: Record<string, string> = {};
    const withheld: string[] = [];
    const fileGated: string[] = [];
    const allowFiles = this.state.host?.allowFiles === true;
    for (const [key, field] of Object.entries(spec.fields)) {
      const value = latest.fields[key];
      if (typeof value !== 'string') continue;
      if (field.optIn === 'files' && !allowFiles) { safe[key] = ''; if (value) fileGated.push(field.label); continue; }
      if (isFreeText(field.kind) && detectSecret(value)) { safe[key] = ''; withheld.push(field.label); } else safe[key] = value.slice(0, field.maxChars);
    }
    if (Object.values(spec.fields).some((f) => f.optIn === 'files')) safe['ws.filesShared'] = allowFiles ? 'true' : 'false';
    if (withheld.join() !== this.state.withheld.join()) this.store.set({ withheld });
    if (fileGated.join() !== this.state.fileGated.join()) this.store.set({ fileGated });

    const full = !this.lastSent || this.lastSent.toolId !== latest.toolId;
    const changed: Record<string, string> = {};
    for (const [key, value] of Object.entries(safe)) if (full || this.lastSent!.fields[key] !== value) changed[key] = value;
    if (!full && Object.keys(changed).length === 0) return;

    const version = this.version + 1;
    if (!this.cmd({ type: 'CONTENT_UPDATE', toolId: latest.toolId, version, full, fields: changed })) return; // offline: resent in full on reconnect
    this.version = version;
    this.lastSent = { toolId: latest.toolId, fields: { ...(full ? {} : this.lastSent!.fields), ...changed } };
  }
}

function shallowEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}
