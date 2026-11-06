'use client';
import React from 'react';
import { TOOLS } from '@/data/tools';
import { useLocale } from '@/i18n/LocaleProvider';

export default function ExploreHeader() {
  const { locale } = useLocale();
  const kh = locale === 'kh';
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{kh ? 'ស្វែងរកឧបករណ៍' : 'Explore Tools'}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {kh ? `ឧបករណ៍ ${TOOLS.length} សម្រាប់ការងារប្រចាំថ្ងៃរបស់អ្នក។` : `${TOOLS.length} free tools for everyday development and document work. Search by name or by what you want to do.`}
      </p>
    </header>
  );
}
