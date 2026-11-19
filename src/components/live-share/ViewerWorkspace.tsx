'use client';
import React, { memo, useDeferredValue, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, LogOut, Pause, WifiOff } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { useTheme } from '@/components/ThemeProvider';
import { getToolName, useLocale } from '@/i18n/LocaleProvider';
import { getLiveShareTool, type LiveShareFieldSpec } from '@/lib/live-share/registry';
import { THEMES, type ThemePreference } from '@/lib/theme';
import type { ViewerViewState } from '@/lib/live-share/viewerController';
import { Card, ConnectionBadge, useLs } from './shared';
import ViewerGuard from './ViewerGuard';

// The real DLTools workspace (header, toolbar, editor panels). Loaded on demand: the join page stays light.
const WorkspaceShell = dynamic(() => import('@/app/tool-workspace/components/WorkspaceShell'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-[var(--radius)] bg-muted" aria-hidden="true" />,
});

const MAX_DISPLAY_CHARS = 100_000;

/** Fallback for tools whose real panel is not yet driven by `useLiveState`: a read-only field list. */
const FieldView = memo(function FieldView({ spec, value, dimmed }: { spec: LiveShareFieldSpec; value: string; dimmed: boolean }) {
  const { t } = useLs();
  const shown = value.length > MAX_DISPLAY_CHARS ? value.slice(0, MAX_DISPLAY_CHARS) : value;
  return (
    <div className="min-w-0">
      <p className="field-label">{spec.label}</p>
      <pre
        data-no-translate
        tabIndex={0}
        aria-label={spec.label}
        className={`max-h-[50dvh] min-h-[6rem] overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius)] border border-border bg-background-secondary p-3 font-mono text-[13px] leading-relaxed text-foreground scrollbar-thin ${dimmed ? 'opacity-60' : ''}`}
      >
        {shown || <span className="text-muted-foreground">{t('emptyField')}</span>}
      </pre>
      {value.length > MAX_DISPLAY_CHARS && <p className="mt-1 text-xs text-muted-foreground">{t('truncated')}</p>}
    </div>
  );
});

/**
 * While following, the viewer takes on the host's theme and language *without saving them*: the viewer's
 * own preferences are remembered and restored when following stops or the viewer leaves.
 */
function useFollowAppearance(enabled: boolean, hostTheme: string | undefined, hostLocale: string | undefined) {
  const { preference, setPreference } = useTheme();
  const { locale, setLocale } = useLocale();
  const original = useRef<{ preference: ThemePreference; locale: 'en' | 'kh' } | null>(null);
  const live = useRef({ preference, locale });
  live.current = { preference, locale };

  useEffect(() => {
    if (!enabled) return;
    if (!original.current) original.current = { preference: live.current.preference, locale: live.current.locale };
    if (hostTheme && (THEMES as readonly string[]).includes(hostTheme)) setPreference(hostTheme as ThemePreference, { persist: false });
    if (hostLocale === 'en' || hostLocale === 'kh') setLocale(hostLocale, { persist: false });
  }, [enabled, hostTheme, hostLocale, setPreference, setLocale]);

  useEffect(() => {
    if (enabled) return;
    const saved = original.current;
    if (!saved) return;
    original.current = null;
    setPreference(saved.preference, { persist: false });
    setLocale(saved.locale, { persist: false });
  }, [enabled, setPreference, setLocale]);

  // Leaving the page also hands the viewer's own look back.
  useEffect(() => () => {
    const saved = original.current;
    if (saved) { setPreference(saved.preference, { persist: false }); setLocale(saved.locale, { persist: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function ViewerWorkspace({ state, onLeave }: { state: ViewerViewState; onLeave: () => void }) {
  const { t, locale } = useLs();
  const [follow, setFollow] = useState(true);
  const fields = useDeferredValue(state.fields); // keeps the UI responsive while a huge update renders
  useFollowAppearance(follow, state.fields['ws.theme'], state.fields['ws.locale']);

  const tool = TOOLS.find((x) => x.id === state.toolId);
  const spec = state.toolId ? getLiveShareTool(state.toolId) : null;
  const stale = state.paused || !state.hostConnected || state.connection !== 'open';
  const live = !stale;
  const needsFiles = spec ? Object.values(spec.fields).some((f) => f.optIn === 'files') : false;

  return (
    <div className="page-container pb-20 pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{t('viewingShared')}</span>
          <ConnectionBadge status={state.connection} latencyMs={state.latencyMs} />
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${live ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} aria-hidden="true" />{t('live')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><Eye size={12} aria-hidden="true" />{t('readOnly')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
            {t('followAppearance')}
          </label>
          <button type="button" className="btn-ghost" onClick={onLeave}><LogOut size={15} /> {t('leave')}</button>
        </div>
      </div>

      {state.connection !== 'open' && <Banner icon={<WifiOff size={15} />}>{t('statusReconnecting')}</Banner>}
      {state.connection === 'open' && !state.hostConnected && <Banner icon={<WifiOff size={15} />}>{t('hostOffline')}</Banner>}
      {state.paused && <Banner icon={<Pause size={15} />}>{t('pausedBanner')}</Banner>}
      {state.syncing && <Banner>{t('syncing')}</Banner>}
      {state.error && state.error.code !== 'UNAUTHORIZED' && !state.syncing && state.phase === 'joined' && <Banner>{t('errSync')}</Banner>}
      {needsFiles && fields['ws.filesShared'] !== 'true' && <Banner>{t('fileNotShared')}</Banner>}

      {!state.toolId || !spec ? (
        <Card>
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">
            {!state.lastUpdateAt ? t('waitingForTool') : state.hostToolUnsupported ? t('unsupportedTool') : t('hostNoTool')}
          </p>
        </Card>
      ) : spec.native && tool ? (
        // The actual DLTools interface for this tool, driven by the host's state. Dimmed while stale so an old
        // frame is never mistaken for a live one.
        <ViewerGuard className={stale ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <WorkspaceShell key={tool.id} tool={tool} liveViewerFields={fields} embedded />
        </ViewerGuard>
      ) : (
        <Card>
          <p className="mb-3 text-sm text-muted-foreground">{t('hostTool')}: <span className="font-semibold text-foreground">{tool ? getToolName(tool.id, tool.name, locale) : state.toolId}</span></p>
          <div className="grid gap-4 lg:grid-cols-2" aria-live="polite">
            {Object.entries(spec.fields).filter(([k, f]) => f.role !== 'option' && !k.startsWith('ws.')).map(([key, f]) => (
              <FieldView key={key} spec={f} value={fields[key] ?? ''} dimmed={stale} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Banner({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <p role="status" className="mb-3 flex items-center gap-2 rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">{icon}{children}</p>;
}
