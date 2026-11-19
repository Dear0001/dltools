'use client';
/** React bindings for Live Share. Controllers are plain classes; these hooks only subscribe. */
import { useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { LiveToolContext } from './toolContext';
import { getLiveShareUrl } from './clientConfig';
import { isSecureEnough } from './connection';
import { HostController, type HostViewState } from './hostController';
import { ViewerController, type ViewerViewState } from './viewerController';

let hostSingleton: HostController | null = null;
const SERVER_HOST_STATE = { phase: 'idle' } as HostViewState;

/** One host controller per tab, so a session survives client-side navigation between tool pages. */
export function getHostController(): HostController | null {
  if (typeof window === 'undefined') return null;
  if (hostSingleton) return hostSingleton;
  const url = getLiveShareUrl();
  if (!url || !isSecureEnough(url)) return null;
  hostSingleton = new HostController({ url });
  return hostSingleton;
}

export type LiveShareAvailability = 'ok' | 'not-configured' | 'insecure';
export function getAvailability(): LiveShareAvailability {
  const url = getLiveShareUrl();
  if (!url) return 'not-configured';
  return isSecureEnough(url) ? 'ok' : 'insecure';
}

const noopSubscribe = () => () => {};
const idleState: HostViewState = {
  phase: 'idle', connection: 'idle', latencyMs: null, host: null, endedReason: null, error: null,
  withheld: [], fileGated: [], activeToolId: null, activeToolSupported: true, unreachable: false,
};

export function useHost(): { controller: HostController | null; state: HostViewState } {
  const controller = useMemo(() => getHostController(), []);
  const state = useSyncExternalStore(
    controller ? controller.store.subscribe : noopSubscribe,
    controller ? controller.store.get : () => idleState,
    () => SERVER_HOST_STATE,
  );
  return { controller, state: controller ? state : idleState };
}

/** A viewer controller owned by the calling component; closed on unmount. */
export function useViewer(): { controller: ViewerController | null; state: ViewerViewState } {
  const controller = useMemo(() => {
    const url = getLiveShareUrl();
    return typeof window !== 'undefined' && url && isSecureEnough(url) ? new ViewerController({ url }) : null;
  }, []);
  useEffect(() => () => controller?.dispose(), [controller]);
  const idle = useRef<ViewerViewState>({
    phase: 'idle', connection: 'idle', latencyMs: null, toolId: null, hostToolUnsupported: false, fields: {}, paused: false, hostConnected: true,
    sessionExpiresAt: null, endedReason: null, rejectedReason: null, error: null, lastUpdateAt: null, syncing: false, unreachable: false,
  });
  const state = useSyncExternalStore(
    controller ? controller.store.subscribe : noopSubscribe,
    controller ? controller.store.get : () => idle.current,
    () => idle.current,
  );
  return { controller, state };
}

/**
 * Called by a tool panel to publish the fields it declared in the Live Share registry.
 * Does nothing unless the user is hosting a session; unchanged values are never re-sent.
 * `values` must list the same keys in the same order on every render.
 */
export function useLiveShareHost(toolId: string, fields: Record<string, string>): void {
  const ctx = useContext(LiveToolContext);
  const keys = Object.keys(fields);
  const values = keys.map((k) => fields[k]);
  useEffect(() => {
    if (ctx) {
      // Inside a workspace: hand the values to the provider, which publishes one combined update.
      if (ctx.mode === 'host') for (const k of keys) ctx.register(k, fields[k]);
      return;
    }
    getHostController()?.publish(toolId, fields);
    // `fields` is rebuilt every render; the primitive values above are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, toolId, ...values]);
  useEffect(() => () => { if (!ctx) getHostController()?.release(toolId); }, [ctx, toolId]);
}

/** False during SSR and the hydration pass, true afterwards — keeps server and first client render identical. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
