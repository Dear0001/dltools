'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

export interface Crumb {
  label: string;
  href?: string;
}

/** Drops empty labels and consecutive duplicates so the ordered list never has blank or repeated entries. */
export function normalizeCrumbs(items: Crumb[]): Crumb[] {
  return items
    .map((item) => ({ ...item, label: item.label.trim() }))
    .filter((item, index, all) => item.label !== '' && (index === 0 || item.label !== all[index - 1].label));
}

const crumbLink =
  'rounded-sm underline-offset-2 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Home › … › current page, used on every page including tool pages.
 * Each <li> is one real step; separators are decorative icons inside the item,
 * so the ordered list is numbered 1..n with no empty entries.
 */
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  const { t } = useLocale();
  const trail: Crumb[] = [{ label: t('home'), href: '/' }, ...normalizeCrumbs(items)];
  return (
    <nav aria-label={t('breadcrumb')} className={`min-w-0 text-xs text-muted-foreground ${className}`}>
      <ol role="list" className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5">
        {trail.map((item, index) => {
          const first = index === 0;
          const last = index === trail.length - 1;
          return (
            <li key={`${index}-${item.label}`} className={`inline-flex min-w-0 items-center gap-1 ${last ? 'max-w-full' : 'shrink-0'}`}>
              {!first && <ChevronRight size={12} className="shrink-0 opacity-60" aria-hidden="true" />}
              {last ? (
                <span aria-current="page" title={item.label} className="min-w-0 truncate font-medium text-foreground">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link href={item.href} className={`inline-flex items-center gap-1 ${crumbLink}`}>
                  {first && <Home size={13} aria-hidden="true" />}
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Standard header for non-tool pages: breadcrumb, title, optional description and action. */
export default function PageHeader({
  crumbs,
  title,
  description,
  action,
}: {
  crumbs: Crumb[];
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { locale } = useLocale();
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Breadcrumbs items={crumbs} className="mb-3" />
        <h1 className={`font-semibold text-foreground ${locale === 'kh' ? 'text-2xl leading-snug sm:text-3xl sm:leading-snug' : 'text-3xl tracking-tight'}`}>{title}</h1>
        {description && <p className={`mt-2 max-w-2xl text-muted-foreground ${locale === 'kh' ? 'leading-7' : ''}`}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
