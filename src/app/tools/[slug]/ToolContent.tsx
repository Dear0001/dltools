import React from 'react';
import Link from 'next/link';
import { CATEGORIES, TOOLS, getToolPath, type Tool } from '@/data/tools';
import { getToolContent } from '@/data/toolContent';
import { getToolSlug } from '@/data/tools';

export default function ToolContent({ tool }: { tool: Tool }) {
  const content = getToolContent(getToolSlug(tool));
  const category = CATEGORIES.find((c) => c.id === tool.category);
  const related = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id).slice(0, 6);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 text-sm leading-relaxed text-muted-foreground sm:px-6" aria-labelledby="tool-about-heading">
      <h2 id="tool-about-heading" className="text-xl font-semibold text-foreground">
        About the {tool.name}
      </h2>
      <p className="mt-2">{content?.about ?? tool.description}</p>

      {content && (
        <>
          <h3 className="mt-6 text-base font-semibold text-foreground">How to use it</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h3 className="mt-6 text-base font-semibold text-foreground">Common uses</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {content.uses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-6">
        {tool.name} is part of DLTools, a free set of browser-based developer tools. No installation is required.
      </p>

      {related.length > 0 && (
        <>
          <h3 className="mt-6 text-base font-semibold text-foreground">
            More {category?.label ?? 'related'} tools
          </h3>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {related.map((t) => (
              <li key={t.id}>
                <Link href={getToolPath(t)} className="font-medium text-foreground hover:text-primary">
                  {t.name}
                </Link>
                {' — '}
                {t.description.split('.')[0]}.
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
