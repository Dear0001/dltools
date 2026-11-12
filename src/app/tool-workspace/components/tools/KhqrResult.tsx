'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Copy, Download, FileJson, Wrench, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import VisibleUnicodeText, { hasInvisibleUnicode } from '../VisibleUnicodeText';
import { analysisToJson, analyzeKhqr, formatAmount, withCorrectCrc, type CheckLevel, type EmvTlvTag, type KhqrAnalysis } from './emvQr';

async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error('Clipboard access denied');
  }
}

const LEVEL_STYLE: Record<CheckLevel, { icon: React.ReactNode; text: string }> = {
  pass: { icon: <CheckCircle2 size={14} className="text-primary flex-shrink-0 mt-0.5" />, text: 'text-primary' },
  warn: { icon: <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />, text: 'text-warning' },
  fail: { icon: <XCircle size={14} className="text-error flex-shrink-0 mt-0.5" />, text: 'text-error' },
};

const VERDICT: Record<KhqrAnalysis['verdict'], { title: string; tone: string; border: string; icon: React.ReactNode }> = {
  khqr: { title: 'Valid KHQR', tone: 'text-primary', border: 'border-primary/30 bg-primary/5', icon: <CheckCircle2 size={22} className="text-primary" /> },
  emv: { title: 'Valid EMV QR (not KHQR)', tone: 'text-warning', border: 'border-warning/30 bg-warning/5', icon: <AlertTriangle size={22} className="text-warning" /> },
  invalid: { title: 'Invalid KHQR', tone: 'text-error', border: 'border-error/30 bg-error/5', icon: <XCircle size={22} className="text-error" /> },
  'not-emv': { title: 'Not an EMV / KHQR payload', tone: 'text-error', border: 'border-error/30 bg-error/5', icon: <XCircle size={22} className="text-error" /> },
};

/** Alternating colours for each top-level tag in the raw string. */
const SEGMENT_COLORS = ['text-primary', 'text-warning', 'text-success', 'text-foreground'];

function RawSegments({ analysis }: { analysis: KhqrAnalysis }) {
  return (
    <p className="font-mono text-xs leading-relaxed break-all">
      {analysis.tags.map((t, i) => (
        <span key={`${t.tag}-${i}`} title={`${t.tag} · ${t.label} · ${t.length} chars`} className={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}>
          <span className="font-semibold underline decoration-dotted underline-offset-2">{t.tag}</span>
          <span className="opacity-60">{String(t.length).padStart(2, '0')}</span>
          <span>{t.value}</span>
        </span>
      ))}
      {analysis.trailing && (
        <span className="bg-error/15 text-error" title="Could not be parsed">
          {analysis.trailing}
        </span>
      )}
    </p>
  );
}

function TlvRow({ tag, depth, crcValid }: { tag: EmvTlvTag; depth: number; crcValid: boolean | null }) {
  const isCrc = depth === 0 && tag.tag === '63';
  return (
    <>
      <button
        type="button"
        onClick={() => copyText(tag.value, `Copied ${tag.label}`)}
        title="Click to copy value"
        className={`group grid w-full grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[2.5rem_13rem_2rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors ${depth ? 'bg-muted/10' : ''}`}
        style={depth ? { paddingLeft: `${1 + depth * 1.25}rem` } : undefined}
      >
        <span className={`font-mono text-xs tabular-nums ${depth ? 'text-warning' : 'text-primary'}`}>
          {depth ? <ChevronRight size={10} className="inline -ml-3 mr-0.5 opacity-50" /> : null}
          {tag.tag}
        </span>
        <span className="text-xs text-muted-foreground truncate">{tag.label}</span>
        <span className="hidden sm:block text-xs text-muted-foreground tabular-nums">{tag.length}</span>
        <span className="col-start-2 sm:col-start-auto font-mono text-xs text-foreground break-all flex items-start justify-between gap-2">
          <span className={isCrc ? (crcValid ? 'text-primary' : 'text-error') : ''}>
            {tag.tag === '59' ? <VisibleUnicodeText value={tag.value} /> : tag.value}
            {isCrc && (crcValid ? '  ✓ valid' : '  ✗ mismatch')}
          </span>
          <Copy size={11} className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-50" />
        </span>
      </button>
      {tag.children?.map((c, i) => <TlvRow key={`${c.tag}-${i}`} tag={c} depth={depth + 1} crcValid={crcValid} />)}
    </>
  );
}

