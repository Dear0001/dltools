import React from 'react';
import Link from 'next/link';
import { CATEGORIES, TOOLS, getToolPath } from '@/data/tools';

const FAQ = [
  {
    q: 'Is DLTools free to use?',
    a: 'Yes. Every tool on DLTools is free, with no sign-up needed to format, convert, generate or inspect your data. An optional account only syncs your preferences, recent tools and saved data.',
  },
  {
    q: 'Is my data safe?',
    a: 'Most tools run entirely in your browser, so the text, JSON, images or tokens you paste are processed on your own device and are not uploaded to a server. Tools that need a server, such as some document conversions, say so on their page.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. DLTools works in any modern browser on desktop or mobile. Open a tool, paste your input and copy the result.',
  },
  {
    q: 'What is KHQR and can I build or validate it here?',
    a: 'KHQR is the Cambodian QR payment standard used with Bakong. DLTools includes a KHQR builder to create payment QR codes and a KHQR validator to check the EMV structure and checksum of an existing code.',
  },
];

export default function SeoContent() {
  return (
    <section className="mt-14 border-t border-border pt-9" aria-labelledby="about-dltools-heading">
      <h2 id="about-dltools-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        Free online developer tools in one place
      </h2>
      <div className="mt-3 max-w-4xl space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          DLTools is a collection of {TOOLS.length} free, browser-based developer tools for everyday work: formatting and
          validating JSON, SQL, XML, YAML and Markdown, comparing text and code, generating and reading QR and KHQR codes,
          decoding JWTs, creating UUIDs and hashes, testing regular expressions, converting data between formats, and turning
          PDF files into Word documents. There is nothing to install, and most tools run locally so your data stays on your device.
        </p>
        <p>
          Each tool opens on its own page with a clear input and output, sample data to try, and one-click copy. Pick a
          category below to see what is available, or use the search box at the top of the page to jump straight to a tool.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {CATEGORIES.map((category) => {
          const tools = TOOLS.filter((tool) => tool.category === category.id);
          if (tools.length === 0) return null;
          return (
            <div key={category.id}>
              <h3 className="text-lg font-semibold text-foreground">{category.label}</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <Link href={getToolPath(tool)} className="font-medium text-foreground hover:text-primary">
                      {tool.name}
                    </Link>
                    {' — '}
                    {tool.description}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-2xl font-semibold tracking-tight text-foreground">Frequently asked questions</h2>
      <dl className="mt-3 max-w-4xl space-y-4 text-sm leading-relaxed">
        {FAQ.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-1 text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
