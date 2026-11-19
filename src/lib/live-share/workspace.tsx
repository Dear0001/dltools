'use client';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { LiveToolContext, type LiveToolContextValue } from './toolContext';
import { getHostController } from './react';

const NO_FIELDS: Readonly<Record<string, string>> = Object.freeze({});

/**
 * Wraps one tool workspace.
 * - Without `viewerFields` (normal use / hosting): collects the state that panels register through `useLiveState`
 *   (plus the current theme and language) and publishes it to the host controller, coalescing a render's worth of
 *   registrations into a single update. If no session is active this costs nothing.
 * - With `viewerFields` (Live Share viewer): provides the host's values and a read-only mode.
 */
export function LiveToolProvider({ toolId, viewerFields, children }: { toolId: string; viewerFields?: Record<string, string>; children: React.ReactNode }) {
  const mode: 'host' | 'viewer' = viewerFields ? 'viewer' : 'host';
  const { theme } = useTheme();
  const { locale } = useLocale();
  const values = useRef(new Map<string, string>());
  const queued = useRef(false);

  const flush = useCallback(() => {
    queued.current = false;
    if (mode !== 'host') return;
    getHostController()?.publish(toolId, Object.fromEntries(values.current));
  }, [toolId, mode]);

  const register = useCallback((key: string, value: string) => {
    if (values.current.get(key) === value) return;
    values.current.set(key, value);
    if (!queued.current) { queued.current = true; queueMicrotask(flush); } // after every panel effect of this commit has run
  }, [flush]);
  const unregister = useCallback((key: string) => { values.current.delete(key); }, []);

  useEffect(() => { if (mode === 'host') register('ws.theme', theme); }, [mode, theme, register]);
  useEffect(() => { if (mode === 'host') register('ws.locale', locale); }, [mode, locale, register]);
  // Leaving the tool stops sharing it, so viewers never keep showing a tool the host has left.
  useEffect(() => () => { if (mode === 'host') getHostController()?.release(toolId); }, [mode, toolId]);

  const value = useMemo<LiveToolContextValue>(
    () => ({ mode, toolId, fields: viewerFields ?? NO_FIELDS, register, unregister }),
    [mode, toolId, viewerFields, register, unregister],
  );
  return <LiveToolContext.Provider value={value}>{children}</LiveToolContext.Provider>;
}
