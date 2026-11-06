'use client';
import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n/LocaleProvider';

export default function SiteFooter() {
  const { locale, t } = useLocale();
  const kh = locale === 'kh';
  const links = [
    { href: '/about', label: kh ? 'អំពី DLTools' : 'About DLTools' },
    { href: '/privacy', label: kh ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy' },
    { href: '/terms', label: kh ? 'លក្ខខណ្ឌសេវា' : 'Terms of Service' },
    { href: '/feedback', label: kh ? 'មតិកែលម្អ' : 'Feedback' },
    { href: '/contact', label: kh ? 'ទំនាក់ទំនង' : 'Contact' },
  ];
  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 xl:px-10 2xl:px-16">
        <div>
          <p className="text-sm font-semibold text-foreground">DLTools</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('clientTools')}</p>
        </div>
        <nav aria-label={kh ? 'បាតទំព័រ' : 'Footer'} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-primary">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
