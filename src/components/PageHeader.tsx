'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

export interface Crumb {
  label: string;
  href?: string;
}

/** Home › … › current page. The same breadcrumb trail is used on every page, including tool pages. */
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  const { t } = useLocale();
  return (
    <nav aria-label={t('breadcrumb')} className={`text-xs text-muted-foreground ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="inline-flex items-center gap-1 rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Home size={13} aria-hidden="true" /> {t('home')}
          </Link>
        </li>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-foreground' : undefined}>
                {item.href && !last ? (
                  <Link href={item.href} className="rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.label}</Link>
                ) : (
                  item.label
                )}
              </li>
            </React.Fragment>
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
