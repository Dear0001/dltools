/**
 * WebSocket front-end for the SessionManager. Node-only. Run it with
 * `backend/live-share-server` (see docs/live-share.md); it cannot run inside Vercel
 * serverless functions, which do not hold WebSocket connections open.
 *
 * TLS is terminated by the reverse proxy / platform, so clients reach this as `wss://`.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { loadConfig, type LiveShareConfig } from './config';
import { encode, parseClientMessage, type ServerMessage } from './protocol';
import { SessionManager, type Transport } from './sessionManager';

export interface ServerOptions {
  port: number;
  host?: string;
  config?: LiveShareConfig;
  /** Exact origins allowed to open a socket, e.g. `https://dltools.vercel.app`. Required. */
  allowedOrigins: string[];
  /** Trust `X-Forwarded-For` (set only behind a proxy that overwrites it). */
  trustProxy?: boolean;
  tickMs?: number;
  log?: (event: string, detail?: Record<string, unknown>) => void;
}

export interface LiveShareServer {
  manager: SessionManager;
  /** Resolves with the bound port. */
  start(): Promise<number>;
  stop(): Promise<void>;
  http: Server;
}

const PATH = '/live-share';
const FIRST_MESSAGE_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 20_000;

export function createLiveShareServer(options: ServerOptions): LiveShareServer {
  const config = options.config ?? loadConfig();
  const log = options.log ?? (() => {});
  const sockets = new Map<string, WebSocket>();

  const transport: Transport = {
    send(id, message: ServerMessage) {
      const ws = sockets.get(id);
      if (ws && ws.readyState === ws.OPEN) ws.send(encode(message));
    },
    close(id, code, reason) {
      const ws = sockets.get(id);
      if (ws && (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING)) ws.close(code, reason.slice(0, 100));
    },
    backlog(id) {
      return sockets.get(id)?.bufferedAmount ?? 0;
    },
  };
  const manager = new SessionManager(config, transport);

  const http = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      // Counts only: never session ids, codes or content.
      res.end(JSON.stringify({ ok: true, sessions: manager.stats.sessions }));
      return;
    }
    res.writeHead(404).end();
  });

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: config.maxMessageBytes,
    perMessageDeflate: false,
  });

  const clientIp = (req: IncomingMessage): string => {
    if (options.trustProxy) {
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (forwarded.length) return forwarded[forwarded.length - 1]; // the hop our own proxy appended
    }
    return req.socket.remoteAddress ?? 'unknown';
  };

  http.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const origin = req.headers.origin;
    if (url.pathname !== PATH) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      return socket.destroy();
    }
    // Browsers always send Origin on WebSocket handshakes; reject anything not on the allowlist.
    if (!origin || !options.allowedOrigins.includes(origin)) {
      log('origin_rejected', { origin });
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      return socket.destroy();
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  const perIp = new Map<string, number>();

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req);
    const open = perIp.get(ip) ?? 0;
    if (open >= config.maxConnectionsPerIp) {
      log('connection_cap', { open });
      ws.close(1013, 'too many connections'); // 1013 = try again later
      return;
    }
    perIp.set(ip, open + 1);
    const id = randomUUID();
    sockets.set(id, ws);
    manager.connect(id, ip);
    let alive = true;
    let spoken = false;

    const firstMessageTimer = setTimeout(() => {
      if (!spoken) ws.close(1008, 'no message');
    }, FIRST_MESSAGE_TIMEOUT_MS);

    ws.on('pong', () => { alive = true; });
    ws.on('message', (data, isBinary) => {
      spoken = true;
      const parsed = parseClientMessage(isBinary ? null : data.toString('utf8'), config.maxMessageBytes);
      if (!parsed.ok) {
        transport.send(id, { type: 'ERROR', code: parsed.code, message: parsed.message });
        return;
      }
      try {
        manager.handle(id, parsed.message);
      } catch (error) {
        log('handler_error', { message: error instanceof Error ? error.message : 'unknown' });
        transport.send(id, { type: 'ERROR', code: 'INVALID_MESSAGE', message: 'Could not process that message.' });
      }
    });
    ws.on('close', () => {
      clearTimeout(firstMessageTimer);
      clearInterval(heartbeat);
      sockets.delete(id);
      manager.disconnect(id);
      const left = (perIp.get(ip) ?? 1) - 1;
      if (left <= 0) perIp.delete(ip); else perIp.set(ip, left);
    });
    ws.on('error', () => ws.terminate());

    const heartbeat = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, HEARTBEAT_MS);
  });

  let ticker: ReturnType<typeof setInterval> | undefined;

  return {
    manager,
    http,
    start() {
      return new Promise((resolve) => {
        http.listen(options.port, options.host, () => {
          ticker = setInterval(() => manager.tick(), options.tickMs ?? 1000);
          ticker.unref?.();
          const address = http.address();
          resolve(typeof address === 'object' && address ? address.port : options.port);
        });
      });
    },
    stop() {
      if (ticker) clearInterval(ticker);
      manager.shutdown();
      for (const ws of sockets.values()) ws.terminate();
      return new Promise((resolve) => { wss.close(() => http.close(() => resolve())); });
    },
  };
}
