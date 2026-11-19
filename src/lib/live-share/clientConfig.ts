/** Where the Live Share WebSocket service lives. Unset in production = feature shows "not configured". */
export function getLiveShareUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_LIVE_SHARE_WS_URL?.trim();
  if (configured) return configured;
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'ws://localhost:4040/live-share';
  }
  return null;
}
