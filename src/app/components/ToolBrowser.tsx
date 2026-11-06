'use client';
import React, { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SearchX, X } from 'lucide-react';
import ToolCard from './ToolCard';
import EmptyState from '@/components/ui/EmptyState';
import { CATEGORIES, TOOLS, type ToolCategory } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

type SortMode = 'popular' | 'az';

function ToolBrowserInner({ idPrefix }: { idPrefix: string }) {
  const { locale } = useLocale();
  const kh = locale === 'kh';
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
    const q = query.trim().toLowerCase();
    const list = TOOLS.filter((tool) => {
      if (active !== 'all' && tool.category !== active) return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        getToolName(tool.id, tool.name, locale).toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        getToolDescription(tool.id, tool.description, locale).toLowerCase().includes(q) ||
        tool.tags.some((tag) => tag.includes(q))
      );
    });
    return [...list].sort((a, b) => {
      if (sort === 'popular' && Boolean(b.popular) !== Boolean(a.popular)) return a.popular ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [active, query, sort, locale]);

  const chip = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
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
            placeholder={kh ? 'ស្វែងរកតាមឈ្មោះ ឬមុខងារ…' : 'Search by name or what you want to do…'}
            aria-label={kh ? 'ស្វែងរកឧបករណ៍' : 'Search tools'}
            className="search-input h-11 !pr-10 text-sm"
          />
          {query && (
            <button type="button" className="btn-icon absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label={kh ? 'សម្អាត' : 'Clear search'}>
              <X size={14} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{kh ? 'តម្រៀប' : 'Sort'}</span>
          <select className="select-input h-11 min-w-36" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="popular">{kh ? 'ពេញនិយម' : 'Most popular'}</option>
            <option value="az">{kh ? 'ក → អ / A → Z' : 'A → Z'}</option>
          </select>
        </label>
      </div>

      <div role="group" aria-label={kh ? 'ត្រងតាមប្រភេទ' : 'Filter by category'} className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setCategory('all')} aria-pressed={active === 'all'} className={chip(active === 'all')}>
          {kh ? 'ទាំងអស់' : 'All'} <span className="tabular-nums opacity-70">{TOOLS.length}</span>
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} aria-pressed={active === cat.id} className={chip(active === cat.id)}>
            {getCategoryName(cat.id, cat.label, locale)}{' '}
            <span className="tabular-nums opacity-70">{TOOLS.filter((t) => t.category === cat.id).length}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {kh ? `បង្ហាញ ${results.length} ឧបករណ៍` : `Showing ${results.length} ${results.length === 1 ? 'tool' : 'tools'}`}
      </p>

      <div className="mt-3">
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} />}
            title={kh ? 'រកមិនឃើញឧបករណ៍' : 'No tools match your search'}
            description={kh ? 'សាកល្បងពាក្យផ្សេង ឬលុបតម្រង។' : 'Try a different word, or clear the filters.'}
            action={
              <button type="button" className="btn-primary" onClick={() => { setQuery(''); setCategory('all'); }}>
                {kh ? 'សម្អាតតម្រង' : 'Clear filters'}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToolBrowser({ idPrefix = 'browse' }: { idPrefix?: string }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/50" aria-hidden="true" />}>
      <ToolBrowserInner idPrefix={idPrefix} />
    </Suspense>
  );
}
