'use client';
import React from 'react';
import Link from 'next/link';
import {
  Braces, FileCode2, Code2, Palette, Database, AlignLeft, FileText,
  GitCompare, FileDiff, Code, QrCode, ShieldCheck, ScanLine,
  ImageIcon, Minimize2, PenTool, Fingerprint, Hash, Key, Files,
  Link2, SearchCode, Clock, Sparkles, FileCode, Terminal, TableProperties,
  ArrowRight, Star, Zap, Heart
} from 'lucide-react';
import { useFavorites } from '@/lib/favorites';
import { Tool, CATEGORY_COLORS, CATEGORIES, getToolPath } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

const ICON_MAP: Record<string, React.ElementType> = {
  Braces, FileCode2, Code2, Palette, Database, AlignLeft, FileText, Files,
  GitCompare, FileDiff, Code, QrCode, ShieldCheck, ScanLine,
  ImageIcon, Minimize2, PenTool, Fingerprint, Hash, Key,
  Link2, SearchCode, Clock, Sparkles, FileCode, Terminal, TableProperties,
};

export default function ToolCard({ tool }: { tool: Tool }) {
  const { locale, t } = useLocale();
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(tool.id);
  const colors = CATEGORY_COLORS[tool.category];
  const IconComponent = ICON_MAP[tool.icon] || Braces;
  const category = CATEGORIES.find((item) => item.id === tool.category);
  const categoryLabel = category ? getCategoryName(category.id, category.label, locale) : tool.category;

  return (
    <div className="group relative h-full">
    <Link
      href={getToolPath(tool)}
      className="surface-hover relative flex h-full min-h-44 flex-col gap-3 rounded-xl border border-border bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${t('open')} ${getToolName(tool.id, tool.name, locale)}`}
    >
      {/* Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${colors.bg} ${colors.border}`}>
          <IconComponent size={17} className={colors.text} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end pr-9">
          {tool.popular && (
            <span className="tool-category-badge bg-warning/10 text-warning border border-warning/30 flex items-center gap-1">
              <Star size={8} />
              {t('popular')}
            </span>
          )}
          {tool.isNew && (
            <span className="tool-category-badge bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Zap size={8} />
              {t('new')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="mb-1.5 text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
          {getToolName(tool.id, tool.name, locale)}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {getToolDescription(tool.id, tool.description, locale)}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className={`tool-category-badge border ${colors.bg} ${colors.text} ${colors.border}`}>
          {categoryLabel}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 group-hover:text-primary">
          {t('open')}
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-150" />
        </span>
      </div>
    </Link>
    <button
      type="button"
      onClick={() => toggle(tool.id)}
      aria-pressed={favorite}
      aria-label={`${favorite ? (locale === 'kh' ? 'ដកចេញពីចំណូលចិត្ត' : 'Remove from favorites') : (locale === 'kh' ? 'បន្ថែមទៅចំណូលចិត្ត' : 'Add to favorites')}: ${getToolName(tool.id, tool.name, locale)}`}
      title={favorite ? 'Remove from favorites' : 'Add to favorites'}
      className="btn-icon absolute right-3 top-3"
    >
      <Heart size={16} className={favorite ? 'fill-primary text-primary' : ''} />
    </button>
    </div>
  );
}
