'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Link2, Pause, Play, RefreshCw, Square, Timer, UserCheck, UserX, Users, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { TOOLS, getToolPath } from '@/data/tools';
import { getToolName } from '@/i18n/LocaleProvider';
import { getAvailability, useHost, useIsClient } from '@/lib/live-share/react';
import { Card, ConnectionBadge, Countdown, PrivacyNotice, useLs } from './shared';
import PairingQr, { joinLink } from './PairingQr';
import type { LsKey } from './messages';

const ENDED_KEY: Record<string, LsKey> = {
  host_ended: 'endedHostEnded', host_disconnected: 'endedHostGone', expired: 'endedExpired', idle: 'endedIdle', server_shutdown: 'endedServer', kicked: 'endedKicked',
};

export default function HostDashboard() {
  const { t, locale } = useLs();
  const { controller, state } = useHost();
  const ready = useIsClient();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const availability = React.useSyncExternalStore(() => () => {}, getAvailability, () => 'ok' as const);

  // Reuse an active session when returning from a tool page; otherwise create one.
  useEffect(() => {
    if (controller && state.phase === 'idle') controller.start();
    // Only on mount: ended/error states are resolved by an explicit button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const crumbs = [{ label: t('title'), href: '/live-share' }, { label: t('hostTitle') }];
  const host = state.host;

  if (ready && (!controller || availability !== 'ok')) {
    return <Shell crumbs={crumbs} title={t('hostTitle')}><Alert>{availability === 'insecure' ? t('insecureUrl') : t('notConfigured')}</Alert></Shell>;
  }
  if (!ready || !controller) return <Shell crumbs={crumbs} title={t('hostTitle')}><p role="status" className="text-sm text-muted-foreground">{t('starting')}</p></Shell>;
  if (state.phase === 'ended') {
    return (
      <Shell crumbs={crumbs} title={t('sessionEndedTitle')}>
        <Alert>{t(ENDED_KEY[state.endedReason ?? 'host_ended'])}</Alert>
        <button type="button" className="btn-primary mt-4" onClick={() => controller.start()}>{t('startNew')}</button>
      </Shell>
    );
  }
  if (state.phase === 'error') {
    return (
      <Shell crumbs={crumbs} title={t('hostTitle')}>
        <Alert>{errorText(state.error?.code, t)}</Alert>
        <button type="button" className="btn-primary mt-4" onClick={() => controller.start()}>{t('tryAgain')}</button>
      </Shell>
    );
  }
  if (!host) {
    return (
      <Shell crumbs={crumbs} title={t('hostTitle')}>
        {state.unreachable ? (
          <div role="alert" className="max-w-xl rounded-[var(--radius)] border border-warning/40 bg-warning/10 p-4">
            <p className="text-sm font-semibold text-foreground">{t('unreachableTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('unreachableBody')}</p>
            <button type="button" className="btn-primary mt-3" onClick={() => controller.retry()}><RefreshCw size={15} /> {t('retryNow')}</button>
          </div>
        ) : (
          <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
            {state.connection === 'reconnecting' ? t('statusReconnecting') : t('starting')}
          </div>
        )}
      </Shell>
    );
  }

  const copy = async (what: 'code' | 'link') => {
    try {
      const text = what === 'code' ? host.code ?? '' : joinLink(host.code ?? '');
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch { window.alert(t('copyFailed')); }
  };
  const tool = TOOLS.find((x) => x.id === (state.activeToolId ?? host.toolId));

  return (
    <Shell crumbs={crumbs} title={t('hostTitle')} action={<ConnectionBadge status={state.connection} latencyMs={state.latencyMs} />}>
      {state.connection !== 'open' && <Alert>{t('statusReconnecting')}</Alert>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card title={t('pairingCode')}>
          {host.code ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <PairingQr code={host.code} />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p data-no-translate className="select-all whitespace-nowrap font-mono text-2xl font-semibold tracking-[0.12em] text-foreground sm:text-3xl">{host.code}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t('codeExpiresIn')} <Countdown until={host.pairingExpiresAt} /></p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <button type="button" className="btn-ghost" onClick={() => void copy('code')}>
                    {copied === 'code' ? <Check size={15} className="text-success" /> : <Copy size={15} />} {copied === 'code' ? t('copied') : t('copyCode')}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => void copy('link')}>
                    {copied === 'link' ? <Check size={15} className="text-success" /> : <Link2 size={15} />} {copied === 'link' ? t('copied') : t('copyLink')}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => controller.refreshCode()}><RefreshCw size={15} /> {t('newCode')}</button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">{t('codeExpired')}</p>
              <button type="button" className="btn-primary mt-3" onClick={() => controller.refreshCode()}><RefreshCw size={15} /> {t('newCode')}</button>
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('sharing')}</p>
                <p className={`text-sm font-semibold ${host.paused ? 'text-warning' : 'text-success'}`}>{host.paused ? t('sharingPausedTitle') : t('sharingLive')}</p>
              </div>
              <div className="text-xs text-muted-foreground"><Timer size={13} className="mr-1 inline" aria-hidden="true" />{t('sessionEndsIn')} <Countdown until={host.sessionExpiresAt} /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={() => (host.paused ? controller.resume() : controller.pause())}>
                {host.paused ? <Play size={15} /> : <Pause size={15} />} {host.paused ? t('resume') : t('pause')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => controller.extend()}><Timer size={15} /> {t('extend')}</button>
              <button type="button" className="btn-ghost text-error" onClick={() => controller.end()}><Square size={15} /> {t('endSession')}</button>
            </div>
          </Card>

          <Card title={t('fileShareTitle')}>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={host.allowFiles}
                onChange={(e) => controller.setAllowFiles(e.target.checked)}
              />
              <span className="text-muted-foreground">{t('fileShareBody')}</span>
            </label>
          </Card>

          <Card title={t('currentTool')}>
            {tool ? (
              <p className="text-sm text-foreground">
                <Link href={getToolPath(tool)} className="font-medium text-primary underline underline-offset-2">{getToolName(tool.id, tool.name, locale)}</Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noTool')}. <Link href="/tools" className="font-medium text-primary underline underline-offset-2">{t('browseTools')}</Link></p>
            )}
            {!state.activeToolSupported && <p role="alert" className="mt-2 text-xs text-warning">{t('toolUnsupported')}</p>}
            {state.fileGated.length > 0 && <p role="alert" className="mt-2 text-xs text-warning">{t('fileGatedNotice')} {state.fileGated.join(', ')}</p>}
            {state.withheld.length > 0 && <p role="alert" className="mt-2 text-xs text-warning">{t('withheld')} {state.withheld.join(', ')}</p>}
          </Card>
        </div>

        {host.pending.length > 0 && (
          <Card title={`${t('pendingTitle')} (${host.pending.length})`} className="lg:col-span-2 border-primary/50">
            <ul className="divide-y divide-border">
              {host.pending.map((p) => (
                <li key={p.requestId} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <p className="min-w-0 text-sm text-foreground"><span data-no-translate className="font-medium">{p.name}</span> {t('wantsToJoin')}</p>
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary" onClick={() => controller.approve(p.requestId)}><UserCheck size={15} /> {t('approve')}</button>
                    <button type="button" className="btn-ghost" onClick={() => controller.reject(p.requestId)}><UserX size={15} /> {t('reject')}</button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title={`${t('viewersTitle')} (${host.viewers.length}/${host.maxViewers})`} className="lg:col-span-2">
          {host.viewers.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Users size={15} aria-hidden="true" /> {t('noViewers')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {host.viewers.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${v.connected ? 'bg-success' : 'bg-warning animate-pulse'}`} aria-hidden="true" />
                    <span data-no-translate className="truncate text-sm font-medium text-foreground">{v.name}</span>
                    <span className="text-xs text-muted-foreground">{v.connected ? t('viewerConnected') : t('viewerReconnecting')}</span>
                  </div>
                  <button type="button" className="btn-ghost" onClick={() => controller.kick(v.id)}><X size={15} /> {t('remove')}</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <PrivacyNotice className="mt-4" />
    </Shell>
  );
}

function errorText(code: string | undefined, t: (k: LsKey) => string): string {
  switch (code) {
    case 'RATE_LIMITED': return t('errRateLimited');
    case 'SERVER_BUSY': return t('errBusy');
    default: return t('errGeneric');
  }
}

function Shell({ crumbs, title, action, children }: { crumbs: Array<{ label: string; href?: string }>; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page-container pb-20 pt-10">
      <PageHeader crumbs={crumbs} title={title} action={action} />
      {children}
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mb-4 rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">{children}</p>;
}
