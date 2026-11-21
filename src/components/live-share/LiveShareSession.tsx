'use client';
/**
 * App-level Live Share session manager, mounted once in the root layout so it survives every route change.
 *
 * Live Share synchronizes the *existing* application — it never renders a second copy of a tool:
 * - Host tab: reports its current route (`/tools/json-formatter`) to the session. The tool page's own
 *   `LiveToolProvider` publishes the tool's state.
 * - Viewer tab: navigates with the app's own router to the host's route, so it renders the very same page
 *   component. `WorkspaceShell` then feeds the host's state into the real panel in read-only mode.
 *
 * The only UI added here is a slim session bar (status, leave), never tool UI.
 */
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Eye, LogOut, Pause, Radio, WifiOff, X } from 'lucide-react';
import { CATEGORIES, getToolBySlug } from '@/data/tools';
import { useTheme } from '@/components/ThemeProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { THEMES, type ThemePreference } from '@/lib/theme';
import { getHostController, useViewer } from '@/lib/live-share/react';
import { normalizeShareRoute, toolSlugOfRoute } from '@/lib/live-share/routes';
import { getLiveShareTool } from '@/lib/live-share/registry';
import { ConnectionBadge, useLs } from './shared';
import type { LsKey } from './messages';

const ENDED_KEY: Record<string, LsKey> = {
  host_ended: 'endedHostEnded', host_disconnected: 'endedHostGone', expired: 'endedExpired', idle: 'endedIdle', server_shutdown: 'endedServer', kicked: 'endedKicked',
};

/** A host route is followed only if it is shareable *and* names a page that exists in this build. */
export function resolveViewerRoute(route: string | null): string | null {
  const clean = normalizeShareRoute(route);
  if (!clean) return null;
  const slug = toolSlugOfRoute(clean);
  if (slug) return getToolBySlug(slug) ? clean : null;
  const category = /^\/categories\/(.+)$/.exec(clean)?.[1];
  if (category) return CATEGORIES.some((c) => c.id === category) ? clean : null;
  return clean; // `/` or `/tools`
}

export default function LiveShareSession() {
  const pathname = usePathname();
  const router = useRouter();
  const { controller: viewer, state } = useViewer();
  const joined = state.phase === 'joined';

  // Refreshing a viewer tab rejoins the same session (credentials are kept for this tab only).
  useEffect(() => { viewer?.resume(); }, [viewer]);

  // ---- Host: report where this tab is. The controller ignores duplicates and sends only while hosting. ----
  useEffect(() => {
    if (joined) return; // a viewer tab never publishes
    getHostController()?.setRoute(normalizeShareRoute(pathname));
  }, [pathname, joined]);

  // ---- Viewer: follow the host with the app's own router. ----
  const target = joined ? resolveViewerRoute(state.route) : null;
  const lastNav = useRef<string | null>(null);
  useEffect(() => {
    if (!target || pathname === target) { lastNav.current = null; return; }
    const key = `${pathname}→${target}`;
    if (lastNav.current === key) return; // this exact navigation is already in flight
    lastNav.current = key;
    router.replace(target); // replace: following the host should not fill the viewer's back button
  }, [target, pathname, router]);

  if (state.phase === 'idle' || pathname?.startsWith('/live-share/join')) return null; // the join page has its own UI
  return <ViewerBar state={state} onLeave={() => viewer?.leave()} onDismiss={() => viewer?.leave()} />;
}

function ViewerBar({ state, onLeave, onDismiss }: { state: ReturnType<typeof useViewer>['state']; onLeave: () => void; onDismiss: () => void }) {
  const { t } = useLs();
  const [follow, setFollow] = useState(true);
  const joined = state.phase === 'joined';
  useFollowAppearance(joined && follow, state.fields['ws.theme'], state.fields['ws.locale']);

  if (state.phase === 'ended' || state.phase === 'rejected' || state.phase === 'error') {
    return (
      <Strip tone="muted">
        <p role="alert" className="text-sm text-foreground">
          {state.phase === 'ended' ? t(ENDED_KEY[state.endedReason ?? 'host_ended'] ?? 'endedHostEnded') : t('errGeneric')}
        </p>
        <button type="button" className="btn-ghost ml-auto" onClick={onDismiss}><X size={15} aria-hidden="true" /> {t('dismiss')}</button>
      </Strip>
    );
  }
  if (!joined) {
    return <Strip tone="muted"><p role="status" className="text-sm text-muted-foreground">{state.resuming ? t('resumingSession') : t('connecting')}</p></Strip>;
  }

  const stale = state.paused || !state.hostConnected || state.connection !== 'open';
  const spec = state.toolId ? getLiveShareTool(state.toolId) : null;
  const needsFiles = spec ? Object.values(spec.fields).some((f) => f.optIn === 'files') : false;
  const notice =
    state.connection !== 'open' ? { icon: <WifiOff size={14} aria-hidden="true" />, text: t('statusReconnecting') }
    : !state.hostConnected ? { icon: <WifiOff size={14} aria-hidden="true" />, text: t('hostOffline') }
    : state.paused ? { icon: <Pause size={14} aria-hidden="true" />, text: t('pausedBanner') }
    : state.syncing ? { icon: null, text: t('syncing') }
    : state.hostToolUnsupported ? { icon: null, text: t('unsupportedTool') }
    : needsFiles && state.fields['ws.filesShared'] !== 'true' ? { icon: null, text: t('fileNotShared') }
    : null;

  return (
    <Strip tone={stale ? 'warning' : 'live'}>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Radio size={15} className={stale ? 'text-warning' : 'animate-pulse text-success'} aria-hidden="true" />{t('followingHost')}
      </span>
      <ConnectionBadge status={state.connection} latencyMs={state.latencyMs} />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><Eye size={12} aria-hidden="true" />{t('readOnly')}</span>
      {notice && <span role="status" className="inline-flex items-center gap-1.5 text-xs text-foreground">{notice.icon}{notice.text}</span>}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
          {t('followAppearance')}
        </label>
        <button type="button" className="btn-ghost" onClick={onLeave}><LogOut size={15} aria-hidden="true" /> {t('leave')}</button>
      </div>
    </Strip>
  );
}

function Strip({ tone, children }: { tone: 'live' | 'warning' | 'muted'; children: React.ReactNode }) {
  const color = tone === 'live' ? 'border-success/40 bg-success/10' : tone === 'warning' ? 'border-warning/40 bg-warning/10' : 'border-border bg-background-secondary';
  return (
    <div role="region" aria-label="Live Share" className={`sticky top-16 z-30 border-b ${color}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

/**
 * While following, the viewer takes on the host's theme and language *without saving them*: the viewer's
 * own preferences are remembered and restored when following stops or the viewer leaves.
 */
function useFollowAppearance(enabled: boolean, hostTheme: string | undefined, hostLocale: string | undefined) {
  const { preference, setPreference } = useTheme();
  const { locale, setLocale } = useLocale();
  const original = useRef<{ preference: ThemePreference; locale: 'en' | 'kh' } | null>(null);
  const live = useRef({ preference, locale });
  useEffect(() => { live.current = { preference, locale }; }, [preference, locale]);

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

  // Leaving removes the bar: hand the viewer's own look back on the way out.
  useEffect(() => () => {
    const saved = original.current;
    if (saved) { setPreference(saved.preference, { persist: false }); setLocale(saved.locale, { persist: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
