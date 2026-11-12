'use client';
import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import ToolCard from '@/app/components/ToolCard';
import EmptyState from '@/components/ui/EmptyState';
import { TOOLS } from '@/data/tools';
import { useFavorites } from '@/lib/favorites';
import { useLocale } from '@/i18n/LocaleProvider';

export default function FavoritesView() {
  const { t } = useLocale();
  const { ids, ready } = useFavorites();
  const tools = ids.map((id) => TOOLS.find((tool) => tool.id === id)).filter((tool): tool is (typeof TOOLS)[number] => Boolean(tool));

  return (
    <div className="page-container pb-16 pt-10">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
        <Link href="/tool-workspace" className="hover:text-primary">{t('navWorkspace')}</Link> / <span className="text-foreground">{t('favorites')}</span>
      </nav>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('favorites')}</h1>
        <p className="mt-2 text-muted-foreground">{t('favoritesHelp')}</p>
      </header>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />
      ) : tools.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title={t('favoritesEmptyTitle')}
          description={t('favoritesEmptyBody')}
          action={<Link href="/tools" className="btn-primary">{t('exploreTools')}</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      )}
    </div>
  );
}
