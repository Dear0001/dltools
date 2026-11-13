'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader, { type Crumb } from '@/components/PageHeader';
import { CATEGORIES, TOOLS } from '@/data/tools';
import { fill, getCategoryName, useLocale } from '@/i18n/LocaleProvider';

function Header({ categoryId }: { categoryId?: string | null }) {
  const { locale, t } = useLocale();
  const category = CATEGORIES.find((c) => c.id === categoryId);
  // With a category selected the trail is Home › All tools › Category, so "All tools" becomes a link back.
  const crumbs: Crumb[] = category
    ? [{ label: t('navAllTools'), href: '/tools' }, { label: getCategoryName(category.id, category.label, locale) }]
    : [{ label: t('navAllTools') }];
  return <PageHeader crumbs={crumbs} title={t('exploreTitle')} description={fill(t('exploreHelp'), { n: TOOLS.length })} />;
}

function HeaderFromUrl() {
  return <Header categoryId={useSearchParams().get('cat')} />;
}

export default function ExploreHeader() {
  return (
    <Suspense fallback={<Header />}>
      <HeaderFromUrl />
    </Suspense>
  );
}
