import React from 'react';

export default function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-7 text-muted-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
