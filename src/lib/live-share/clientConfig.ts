/** Not `/live-share`: that path is the app's own pages (host/join), so the proxy gets a dedicated WebSocket path. */
const SAME_ORIGIN_PATH = '/live-share-ws';

/**
 * Where the Live Share WebSocket service lives.
 *
 * 1. `NEXT_PUBLIC_LIVE_SHARE_WS_URL` (read at BUILD time) wins when set. `off` disables the feature ("not configured").
 * 2. On localhost it defaults to the local dev service on :4040.
 * 3. Otherwise it uses the page's own origin (`wss://<this host>/live-share-ws`). The reverse proxy (Caddy / Nginx)
 *    forwards that path to the Live Share service, so no build-time variable is needed in Docker deployments.
 *    Hosts that cannot proxy WebSockets (e.g. Vercel) must set the variable to the external service instead.
 */
export function getLiveShareUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_LIVE_SHARE_WS_URL?.trim();
  if (configured?.toLowerCase() === 'off') return null;
  if (configured) return configured;
  if (typeof window === 'undefined') return null;
  const { hostname, host, protocol } = window.location;
  if (['localhost', '127.0.0.1'].includes(hostname)) return 'ws://localhost:4040/live-share';
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${SAME_ORIGIN_PATH}`;
}
