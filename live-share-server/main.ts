/**
 * DLTools Live Share WebSocket service entry point.
 * All logic lives in frontend/src/lib/live-share (shared with the browser client and tests);
 * this file only reads environment variables and starts the server.
 */
import { loadConfig } from '../src/lib/live-share/config';
import { createLiveShareServer } from '../src/lib/live-share/server';

const env = process.env;
const allowedOrigins = (env.LIVE_SHARE_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

if (allowedOrigins.length === 0) {
  console.error('LIVE_SHARE_ALLOWED_ORIGINS is required (comma-separated, e.g. https://dltools.vercel.app).');
  process.exit(1);
}
if (env.NODE_ENV === 'production' && allowedOrigins.some((o) => o.startsWith('http://') && !o.includes('localhost'))) {
  console.error('Refusing to start: production origins must be https.');
  process.exit(1);
}

const server = createLiveShareServer({
  port: Number(env.PORT ?? 4040),
  host: env.HOST ?? '0.0.0.0',
  allowedOrigins,
  trustProxy: env.LIVE_SHARE_TRUST_PROXY === 'true',
  config: loadConfig(env),
  // Structured, content-free logs: never log codes, tokens or shared content.
  log: (event, detail) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...detail })),
});

server.start().then((port) => console.log(JSON.stringify({ event: 'listening', port })));

const shutdown = () => { void server.stop().then(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
