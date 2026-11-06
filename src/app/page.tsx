'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import HeroSearch from './components/HeroSearch';
import ToolCard from './components/ToolCard';
import ToolBrowser from './components/ToolBrowser';
import RecentTools from './components/RecentTools';
import SeoContent from './components/SeoContent';
import Toast from '@/components/ui/Toast';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { TOOLS, CATEGORIES, getToolPath } from '@/data/tools';
import { getCategoryName, getToolName, useLocale } from '@/i18n/LocaleProvider';

export default function HomePage() {
  const { t, locale } = useLocale();
  const kh = locale === 'kh';
  const popular = TOOLS.filter((tool) => tool.popular).slice(0, 8);

  return (
    <>
      <Toast />
      <div className="mx-auto w-full max-w-screen-2xl px-4 pb-16 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
        {/* 1. Hero */}
        <section className="landing-section-enter mx-auto flex max-w-3xl flex-col items-center py-12 text-center sm:py-16 lg:py-20" aria-labelledby="hero-heading">
          <h1
            id="hero-heading"
            className={`text-balance font-semibold text-foreground ${kh ? 'text-3xl leading-[1.5] sm:text-4xl' : 'text-4xl leading-[1.1] tracking-tight sm:text-5xl'}`}
          >
            {t('heroFirstLine')} <span className="text-primary">{t('heroSecondLine')}</span>
          </h1>
          <p className={`mt-4 max-w-2xl text-muted-foreground ${kh ? 'text-base leading-8 sm:text-lg' : 'text-base leading-7 sm:text-lg'}`}>
            {t('heroDescription')}
          </p>

          <div className="landing-search-card mt-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-3 text-left sm:p-4">
            <HeroSearch />
            <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">{t('devicePrivacy')}</p>
          </div>

          <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label={t('popular')}>
            <span className="text-xs font-medium text-muted-foreground">{t('popular')}:</span>
            {popular.slice(0, 5).map((tool) => (
              <Link
                key={`hero-popular-${tool.id}`}
                href={getToolPath(tool)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {getToolName(tool.id, tool.name, locale)}
              </Link>
            ))}
          </nav>

          <p className="mt-8 text-xs text-muted-foreground">
            <strong className="font-semibold text-foreground">{TOOLS.length}</strong> {t('tools')} · <strong className="font-semibold text-foreground">{CATEGORIES.length}</strong> {t('collections')}
          </p>
        </section>

        {/* 2. Popular tools */}
        <section className="py-8" aria-labelledby="popular-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="popular-heading" className="text-xl font-semibold tracking-tight text-foreground">{kh ? 'ឧបករណ៍ពេញនិយម' : 'Popular tools'}</h2>
            <Link href="/tools" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {kh ? 'មើលទាំងអស់' : 'View all'} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popular.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        </section>

        {/* 3. Categories */}
        <section className="py-8" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="mb-4 text-xl font-semibold tracking-tight text-foreground">{kh ? 'រកមើលតាមប្រភេទ' : 'Browse categories'}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/tools?cat=${cat.id}`}
                className="surface-hover flex flex-col gap-3 rounded-xl border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CategoryIcon name={cat.icon} size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{getCategoryName(cat.id, cat.label, locale)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {TOOLS.filter((tool) => tool.category === cat.id).length} {t('tools')}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Recently used */}
        <section className="border-y border-border py-7" aria-label={t('recentTools')}>
          <RecentTools />
        </section>

        {/* 5. All tools */}
        <section className="pt-9" aria-labelledby="browse-tools-heading">
          <h2 id="browse-tools-heading" className="mb-1 text-xl font-semibold tracking-tight text-foreground">{t('browseTools')}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{t('browseHelp')}</p>
          <ToolBrowser idPrefix="home" />
        </section>

        <SeoContent />
      </div>
    </>
  );
}
