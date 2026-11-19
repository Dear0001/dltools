'use client';
import React from 'react';
import Link from 'next/link';
import { Lock, MonitorSmartphone, Radio, ScanLine } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { LIVE_SHARE_TOOLS } from '@/lib/live-share/registry';
import { TOOLS, getToolPath } from '@/data/tools';
import { getToolName } from '@/i18n/LocaleProvider';
import { getAvailability, useIsClient } from '@/lib/live-share/react';
import { Card, PrivacyNotice, useLs } from './shared';

export default function LiveShareLanding() {
  const { t, locale } = useLs();
  const ready = useIsClient();
  const availability = ready ? getAvailability() : 'ok';
  const supported = Object.keys(LIVE_SHARE_TOOLS).map((id) => TOOLS.find((tool) => tool.id === id)).filter(<T,>(x: T | undefined): x is T => Boolean(x));
  const steps = ['how1', 'how2', 'how3', 'how4'] as const;
  const privacy = ['priv1', 'priv2', 'priv3', 'priv4', 'priv5'] as const;
  const disabled = availability !== 'ok';

  return (
    <div className="page-container pb-20 pt-10">
      <PageHeader crumbs={[{ label: t('title') }]} title={t('title')} description={t('tagline')} />
      {disabled && (
        <p role="alert" className="mb-6 rounded-[var(--radius)] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {availability === 'insecure' ? t('insecureUrl') : t('notConfigured')}
        </p>
      )}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/live-share/host" aria-disabled={disabled} className={`btn-primary justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
          <Radio size={16} aria-hidden="true" /> {t('createSession')}
        </Link>
        <Link href="/live-share/join" aria-disabled={disabled} className={`btn-ghost justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
          <ScanLine size={16} aria-hidden="true" /> {t('joinSession')}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('whatTitle')}>
          <p className={`flex gap-3 text-sm text-muted-foreground ${locale === 'kh' ? 'leading-7' : 'leading-relaxed'}`}>
            <MonitorSmartphone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{t('whatBody')}</span>
          </p>
        </Card>
        <Card title={t('howTitle')}>
          <ol className="space-y-2.5 text-sm text-muted-foreground">
            {steps.map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">{i + 1}</span>
                <span className={locale === 'kh' ? 'leading-7' : 'leading-relaxed'}>{t(k)}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title={t('privacyTitle')}>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {privacy.map((k) => (
              <li key={k} className="flex gap-2.5">
                <Lock size={14} className="mt-1 shrink-0 text-success" aria-hidden="true" />
                <span className={locale === 'kh' ? 'leading-7' : 'leading-relaxed'}>{t(k)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('supportedTitle')}>
          <p className="mb-3 text-sm text-muted-foreground">{t('supportedBody')}</p>
          <ul className="flex flex-wrap gap-2">
            {supported.map((tool) => (
              <li key={tool.id}>
                <Link href={getToolPath(tool)} className="inline-flex rounded-full border border-border bg-background-secondary px-3 py-1 text-xs font-medium text-foreground hover:border-primary">
                  {getToolName(tool.id, tool.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <PrivacyNotice className="mt-6" />
    </div>
  );
}
