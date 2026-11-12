'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import HeroSearch from './components/HeroSearch';
import HeroIllustration from './components/HeroIllustration';
import ToolCard from './components/ToolCard';
import ToolBrowser from './components/ToolBrowser';
import RecentTools from './components/RecentTools';
import SeoContent from './components/SeoContent';
import Toast from '@/components/ui/Toast';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { TOOLS, CATEGORIES, CATEGORY_COUNTS, getToolPath, getToolsByCategory } from '@/data/tools';
import { getCategoryDescription, getCategoryName, getToolName, useLocale } from '@/i18n/LocaleProvider';

const POPULAR = TOOLS.filter((tool) => tool.popular).slice(0, 8);

function SectionHeader({ id, title, description, action }: { id: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="section-title">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  const { t, locale } = useLocale();
  const kh = locale === 'kh';

  const viewAll = (
    <Link href="/tools" className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {t('viewAll')} <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );

  return (
    <>
      <Toast />

      {/* 1. Hero */}
      <section className="border-b border-border" aria-labelledby="hero-heading">
        <div className="page-container grid grid-cols-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20">
          <div className="landing-section-enter flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck size={14} className="text-success" aria-hidden="true" />
              {t('heroBadge')}
            </span>
            <h1
              id="hero-heading"
              className={`mt-5 text-balance font-semibold text-foreground ${kh ? 'text-3xl leading-[1.45] sm:text-4xl sm:leading-[1.45]' : 'text-4xl leading-[1.1] tracking-tight sm:text-5xl'}`}
            >
              {t('heroFirstLine')} <span className="text-primary">{t('heroSecondLine')}</span>
            </h1>
            <p className={`mt-4 max-w-xl text-muted-foreground ${kh ? 'text-base leading-8' : 'text-base leading-7 sm:text-lg'}`}>
              {t('heroDescription')}
            </p>

            <div className="mt-8 w-full max-w-xl">
              <HeroSearch />
            </div>

            <div className="mt-4 flex max-w-xl flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="text-xs font-medium text-muted-foreground">{t('popular')}:</span>
              {POPULAR.slice(0, 5).map((tool) => (
                <Link
                  key={`hero-popular-${tool.id}`}
                  href={getToolPath(tool)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {getToolName(tool.id, tool.name, locale)}
                </Link>
              ))}
            </div>

            <dl className="mt-8 grid w-full max-w-md grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card text-center">
              {[
                { value: TOOLS.length, label: t('statTools') },
                { value: CATEGORIES.length, label: t('statCategories') },
                { value: 2, label: t('statLanguages') },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse px-3 py-3">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="text-xl font-semibold text-foreground tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroIllustration className="mx-auto hidden w-full max-w-lg lg:block" />
        </div>
      </section>

      <div className="page-container pb-16">
        {/* 2. Recently used */}
        <section aria-label={t('recentTools')}>
          <RecentTools hideWhenEmpty className="pt-10" />
        </section>

        {/* 3. Popular tools */}
        <section className="pt-10" aria-labelledby="popular-heading">
          <SectionHeader id="popular-heading" title={t('popularTools')} description={t('popularHelp')} action={viewAll} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {POPULAR.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        </section>

        {/* 4. Categories */}
        <section className="pt-14" aria-labelledby="categories-heading">
          <SectionHeader id="categories-heading" title={t('categoriesTitle')} description={t('categoriesHelp')} />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const sample = getToolsByCategory(cat.id).slice(0, 3);
              return (
                <li key={cat.id}>
                  <Link
                    href={`/tools?cat=${cat.id}`}
                    className="surface-hover group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <CategoryIcon name={cat.icon} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-foreground group-hover:text-primary">{getCategoryName(cat.id, cat.label, locale)}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">{CATEGORY_COUNTS[cat.id]} {t('tools')}</span>
                      </span>
                      <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{getCategoryDescription(cat.id, cat.description, locale)}</p>
                    <p className="mt-3 truncate border-t border-border pt-3 text-xs text-muted-foreground">
                      {sample.map((tool) => getToolName(tool.id, tool.name, locale)).join(' · ')}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 5. All tools */}
        <section className="pt-14" aria-labelledby="browse-tools-heading">
          <SectionHeader id="browse-tools-heading" title={t('browseTools')} description={t('browseHelp')} />
          <ToolBrowser idPrefix="home" />
        </section>

        <SeoContent />
      </div>
    </>
  );
}
