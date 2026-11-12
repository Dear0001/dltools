'use client';
import React from 'react';
import { localizeControlContent, useLocale } from '@/i18n/LocaleProvider';

/**
 * Standard tool layout: an optional options toolbar on top, then the tool body
 * (normally a PanelLayout). Every tool panel uses this so spacing, toolbar
 * styling and scrolling behave the same everywhere.
 */
export default function ToolFrame({ toolbar, children, notice }: { toolbar?: React.ReactNode; children: React.ReactNode; notice?: React.ReactNode }) {
  const { locale } = useLocale();
  return (
    <div className="flex h-full flex-col">
      {toolbar && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-border bg-secondary/30 px-4 py-2.5">
          {localizeControlContent(toolbar, locale)}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 lg:overflow-hidden">
        <div className="min-h-0 flex-1">{children}</div>
        {notice && <p className="flex-shrink-0 text-xs leading-relaxed text-muted-foreground">{notice}</p>}
      </div>
    </div>
  );
}

/** Label + control pair used inside a ToolFrame toolbar. */
export function ToolbarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Two-column label/value rows for structured results (IP ranges, certificates, timestamps…). */
export function DetailList({ rows, mono = true }: { rows: Array<[string, React.ReactNode]>; mono?: boolean }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-border bg-background-secondary/60 px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className={`mt-1 whitespace-pre-wrap break-words text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Centered placeholder for an output panel that has nothing to show yet. */
export function OutputPlaceholder({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-muted-foreground" aria-hidden="true">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
