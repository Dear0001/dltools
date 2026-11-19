'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, LogIn, Radio, Share2, Square, UserCheck, UserX, X } from 'lucide-react';
import ActionButton from '@/components/ui/ActionButton';
import { getAvailability, useHost, useIsClient } from '@/lib/live-share/react';
import { Countdown, PrivacyNotice, useLs } from './shared';
import PairingQr from './PairingQr';

type Mode = 'host' | 'join';

/**
 * The single Share entry point shown in every tool's header. It is a thin shell over the existing Live Share
 * host controller (secure pairing, host approval, rate limits) — it adds no new transport or tool UI.
 * Joining hands the code to the existing viewer flow, which renders the real tool workspace.
 */
export default function ShareDialog({ toolSupported = true }: { toolSupported?: boolean }) {
  const { t } = useLs();
  const ready = useIsClient();
  const { controller, state } = useHost();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('host');
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const coolTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const availability = React.useSyncExternalStore(() => () => {}, getAvailability, () => 'ok' as const);
  const host = state.host;
  const active = state.phase === 'active' && host;
  const viewerCount = host?.viewers.filter((v) => v.connected).length ?? 0;

  // Open the socket before "Start sharing" is clicked so the code appears after one round trip, not a full handshake.
  const warm = () => {
    if (!controller) return;
    controller.warmUp();
    clearTimeout(coolTimer.current);
    if (!open) coolTimer.current = setTimeout(() => controller.cool(), 20_000); // hovered but never opened
  };
  useEffect(() => {
    if (!open || !controller) return;
    clearTimeout(coolTimer.current);
    controller.warmUp();
    return () => controller.cool(); // no-op while a session is starting or active
  }, [open, controller]);
  useEffect(() => () => clearTimeout(coolTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])') ?? []);
    focusables()[1]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      else if (e.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const unavailable = ready && (!controller || availability !== 'ok');
  const statusText = active
    ? viewerCount === 0 ? t('waitingForDevice') : viewerCount === 1 ? t('sharingWithOne') : t('sharingWithMany').replace('{n}', String(viewerCount))
    : '';

  const copyCode = async () => {
    if (!host?.code) return;
    try { await navigator.clipboard.writeText(host.code); setCopied(true); } catch { window.alert(t('copyFailed')); }
  };
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length < 6) { setJoinError(t('shareCodeInvalid')); return; }
    setOpen(false);
    router.push(`/live-share/join?code=${encodeURIComponent(clean)}&join=1`);
  };

  return (
    <>
      <ActionButton
        ref={triggerRef}
        icon={active ? Radio : Share2}
        iconClassName={active ? 'text-success' : ''}
        label={active && ready ? statusText : t('shareButton')}
        tooltip={t('shareButtonTip')}
        aria-haspopup="dialog"
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius)] border border-border bg-card p-5 shadow-card sm:rounded-[var(--radius)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="share-dialog-title" className="text-base font-semibold text-foreground">{t('shareDialogTitle')}</h2>
              <button type="button" className="btn-ghost -mr-2 -mt-1 px-2" aria-label={t('shareClose')} onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
              {(['host', 'join'] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                  className={`rounded-md px-3 py-1.5 ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {m === 'host' ? t('shareModeHost') : t('shareModeJoin')}
                </button>
              ))}
            </div>

            {unavailable && <p role="alert" className="mb-3 rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">{availability === 'insecure' ? t('insecureUrl') : t('shareUnavailable')}</p>}

            {mode === 'host' ? (
              <div>
                {!active && state.phase !== 'starting' && (
                  <>
                    <p className="mb-3 text-sm text-muted-foreground">{t('shareStartBody')}</p>
                    {state.phase === 'error' && <p role="alert" className="mb-3 text-sm text-error">{t('errGeneric')}</p>}
                    {state.phase === 'ended' && <p role="status" className="mb-3 text-sm text-muted-foreground">{t('endedHostEnded')}</p>}
                    <button type="button" className="btn-primary w-full justify-center" disabled={unavailable || !controller} onClick={() => controller?.start()}>
                      <Share2 size={15} /> {t('startSharing')}
                    </button>
                  </>
                )}
                {!active && state.phase === 'starting' && (
                  <p role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />{t('starting')}
                  </p>
                )}
                {active && host && controller && (
                  <div className="space-y-4">
                    {host.code ? (
                      <div className="flex flex-col items-center gap-3">
                        <PairingQr code={host.code} size={152} />
                        <p data-no-translate className="select-all whitespace-nowrap font-mono text-3xl font-semibold tracking-[0.12em] text-foreground">{host.code}</p>
                        <p className="text-xs text-muted-foreground">{t('codeExpiresIn')} <Countdown until={host.pairingExpiresAt} /></p>
                        <button type="button" className="btn-ghost" onClick={() => void copyCode()}>
                          {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />} {copied ? t('copied') : t('copyCode')}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('codeExpired')}</p>
                        <button type="button" className="btn-primary mt-3" onClick={() => controller.refreshCode()}>{t('newCode')}</button>
                      </div>
                    )}
                    <p role="status" className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                      <span className={`h-2 w-2 rounded-full ${viewerCount ? 'bg-success' : 'bg-warning animate-pulse'}`} aria-hidden="true" />{statusText}
                    </p>
                    {state.connection !== 'open' && <p role="status" className="text-center text-xs text-warning">{t('statusReconnecting')}</p>}
                    {!toolSupported && <p role="alert" className="text-xs text-warning">{t('toolUnsupported')}</p>}
                    {state.fileGated.length > 0 && <p role="alert" className="text-xs text-warning">{t('fileGatedNotice')} {state.fileGated.join(', ')}</p>}
                    {state.withheld.length > 0 && <p role="alert" className="text-xs text-warning">{t('withheld')} {state.withheld.join(', ')}</p>}
                    {host.pending.map((p) => (
                      <div key={p.requestId} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-primary/50 p-3">
                        <p className="min-w-0 text-sm"><span data-no-translate className="font-medium">{p.name}</span> {t('wantsToJoin')}</p>
                        <div className="flex gap-2">
                          <button type="button" className="btn-primary" onClick={() => controller.approve(p.requestId)}><UserCheck size={15} /> {t('approve')}</button>
                          <button type="button" className="btn-ghost" onClick={() => controller.reject(p.requestId)}><UserX size={15} /> {t('reject')}</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href="/live-share/host" className="text-xs font-medium text-primary underline underline-offset-2" onClick={() => setOpen(false)}>{t('shareMoreControls')}</Link>
                      <button type="button" className="btn-ghost text-error" onClick={() => controller.end()}><Square size={15} /> {t('endSharing')}</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={join} className="space-y-3" noValidate>
                <p className="text-sm text-muted-foreground">{t('shareJoinBody')}</p>
                <div>
                  <label className="field-label" htmlFor="share-join-code">{t('codeLabel')}</label>
                  <input id="share-join-code" data-no-translate className="input-field font-mono text-lg uppercase tracking-[0.2em]" value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 16)); setJoinError(''); }}
                    placeholder={t('codePlaceholder')} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                    aria-invalid={Boolean(joinError)} aria-describedby={joinError ? 'share-join-error' : undefined} disabled={unavailable} />
                </div>
                {joinError && <p id="share-join-error" role="alert" className="text-sm text-error">{joinError}</p>}
                <button type="submit" className="btn-primary w-full justify-center" disabled={unavailable}><LogIn size={15} /> {t('joinSessionBtn')}</button>
              </form>
            )}
            <PrivacyNotice className="mt-4" />
          </div>
        </div>
      )}
    </>
  );
}
