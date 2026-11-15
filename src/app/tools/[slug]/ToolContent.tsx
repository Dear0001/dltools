'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ToolCard from '@/app/components/ToolCard';
import { getRelatedTools, getToolSlug, type Tool } from '@/data/tools';
import { getToolContent } from '@/data/toolContent';
import { getToolDetails } from '@/data/toolDetails';
import { getToolContentKh } from '@/data/toolContentKh';
import { fill, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

/** Below the workspace: related tools, then the how-to/about copy for the tool. */
export default function ToolContent({ tool }: { tool: Tool }) {
  const { locale, t } = useLocale();
  const kh = locale === 'kh';
  const slug = getToolSlug(tool);
  const content = (kh ? getToolContentKh(slug) : undefined) ?? getToolContent(slug);
  const details = getToolDetails(slug);
  const related = getRelatedTools(tool, 4);
  const name = getToolName(tool.id, tool.name, locale);

  return (
    <div className="border-t border-border bg-background">
      {related.length > 0 && (
        <section className="page-container py-12" aria-labelledby="related-tools-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="related-tools-heading" className="section-title">{t('relatedTools')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('relatedHelp')}</p>
            </div>
            <Link href={`/categories/${tool.category}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {t('viewAll')} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => <ToolCard key={item.id} tool={item} />)}
          </div>
        </section>
      )}

      <section className="border-t border-border bg-background-secondary" aria-labelledby="tool-about-heading">
        <div className={`mx-auto w-full max-w-3xl px-4 py-12 text-[15px] text-muted-foreground sm:px-6 ${kh ? 'leading-8' : 'leading-7'}`}>
          <h2 id="tool-about-heading" className="section-title">{fill(t('aboutTool'), { name })}</h2>
          <p className="mt-3">{content?.about ?? getToolDescription(tool.id, tool.description, locale)}</p>

          {content && (
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-foreground">{t('howToUse')}</h3>
                {/*
                  The browser's own list marker is the only number. Step text must not start with a number,
                  and no numeric badge is rendered, so screen readers, reader mode and copied text show "1. Paste…", never "1. 1 Paste…".
                */}
                <ol className="mt-3 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-primary">
                  {content.steps.map((step, index) => (
                    <li key={index} className="pl-1">{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t('commonUses')}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-primary">
                  {content.uses.map((use, index) => (
                    <li key={index}>{use}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {details && (
            <>
              <div className="mt-8">
                <h3 className="text-base font-semibold text-foreground">What it supports</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-primary">
                  {details.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </div>

              <div className="mt-8" data-no-translate>
                <h3 className="text-base font-semibold text-foreground">Example</h3>
                <p className="mt-2 text-sm">{details.example.note}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Input</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-3 font-mono text-xs text-foreground">{details.example.input}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Output</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-3 font-mono text-xs text-foreground">{details.example.output}</pre>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-base font-semibold text-foreground">Common errors and fixes</h3>
                <dl className="mt-3 space-y-3">
                  {details.errors.map((error) => (
                    <div key={error.problem}>
                      <dt className="font-medium text-foreground">{error.problem}</dt>
                      <dd className="mt-0.5">{error.fix}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}

          <p className="mt-8 text-sm">{fill(t('partOfDltools'), { name })}</p>
        </div>
      </section>
    </div>
  );
}
