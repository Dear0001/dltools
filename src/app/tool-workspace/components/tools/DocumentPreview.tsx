'use client';
import React, { useEffect, useState } from 'react';
import { columnLetters, readXlsxPreview, type SheetPreview } from './xlsxPreview';

export type PreviewKind = 'pdf' | 'docx' | 'xlsx';

const MAX_XLSX_PREVIEW_BYTES = 10 * 1024 * 1024;
const FRAME_CLASS = 'min-h-[24rem] w-full flex-1 rounded-lg border border-border bg-white';

function wrapPreviewHtml(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:14px/1.6 system-ui,sans-serif;color:#1f2933;background:#fff;margin:0;padding:16px}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}img{max-width:100%}
</style></head><body>${body}</body></html>`;
}

/** Shows a PDF, Word or Excel file decoded from Base64. Nothing leaves the browser. */
export default function DocumentPreview({ bytes, kind }: { bytes: Uint8Array; kind: PreviewKind }) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [docxHtml, setDocxHtml] = useState('');
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // PDF: a blob URL, revoked when the data changes.
  useEffect(() => {
    if (kind !== 'pdf') {
      setPdfUrl('');
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bytes, kind]);

  // Word and Excel are parsed asynchronously in the browser.
  useEffect(() => {
    setDocxHtml('');
    setSheets([]);
    setActiveSheet(0);
    setError('');
    if (kind === 'pdf') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (kind === 'docx') {
          const { default: mammoth } = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer: new Uint8Array(bytes).buffer });
          if (!cancelled) setDocxHtml(result.value || '<p><em>This document has no text content.</em></p>');
        } else {
          if (bytes.length > MAX_XLSX_PREVIEW_BYTES) {
            throw new Error('This workbook is too large to preview, but it can still be downloaded.');
          }
          const result = await readXlsxPreview(bytes);
          if (!cancelled) setSheets(result);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error && kind === 'xlsx'
              ? caught.message
              : 'Could not render a preview, but the file can still be downloaded.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bytes, kind]);

  if (kind === 'pdf') {
    return pdfUrl ? <iframe title="PDF preview" src={pdfUrl} className={FRAME_CLASS} /> : null;
  }

  if (loading) return <p className="text-xs text-muted-foreground">Rendering preview…</p>;
  if (error) return <p className="text-xs text-muted-foreground">{error}</p>;

  if (kind === 'docx') {
    // Sandboxed with no permissions: the HTML comes from an untrusted document, so no scripts run.
    return docxHtml ? (
      <iframe title="Word preview" sandbox="" srcDoc={wrapPreviewHtml(docxHtml)} className={FRAME_CLASS} />
    ) : null;
  }

  const sheet = sheets[activeSheet];
  if (!sheet) return null;
  const truncated = sheet.totalRows > sheet.rows.length || sheet.totalCols > (sheet.rows[0]?.length ?? 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {sheets.length > 1 && (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Worksheets">
          {sheets.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              role="tab"
              data-no-translate
              aria-selected={index === activeSheet}
              onClick={() => setActiveSheet(index)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${index === activeSheet ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {sheet.rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">This worksheet is empty.</p>
      ) : (
        <div data-no-translate className="max-h-[28rem] overflow-auto rounded-lg border border-border bg-card scrollbar-thin">
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="border border-border px-2 py-1 text-muted-foreground" />
                {sheet.rows[0].map((_, col) => (
                  <th key={col} className="border border-border px-2 py-1 font-medium text-muted-foreground">
                    {columnLetters(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, r) => (
                <tr key={r}>
                  <th className="border border-border bg-muted px-2 py-1 font-medium text-muted-foreground">{r + 1}</th>
                  {row.map((cell, c) => (
                    <td key={c} className="max-w-[16rem] truncate border border-border px-2 py-1 text-foreground" title={cell}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {truncated
          ? `Showing the first ${sheet.rows.length} of ${sheet.totalRows} rows and ${sheet.rows[0]?.length ?? 0} of ${sheet.totalCols} columns. `
          : ''}
        Values only: formulas show their last saved result and dates appear as serial numbers.
      </p>
    </div>
  );
}
