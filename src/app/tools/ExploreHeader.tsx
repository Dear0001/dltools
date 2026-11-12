'use client';
import React from 'react';
import PageHeader from '@/components/PageHeader';
import { TOOLS } from '@/data/tools';
import { fill, useLocale } from '@/i18n/LocaleProvider';

export default function ExploreHeader() {
  const { t } = useLocale();
  return <PageHeader crumbs={[{ label: t('navAllTools') }]} title={t('exploreTitle')} description={fill(t('exploreHelp'), { n: TOOLS.length })} />;
}