export default function KhqrResult({ data, onFixCrc }: { data: string; onFixCrc?: (fixed: string) => void }) {
  const analysis = useMemo(() => analyzeKhqr(data), [data]);
  const [showPassed, setShowPassed] = useState(false);
  const { fields, verdict, counts } = analysis;
  const v = VERDICT[verdict];
  const json = () => JSON.stringify(analysisToJson(analysis), null, 2);

  const downloadJson = () => {
    const blob = new Blob([json()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fields.merchantName || 'khqr').replace(/[^\w-]+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const crcFixable = analysis.crcValid !== true && analysis.tags.length > 0 && !analysis.trailing;
  const visibleChecks = showPassed ? analysis.checks : analysis.checks.filter((c) => c.level !== 'pass');

  const detailRows: [string, React.ReactNode][] = (
    [
      ['Bakong account', fields.accountId],
      ['Account type', fields.accountType],
      ['Merchant ID', fields.merchantId],
      ['Account info', fields.accountInformation],
      ['Acquiring bank', fields.acquiringBank],
      ['City', fields.merchantCity],
      ['Name (alt. language)', fields.merchantNameAlt],
      ['City (alt. language)', fields.merchantCityAlt],
      ['Bill number', fields.billNumber],
      ['Mobile number', fields.mobileNumber],
      ['Store label', fields.storeLabel],
      ['Terminal label', fields.terminalLabel],
      ['Purpose', fields.purpose],
      ['MCC', fields.mcc],
      ['Country', fields.countryCode],
      ['Postal code', fields.postalCode],
      ['Created', fields.createdAt?.toLocaleString() ?? null],
      ['Expires', fields.expiresAt?.toLocaleString() ?? null],
    ] as [string, React.ReactNode][]
  ).filter(([, value]) => value !== null && value !== '');

  return (
    <div className="flex flex-col gap-4">
      {/* Verdict */}
      <section className={`rounded-xl border p-4 ${v.border}`} aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {v.icon}
            <div>
              <p className={`text-sm font-semibold ${v.tone}`}>{v.title}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {counts.pass} passed · {counts.warn} warning{counts.warn === 1 ? '' : 's'} · {counts.fail} error{counts.fail === 1 ? '' : 's'} · {analysis.data.length} chars
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {onFixCrc && crcFixable && (
              <button type="button" className="btn-ghost text-xs" onClick={() => onFixCrc(withCorrectCrc(analysis.data))}>
                <Wrench size={12} /> Fix CRC
              </button>
            )}
            <button type="button" className="btn-ghost text-xs" onClick={() => copyText(analysis.data, 'Raw string copied')}>
              <Copy size={12} /> Raw
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => copyText(json(), 'JSON copied')}>
              <FileJson size={12} /> JSON
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={downloadJson} aria-label="Download JSON">
              <Download size={12} />
            </button>
          </div>
        </div>
      </section>

      {/* Payment summary */}
      {analysis.tags.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-hidden" aria-label="Payment details">
          <div className="p-5 flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-border">
            <div className="min-w-0">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground">Pay to</p>
              <p className="text-lg font-semibold text-foreground break-words">
                {fields.merchantName ? <VisibleUnicodeText value={fields.merchantName} /> : <span className="text-muted-foreground">Unknown merchant</span>}
              </p>
              {fields.accountId && <p className="font-mono text-xs text-muted-foreground break-all">{fields.accountId}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {formatAmount(fields)}
                {fields.currency && <span className="ml-1.5 text-sm font-medium text-muted-foreground">{fields.currency}</span>}
              </p>
              <div className="mt-1 flex justify-end gap-1.5">
                {analysis.tags.some((t) => t.tag === '40') && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-2xs font-medium text-success">Dual currency</span>
                )}
              </div>
            </div>
          </div>
          {detailRows.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
              {detailRows.map(([label, value]) => (
                <div key={label} className="bg-card px-4 py-2.5">
                  <dt className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="text-xs font-medium text-foreground break-all">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {/* Checks */}
      <section className="rounded-xl border border-border bg-card overflow-hidden" aria-label="Validation checks">
        <div className="panel-header rounded-t-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validation checks</span>
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowPassed((s) => !s)}>
            {showPassed ? 'Hide passed' : `Show all ${analysis.checks.length}`}
          </button>
        </div>
        {visibleChecks.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-3 text-xs text-primary">
            <CheckCircle2 size={14} /> All {counts.pass} checks passed.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleChecks.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5 px-4 py-2.5">
                {LEVEL_STYLE[c.level].icon}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground break-words">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Raw string, colour-coded by tag */}
      {analysis.tags.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4" aria-label="Raw payload">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raw payload · hover a segment</p>
          <RawSegments analysis={analysis} />
        </section>
      )}

      {/* TLV tree */}
      {analysis.tags.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-hidden" aria-label="TLV breakdown">
          <div className="panel-header rounded-t-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TLV breakdown</span>
            <span className="text-xs text-muted-foreground">{analysis.tags.length} tags · click a row to copy</span>
          </div>
          {analysis.tags.some((t) => t.tag === '59' && hasInvisibleUnicode(t.value)) && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
              Red markers show invisible characters in the merchant name; the original value is unchanged.
            </p>
          )}
          <div className="hidden sm:grid grid-cols-[2.5rem_13rem_2rem_minmax(0,1fr)] gap-x-3 px-4 py-1.5 text-2xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Tag</span>
            <span>Name</span>
            <span>Len</span>
            <span>Value</span>
          </div>
          <div className="divide-y divide-border">
            {analysis.tags.map((t, i) => (
              <div key={`${t.tag}-${i}`}>
                <TlvRow tag={t} depth={0} crcValid={analysis.crcValid} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
