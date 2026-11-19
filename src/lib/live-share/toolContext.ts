'use client';
import { createContext, useContext } from 'react';

/**
 * Per-tool Live Share context. `WorkspaceShell` wraps each tool in a provider:
 * - host/normal mode: panels register their shared state here and it is published to viewers;
 * - viewer mode: panels read their state from `fields` (the host's snapshot) and cannot change it.
 */
export interface LiveToolContextValue {
  mode: 'host' | 'viewer';
  toolId: string;
  /** The host's current values, as strings (viewer mode only). */
  fields: Readonly<Record<string, string>>;
  register(key: string, value: string): void;
  unregister(key: string): void;
}

export const LiveToolContext = createContext<LiveToolContextValue | null>(null);

/** True when this tool is being rendered as a Live Share viewer (read-only). */
export function useLiveViewerMode(): boolean {
  return useContext(LiveToolContext)?.mode === 'viewer';
}
