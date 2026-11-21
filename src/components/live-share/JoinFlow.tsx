'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getAvailability, useIsClient, useViewer } from '@/lib/live-share/react';
import { Card, ConnectionBadge, PrivacyNotice, useLs } from './shared';
import type { LsKey } from './messages';

const ERROR_KEY: Record<string, LsKey> = {
  INVALID_CODE: 'errInvalidCode', CODE_EXPIRED: 'errCodeExpired', SESSION_NOT_FOUND: 'errNotFound', RATE_LIMITED: 'errRateLimited',
  SESSION_FULL: 'errFull', SERVER_BUSY: 'errBusy',
};
const ENDED_KEY: Record<string, LsKey> = {
  host_ended: 'endedHostEnded', host_disconnected: 'endedHostGone', expired: 'endedExpired', idle: 'endedIdle', server_shutdown: 'endedServer', kicked: 'endedKicked',
};

export default function JoinFlow() {
  const { t } = useLs();
  const params = useSearchParams();
  const { controller, state } = useViewer();
  const ready = useIsClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const availability = React.useSyncExternalStore(() => () => {}, getAvailability, () => 'ok' as const);

  useEffect(() => {
    const fromUrl = params.get('code');
    if (fromUrl) {
      const clean = fromUrl.toUpperCase().slice(0, 16);
      setCode(clean);
      // Coming from the Share dialog: the user already asked to join, so start right away.
      if (params.get('join') === '1' && controller && clean.replace(/[^A-Z0-9]/g, '').length >= 6 && controller.state.phase === 'idle') controller.start(clean, '');
      // Don't leave the pairing code in the address bar, browser history or Referer headers.
      try { window.history.replaceState(null, '', window.location.pathname); } catch { /* non-critical */ }
    }
     
  }, [params, controller]);

  const crumbs = [{ label: t('title'), href: '/live-share' }, { label: t('joinTitle') }];

  if (state.phase === 'ended') {
    return (
      <EndedCard
        message={t(ENDED_KEY[state.endedReason ?? 'host_ended'] ?? 'endedHostEnded')}
        crumbs={crumbs}
        onJoinAnother={() => controller?.leave()}
      />
    );
  }

  if (state.phase === 'joined') {
    // There is no viewer page: the app-level LiveShareSession now navigates this tab to the host's actual route
    // (e.g. /tools/json-formatter) and the real tool page renders the host's state. This is only shown until
    // then, or while the host is on a page that isn't shared.
    return (
      <div className="page-container pb-20 pt-10">
        <PageHeader crumbs={crumbs} title={t('joinTitle')} />
        <div className="max-w-xl">
          <Card>
            <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
              {state.route ? <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" /> : null}
              <p className="text-sm text-muted-foreground">{state.route ? t('followingHost') : state.hostToolUnsupported ? t('unsupportedTool') : t('waitingForTool')}</p>
              <ConnectionBadge status={state.connection} latencyMs={state.latencyMs} />
              <button type="button" className="btn-ghost" onClick={() => controller?.leave()}>{t('leave')}</button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const busy = state.phase === 'connecting' || state.phase === 'pending';
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!controller || busy) return;
    controller.start(code.trim(), name.trim());
  };
  const errorMessage =
    state.phase === 'rejected' ? t(state.rejectedReason === 'timeout' ? 'rejectedTimeout' : 'rejectedTitle')
    : state.error ? t(ERROR_KEY[state.error.code] ?? 'errGeneric')
    : null;
  const unavailable = ready && (!controller || availability !== 'ok');
  const cannotConnect = state.phase === 'connecting' && state.connection === 'reconnecting';

  return (
    <div className="page-container pb-20 pt-10">
      <PageHeader crumbs={crumbs} title={t('joinTitle')} />
      <div className="max-w-xl">
        {unavailable && <p role="alert" className="mb-4 rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-4 py-3 text-sm">{availability === 'insecure' ? t('insecureUrl') : t('notConfigured')}</p>}
        {state.phase === 'pending' ? (
          <Card>
            <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">{t('waitingTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('waitingBody')}</p>
              <ConnectionBadge status={state.connection} latencyMs={state.latencyMs} />
              <button type="button" className="btn-ghost" onClick={() => controller?.leave()}>{t('cancel')}</button>
            </div>
          </Card>
        ) : (
          <Card>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <label className="field-label" htmlFor="ls-code">{t('codeLabel')}</label>
                <input
                  id="ls-code" data-no-translate className="input-field font-mono text-lg uppercase tracking-[0.2em]"
                  value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 16))}
                  placeholder={t('codePlaceholder')} autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text"
                  aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? 'ls-error' : undefined} disabled={unavailable}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ls-name">{t('nameLabel')}</label>
                <input id="ls-name" className="input-field" value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder={t('namePlaceholder')} autoComplete="off" disabled={unavailable} />
              </div>
              {errorMessage && <p id="ls-error" role="alert" className="text-sm text-error">{errorMessage}</p>}
              {state.unreachable ? (
                <p role="alert" className="rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground"><span className="font-semibold">{t('unreachableTitle')}.</span> {t('unreachableBody')}</p>
              ) : cannotConnect && <p role="status" className="text-sm text-muted-foreground">{t('statusReconnecting')}</p>}
              <button type="submit" className="btn-primary w-full justify-center sm:w-auto" disabled={unavailable || busy || code.replace(/[^A-Za-z0-9]/g, '').length < 6}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} {busy ? t('connecting') : t('join')}
              </button>
            </form>
          </Card>
        )}
        <PrivacyNotice className="mt-4" />
      </div>
    </div>
  );
}

/** Shown when a session ends for any reason. The viewer is returned to the tool list after a few seconds. */
function EndedCard({ message, crumbs, onJoinAnother }: { message: string; crumbs: Array<{ label: string; href?: string }>; onJoinAnother: () => void }) {
  const { t } = useLs();
  const router = useRouter();
  const [left, setLeft] = useState(10);
  useEffect(() => {
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left <= 0) router.push('/tools');
  }, [left, router]);
  return (
    <div className="page-container pb-20 pt-10">
      <PageHeader crumbs={crumbs} title={t('sessionEndedTitle')} />
      <div className="max-w-xl">
        <Card>
          <p role="alert" className="text-sm text-foreground">{message}</p>
          <p role="status" className="mt-2 text-xs text-muted-foreground">{t('redirecting')} <span data-no-translate className="font-mono tabular-nums">{Math.max(0, left)}</span></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/tools" className="btn-primary">{t('endedBackToTools')}</Link>
            <button type="button" className="btn-ghost" onClick={onJoinAnother}>{t('joinAnother')}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
