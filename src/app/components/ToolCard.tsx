'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import ToolIcon from '@/components/ui/ToolIcon';
import { useFavoriteAction } from '@/lib/useFavoriteAction';
import { CATEGORIES, getToolPath, type Tool } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

/**
 * The one tool card used across the site (home, all tools, workspace, related
 * tools). The whole card is a link; the favourite toggle sits on top of it as a
 * separate button so both stay keyboard reachable.
 */
export default function ToolCard({ tool, showCategory = true }: { tool: Tool; showCategory?: boolean }) {
  const { locale, t } = useLocale();
  const { isFavorite, toggleWithFeedback } = useFavoriteAction();
  const favorite = isFavorite(tool.id);
  const name = getToolName(tool.id, tool.name, locale);
  const category = CATEGORIES.find((item) => item.id === tool.category);
  const favoriteLabel = favorite ? t('removeFromFavorites') : t('addToFavorites');

  return (
    <div className="group relative h-full">
      <Link
        href={getToolPath(tool)}
        className="surface-hover flex h-full min-h-[11.5rem] flex-col rounded-2xl border border-border bg-card p-5 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-start gap-3 pr-8">
          <ToolIcon tool={tool} size="md" />
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-2">
            {tool.popular && <span className="tool-category-badge border border-warning/30 bg-warning/10 text-warning">{t('popular')}</span>}
            {tool.isNew && <span className="tool-category-badge border border-primary/20 bg-primary/10 text-primary">{t('new')}</span>}
          </div>
        </div>
        <h3 className="mt-4 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">{name}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {getToolDescription(tool.id, tool.description, locale)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">
            {showCategory && category ? getCategoryName(category.id, category.label, locale) : ''}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
            {t('open')}
            <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggleWithFeedback(tool.id, name)}
        aria-pressed={favorite}
        aria-label={`${t('favorite')}: ${name}`}
        title={favoriteLabel}
        className="btn-icon absolute right-3 top-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart size={16} className={favorite ? 'fill-primary text-primary' : ''} aria-hidden="true" />
      </button>
    </div>
  );
}
