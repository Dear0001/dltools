'use client';
import React from 'react';
import Link from 'next/link';
import { Radio } from 'lucide-react';
import { useHost } from '@/lib/live-share/react';
import { useLs } from './shared';

/** Shown on tool pages while this tab is hosting, so the host can always see (and stop) sharing. */
export default function LiveShareBadge() {
  const { t } = useLs();
  const { state } = useHost();
  if (state.phase !== 'active' || !state.host) return null;
  const paused = state.host.paused;
  const offline = state.connection !== 'open';
  return (
    <>
    <Link
      href="/live-share/host"
      className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${paused || offline ? 'border-warning/50 bg-warning/10 text-foreground' : 'border-success/50 bg-success/10 text-foreground'}`}
    >
      <Radio size={15} className={paused || offline ? 'text-warning' : 'animate-pulse text-success'} aria-hidden="true" />
      <span>{offline ? t('statusReconnecting') : paused ? t('badgePaused') : `${t('badgeSharing')} · ${state.host.viewers.length}`}</span>
      <span className="text-xs text-muted-foreground">{t('badgeManage')}</span>
    </Link>
    {state.fileGated.length > 0 && (
      <p role="alert" className="col-span-2 text-xs text-warning sm:basis-full">{t('fileGatedNotice')} {state.fileGated.join(', ')}</p>
    )}
    {state.withheld.length > 0 && (
      <p role="alert" className="col-span-2 text-xs text-warning sm:basis-full">{t('withheld')} {state.withheld.join(', ')}</p>
    )}
    </>
  );
}
