'use client';
import React from 'react';
import Link from 'next/link';
import { Globe2, ShieldCheck } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { CATEGORIES, CATEGORY_COUNTS, TOOLS } from '@/data/tools';
import { PRIVACY_COUNTS } from '@/data/toolPrivacy';
import { fill, getCategoryName, useLocale } from '@/i18n/LocaleProvider';

const GITHUB_URL = 'https://github.com/Dear0001';

export default function SiteFooter() {
  const { locale, t } = useLocale();
  const year = new Date().getFullYear();

  const productLinks = [
    { href: '/tools', label: t('navAllTools') },
    { href: '/tool-workspace', label: t('navWorkspace') },
    { href: '/favorites', label: t('favorites') },
    { href: GITHUB_URL, label: t('sourceCode'), external: true },
  ];
  const companyLinks = [
    { href: '/about', label: t('aboutLink') },
    { href: '/feedback', label: t('feedbackLink') },
    { href: '/contact', label: t('contactLink') },
    { href: '/privacy', label: t('privacyLink') },
    { href: '/terms', label: t('termsLink') },
  ];

  const heading = 'mb-3 text-sm font-semibold text-foreground';
  const link = 'text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary focus-visible:underline';

  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="page-container grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo size={32} className="overflow-hidden rounded-lg border border-border" />
            <span className="text-base font-semibold text-foreground">DLTools</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{t('brandTagline')}</p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              <span>
                {fill(t('footerPrivacy'), PRIVACY_COUNTS)}{' '}
                <Link href="/privacy" className="text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('privacyDetails')}</Link>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Globe2 size={15} className="text-primary" aria-hidden="true" /> {t('footerLanguages')}
            </li>
          </ul>
        </div>

        <nav aria-label={t('footerCategories')} className="md:col-span-4">
          <h2 className={heading}>{t('footerCategories')}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link href={`/tools?cat=${category.id}`} className={link}>
                  {getCategoryName(category.id, category.label, locale)}
                  <span className="ml-1 text-xs opacity-70 tabular-nums">{CATEGORY_COUNTS[category.id]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('footerProduct')} className="md:col-span-2">
          <h2 className={heading}>{t('footerProduct')}</h2>
          <ul className="space-y-2">
            {productLinks.map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={link}>{item.label}</a>
                ) : (
                  <Link href={item.href} className={link}>{item.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('footerCompany')} className="md:col-span-2">
          <h2 className={heading}>{t('footerCompany')}</h2>
          <ul className="space-y-2">
            {companyLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="page-container flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} DLTools · {TOOLS.length} {t('statTools')}. {t('footerRights')}</p>
          <p>{t('footerMadeIn')}</p>
        </div>
      </div>
    </footer>
  );
}
