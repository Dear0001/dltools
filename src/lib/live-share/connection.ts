/**
 * Resilient WebSocket wrapper (browser or Node 22+). It reports an honest status —
 * `open` only while the socket really is open — reconnects with jittered exponential
 * backoff, measures latency, and removes every listener and timer on `close()`.
 */
import { encode, type ClientMessage, type ServerMessage } from './protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface ConnectionOptions {
  url: string;
  /** Called every time a socket opens (including after a reconnect) — send the handshake here. */
  onOpen: (isReconnect: boolean) => void;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  onLatency?: (ms: number) => void;
  WebSocketImpl?: typeof WebSocket;
  pingIntervalMs?: number;
  /** No reply to our pings for this long ⇒ the link is dead (half-open) and we reconnect. Default 25 s. */
  pongTimeoutMs?: number;
  maxBackoffMs?: number;
  baseBackoffMs?: number;
}

/** `ws://` is only acceptable for local development; everything else must be `wss://`. */
export function isSecureEnough(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'wss:') return true;
    return u.protocol === 'ws:' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
  } catch {
    return false;
  }
}

export class Connection {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'idle';
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private wantOpen = false;
  private hasOpened = false;
  private lastHeard = 0;
  private netListeners = false;

  constructor(private o: ConnectionOptions) {}

  get isOpen(): boolean {
    return this.status === 'open' && this.ws?.readyState === 1;
  }

  connect(): void {
    this.wantOpen = true;
    this.addNetListeners();
    this.open();
  }

  private onOffline = () => {
    // The browser knows the network is gone; don't keep claiming "connected" until a timeout proves it.
    if (this.wantOpen && this.ws) this.drop();
  };
  private onOnline = () => {
    if (this.wantOpen && !this.ws) { clearTimeout(this.retryTimer); this.attempts = 0; this.open(); }
  };
  private addNetListeners() {
    if (this.netListeners || typeof window === 'undefined') return;
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online', this.onOnline);
    this.netListeners = true;
  }
  private removeNetListeners() {
    if (!this.netListeners || typeof window === 'undefined') return;
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online', this.onOnline);
    this.netListeners = false;
  }

  /** Abandons the current socket without waiting for the OS to notice, then reconnects. */
  private drop() {
    const ws = this.ws;
    this.ws = null;
    this.stopPing();
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try { ws.close(); } catch { /* already gone */ }
    }
    this.scheduleRetry();
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status === s) return;
    this.status = s;
    this.o.onStatus(s);
  }

  private open() {
    if (!isSecureEnough(this.o.url)) {
      this.setStatus('closed');
      return;
    }
    const Impl = this.o.WebSocketImpl ?? WebSocket;
    this.setStatus(this.hasOpened ? 'reconnecting' : 'connecting');
    const ws = new Impl(this.o.url);
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      const isReconnect = this.hasOpened;
      this.hasOpened = true;
      this.attempts = 0;
      this.setStatus('open');
      this.startPing();
      this.o.onOpen(isReconnect);
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws || typeof event.data !== 'string') return;
      this.lastHeard = Date.now();
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      if (message.type === 'PONG') {
        this.o.onLatency?.(Math.max(0, Date.now() - message.t));
        return;
      }
      this.o.onMessage(message);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopPing();
      if (!this.wantOpen) return this.setStatus('closed');
      this.scheduleRetry();
    };
    ws.onerror = () => { /* onclose follows and drives the retry */ };
  }

  private scheduleRetry() {
    this.setStatus(this.hasOpened ? 'reconnecting' : 'connecting');
    const base = this.o.baseBackoffMs ?? 500;
    const max = this.o.maxBackoffMs ?? 10_000;
    const delay = Math.min(max, base * 2 ** this.attempts) * (0.75 + Math.random() * 0.5);
    this.attempts += 1;
    this.retryTimer = setTimeout(() => { if (this.wantOpen) this.open(); }, delay);
  }

  private startPing() {
    this.stopPing();
    this.lastHeard = Date.now();
    const timeout = this.o.pongTimeoutMs ?? 25_000;
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastHeard > timeout) return this.drop();
      this.send({ type: 'PING', t: Date.now() });
    }, this.o.pingIntervalMs ?? 10_000);
    this.send({ type: 'PING', t: Date.now() });
  }
  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = undefined;
  }

  /** Returns false (and sends nothing) unless the socket is genuinely open. */
  send(message: ClientMessage): boolean {
    if (!this.isOpen || !this.ws) return false;
    this.ws.send(encode(message));
    return true;
  }

  /** Stops reconnecting and closes. `reconnect: false` is final; the instance can be reused via connect(). */
  close(): void {
    this.wantOpen = false;
    this.removeNetListeners();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.stopPing();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try { ws.close(1000, 'client closed'); } catch { /* already closed */ }
    }
    this.hasOpened = false;
    this.setStatus('closed');
  }
}
