'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { fill, translateText, useLocale } from '@/i18n/LocaleProvider';

export default function ExploreHeader() {
  const { locale, t } = useLocale();
  return (
    <header className="mb-8">
      <nav aria-label={translateText('Breadcrumb', locale)} className="mb-3 text-xs text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li><Link href="/" className="inline-flex items-center gap-1 hover:text-primary"><Home size={13} aria-hidden="true" /> {t('home')}</Link></li>
          <li aria-hidden="true"><ChevronRight size={12} /></li>
          <li aria-current="page" className="font-medium text-foreground">{t('navAllTools')}</li>
        </ol>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('exploreTitle')}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{fill(t('exploreHelp'), { n: TOOLS.length })}</p>
    </header>
  );
}
