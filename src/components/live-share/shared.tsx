'use client';
import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import type { ConnectionStatus } from '@/lib/live-share/connection';
import { ls, type LsKey } from './messages';

export function useLs() {
  const { locale } = useLocale();
  return { locale, t: (key: LsKey) => ls(locale, key) };
}

/** The mandatory privacy notice, shown wherever sharing starts or is managed. */
export function PrivacyNotice({ className = '' }: { className?: string }) {
  const { t } = useLs();
  return (
    <p role="note" className={`flex items-start gap-2 rounded-[var(--radius)] border border-border bg-background-secondary px-3 py-2.5 text-xs leading-relaxed text-muted-foreground ${className}`}>
      <ShieldAlert size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <span>{t('notice')}</span>
    </p>
  );
}

const STATUS_STYLE: Record<ConnectionStatus, { key: LsKey; dot: string }> = {
  open: { key: 'statusOpen', dot: 'bg-success' },
  connecting: { key: 'statusConnecting', dot: 'bg-warning animate-pulse' },
  reconnecting: { key: 'statusReconnecting', dot: 'bg-warning animate-pulse' },
  closed: { key: 'statusClosed', dot: 'bg-error' },
  idle: { key: 'statusIdle', dot: 'bg-muted-foreground' },
};

/** Honest connection indicator: "Connected" only while the socket is actually open. */
export function ConnectionBadge({ status, latencyMs }: { status: ConnectionStatus; latencyMs: number | null }) {
  const { t } = useLs();
  const s = STATUS_STYLE[status];
  return (
    <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="font-medium text-foreground">{t(s.key)}</span>
      {status === 'open' && latencyMs !== null && <span data-no-translate>· {t('latency')} {latencyMs} ms</span>}
    </span>
  );
}

/** mm:ss / h:mm:ss countdown. Re-renders once a second, only while mounted. */
export function Countdown({ until }: { until: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (until === null) return <span data-no-translate>—</span>;
  const total = Math.max(0, Math.round((until - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const text = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  return <span data-no-translate className="font-mono tabular-nums">{text}</span>;
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--radius)] border border-border bg-card p-4 shadow-card sm:p-5 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>}
      {children}
    </section>
  );
}
