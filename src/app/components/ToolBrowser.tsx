'use client';
import React, { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SearchX, X } from 'lucide-react';
import ToolCard from './ToolCard';
import EmptyState from '@/components/ui/EmptyState';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { CATEGORIES, CATEGORY_COUNTS, TOOLS, type ToolCategory } from '@/data/tools';
import { fill, getCategoryName, useLocale } from '@/i18n/LocaleProvider';
import { searchTools } from '@/lib/searchTools';

type SortMode = 'popular' | 'az';

function ToolBrowserInner({ idPrefix }: { idPrefix: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const catParam = searchParams.get('cat');
  const active: ToolCategory | 'all' = CATEGORIES.some((c) => c.id === catParam) ? (catParam as ToolCategory) : 'all';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('popular');

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === 'all') params.delete('cat');
    else params.set('cat', cat);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const results = useMemo(() => {
    const scoped = active === 'all' ? TOOLS : TOOLS.filter((tool) => tool.category === active);
    const matched = searchTools(query, locale, scoped);
    if (sort === 'az') return [...matched].sort((a, b) => a.name.localeCompare(b.name));
    // With a query, keep relevance order; otherwise popular tools first, in catalogue order.
    if (query.trim()) return matched;
    return [...matched].sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)));
  }, [active, query, sort, locale]);

  // When a category filter hides matches, say how many exist elsewhere so the user can widen the search.
  const otherMatches = useMemo(
    () => (active !== 'all' && query.trim() && results.length === 0 ? searchTools(query, locale).length : 0),
    [active, query, results.length, locale],
  );

  const chip = (isActive: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
    }`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={`${idPrefix}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('browseSearchPlaceholder')}
            aria-label={t('searchDialogTitle')}
            className="search-input h-11 !pr-10 text-sm"
            autoComplete="off"
          />
          {query && (
            <button type="button" className="btn-icon absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label={t('clearSearch')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{t('sortLabel')}</span>
          <select className="select-input h-11 min-w-36 flex-1 sm:flex-none" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="popular">{t('sortPopular')}</option>
            <option value="az">{t('sortAz')}</option>
          </select>
        </label>
      </div>

      <div role="group" aria-label={t('filterByCategory')} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button type="button" onClick={() => setCategory('all')} aria-pressed={active === 'all'} className={chip(active === 'all')}>
          {t('all')} <span className="tabular-nums opacity-70">{TOOLS.length}</span>
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} aria-pressed={active === cat.id} className={chip(active === cat.id)}>
            <CategoryIcon name={cat.icon} size={14} />
            {getCategoryName(cat.id, cat.label, locale)}
            <span className="tabular-nums opacity-70">{CATEGORY_COUNTS[cat.id]}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {results.length === 1 ? t('showingOneTool') : fill(t('showingTools'), { n: results.length })}
      </p>

      <div className="mt-3">
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} />}
            title={t('noToolsMatch')}
            description={otherMatches > 0 ? fill(t('matchesInOtherCategories'), { n: otherMatches }) : t('noToolsMatchHelp')}
            action={
              otherMatches > 0 ? (
                <button type="button" className="btn-primary" onClick={() => setCategory('all')}>
                  {t('searchAllCategories')}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => { setQuery(''); setCategory('all'); }}>
                  {t('clearFilters')}
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((tool) => <ToolCard key={tool.id} tool={tool} showCategory={active === 'all'} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToolBrowser({ idPrefix = 'browse' }: { idPrefix?: string }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />}>
      <ToolBrowserInner idPrefix={idPrefix} />
    </Suspense>
  );
}
