'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, SearchX } from 'lucide-react';
import ToolCard from '@/app/components/ToolCard';
import { TOOLS } from '@/data/tools';
import { useLocale } from '@/i18n/LocaleProvider';

const POPULAR = TOOLS.filter((tool) => tool.popular).slice(0, 4);

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="page-container py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
          <SearchX size={26} aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{t('notFoundTitle')}</h1>
        <p className="mt-3 text-muted-foreground">{t('notFoundBody')}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => window.history.back()} className="btn-ghost">
            <ArrowLeft size={15} aria-hidden="true" /> {t('goBack')}
          </button>
          <Link href="/" className="btn-primary">
            <Home size={15} aria-hidden="true" /> {t('backHome')}
          </Link>
        </div>
      </div>
      <section className="mt-16" aria-labelledby="not-found-popular">
        <h2 id="not-found-popular" className="section-title mb-4">{t('popularTools')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      </section>
    </div>
  );
}
