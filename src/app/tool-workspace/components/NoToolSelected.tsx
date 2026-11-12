'use client';
import React from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import ToolCard from '@/app/components/ToolCard';
import RecentTools from '@/app/components/RecentTools';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/PageHeader';
import { TOOLS } from '@/data/tools';
import { useFavorites } from '@/lib/favorites';
import { useLocale } from '@/i18n/LocaleProvider';

const POPULAR = TOOLS.filter((t) => t.popular).slice(0, 4);

/** The Workspace page (/tool-workspace): favourites, recently used tools and suggestions. */
export default function NoToolSelected() {
  const { t } = useLocale();
  const { ids, ready } = useFavorites();
  const favorites = ids.map((id) => TOOLS.find((tool) => tool.id === id)).filter((tool): tool is (typeof TOOLS)[number] => Boolean(tool));

  return (
    <div className="page-container pb-16 pt-10">
      <PageHeader
        crumbs={[{ label: t('navWorkspace') }]}
        title={t('workspaceTitle')}
        description={t('workspaceHelp')}
        action={
          <Link href="/tools" className="btn-primary">
            <Search size={15} aria-hidden="true" /> {t('exploreTools')}
          </Link>
        }
      />

      <section aria-labelledby="workspace-favorites" className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Heart size={18} className="text-muted-foreground" aria-hidden="true" />
          <h2 id="workspace-favorites" className="section-title">{t('favorites')}</h2>
        </div>
        {!ready ? (
          <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />
        ) : favorites.length === 0 ? (
          <EmptyState icon={<Heart size={28} />} title={t('favoritesEmptyTitle')} description={t('favoritesEmptyBody')} action={<Link href="/tools" className="btn-ghost">{t('exploreTools')}</Link>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        )}
      </section>

      <section className="mb-12">
        <RecentTools variant="cards" />
      </section>

      <section aria-labelledby="workspace-popular">
        <h2 id="workspace-popular" className="section-title mb-4">{t('popularTools')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {POPULAR.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      </section>
    </div>
  );
}
