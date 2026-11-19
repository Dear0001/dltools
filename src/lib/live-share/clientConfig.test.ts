import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLiveShareUrl } from './clientConfig';

function setLocation(url: string) {
  const { protocol, host, hostname } = new URL(url);
  vi.stubGlobal('window', { location: { protocol, host, hostname } });
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('getLiveShareUrl', () => {
  it('uses the configured URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_LIVE_SHARE_WS_URL', 'wss://live.example.com/live-share');
    setLocation('https://tools.example.com/');
    expect(getLiveShareUrl()).toBe('wss://live.example.com/live-share');
  });

  it('is disabled by "off"', () => {
    vi.stubEnv('NEXT_PUBLIC_LIVE_SHARE_WS_URL', 'off');
    setLocation('https://tools.example.com/');
    expect(getLiveShareUrl()).toBeNull();
  });

  it('defaults to the local service on localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_LIVE_SHARE_WS_URL', '');
    setLocation('http://localhost:4028/');
    expect(getLiveShareUrl()).toBe('ws://localhost:4040/live-share');
  });

  it('falls back to the page origin (wss on https) in production, with no build-time variable', () => {
    vi.stubEnv('NEXT_PUBLIC_LIVE_SHARE_WS_URL', '');
    setLocation('https://tools.example.com/tools/json-formatter');
    expect(getLiveShareUrl()).toBe('wss://tools.example.com/live-share-ws');
  });
});
