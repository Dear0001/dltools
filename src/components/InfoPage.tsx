'use client';
import React from 'react';
import PageHeader from '@/components/PageHeader';
import { useLocale } from '@/i18n/LocaleProvider';

/** Layout for About, Feedback, Contact, Privacy and Terms: same container, breadcrumb and header as other pages. */
export default function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  const kh = useLocale().locale === 'kh';
  return (
    <div className="page-container pb-20 pt-10">
      <article className="max-w-3xl">
        <PageHeader crumbs={[{ label: title }]} title={title} />
        <div className={`space-y-4 text-[15px] text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:!mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:marker:text-primary ${kh ? 'leading-8' : 'leading-7'}`}>
          {children}
        </div>
      </article>
    </div>
  );
}
