'use client';
import React from 'react';
import Link from 'next/link';
import { CATEGORIES, TOOLS, getToolPath, getToolSlug, type Tool } from '@/data/tools';
import { getToolContent } from '@/data/toolContent';
import { getToolContentKh } from '@/data/toolContentKh';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

export default function ToolContent({ tool }: { tool: Tool }) {
  const { locale } = useLocale();
  const kh = locale === 'kh';
  const slug = getToolSlug(tool);
  const content = (kh ? getToolContentKh(slug) : undefined) ?? getToolContent(slug);
  const category = CATEGORIES.find((c) => c.id === tool.category);
  const related = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id).slice(0, 6);
  const name = getToolName(tool.id, tool.name, locale);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 text-sm leading-relaxed text-muted-foreground sm:px-6" aria-labelledby="tool-about-heading">
      <h2 id="tool-about-heading" className="text-xl font-semibold text-foreground">
        {kh ? `អំពី ${name}` : `About the ${tool.name}`}
      </h2>
      <p className="mt-2">{content?.about ?? getToolDescription(tool.id, tool.description, locale)}</p>

      {content && (
        <>
          <h3 className="mt-6 text-base font-semibold text-foreground">{kh ? 'របៀបប្រើ' : 'How to use it'}</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h3 className="mt-6 text-base font-semibold text-foreground">{kh ? 'ការប្រើប្រាស់ទូទៅ' : 'Common uses'}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {content.uses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-6">
        {kh
          ? `${name} គឺជាផ្នែកមួយនៃ DLTools ដែលជាបណ្តុំឧបករណ៍អភិវឌ្ឍន៍ឥតគិតថ្លៃដំណើរការលើ browser។ មិនចាំបាច់ដំឡើងអ្វីទេ។`
          : `${tool.name} is part of DLTools, a free set of browser-based developer tools. No installation is required.`}
      </p>

      {related.length > 0 && (
        <>
          <h3 className="mt-6 text-base font-semibold text-foreground">
            {kh
              ? `ឧបករណ៍ ${category ? getCategoryName(category.id, category.label, locale) : 'ដែលពាក់ព័ន្ធ'} ផ្សេងទៀត`
              : `More ${category?.label ?? 'related'} tools`}
          </h3>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {related.map((t) => (
              <li key={t.id}>
                <Link href={getToolPath(t)} className="font-medium text-foreground hover:text-primary">
                  {getToolName(t.id, t.name, locale)}
                </Link>
                {' — '}
                {getToolDescription(t.id, t.description, locale).split(/[.។]/)[0]}
                {kh ? '។' : '.'}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
