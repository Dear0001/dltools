'use client';
import React, { useMemo, useState } from 'react';
import { Tool } from '@/data/tools';
import { AlertTriangle, ClipboardPaste, Download, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDebouncedValue } from '../useDebouncedValue';
import DocumentPreview from './DocumentPreview';
import {
  KIND_LABEL,
  OUTPUT_TYPES,
  detectDocumentKind,
  formatBytes,
  parseBase64Input,
  resolveOutput,
  type TargetOption,
} from './base64Document';

function sanitizeFileName(name: string): string {
  const withoutExt = name.trim().replace(/\.[a-z0-9]{1,5}$/i, '');
  const safe = withoutExt.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '');
  return safe || 'document';
}

export default function Base64DocumentPanel(_props: { tool: Tool }) {
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<TargetOption>('auto');
  const [fileName, setFileName] = useState('document');
  const debouncedInput = useDebouncedValue(input);

  const parsed = useMemo(
    () => (debouncedInput.trim() ? parseBase64Input(debouncedInput) : null),
    [debouncedInput],
  );
  const bytes = parsed?.ok ? parsed.bytes : null;
  const kind = useMemo(() => (bytes ? detectDocumentKind(bytes) : null), [bytes]);
  const resolution = useMemo(
    () => (kind ? resolveOutput(target, kind, parsed?.ok ? parsed.mime : undefined) : null),
    [kind, target, parsed],
  );

  const pasteFromClipboard = async () => {
    try {
      setInput(await navigator.clipboard.readText());
    } catch {
      toast.error('Clipboard access denied — paste into the box instead');
    }
  };

  const download = () => {
    if (!bytes || resolution?.status !== 'ready') return;
    const blob = new Blob([new Uint8Array(bytes)], { type: resolution.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(fileName)}.${resolution.ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Downloaded ${link.download}`);
  };

  const clear = () => {
    setInput('');
    setTarget('auto');
  };

  const waiting = input.trim() !== '' && input !== debouncedInput;
  const canDownload = resolution?.status === 'ready';

  return (
    <div className="h-full flex flex-col">
      {/* Config bar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <label htmlFor="b64doc-format" className="text-xs text-muted-foreground font-medium">Save as</label>
          <select
            id="b64doc-format"
            className="select-input"
            value={target}
            onChange={(event) => setTarget(event.target.value as TargetOption)}
          >
            <option value="auto">Auto detect</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="word">Word (.docx)</option>
            <option value="excel">Excel (.xlsx)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="b64doc-name" className="text-xs text-muted-foreground font-medium">File name</label>
          <input
            id="b64doc-name"
            className="select-input w-40"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="document"
            spellCheck={false}
          />
          {resolution?.status === 'ready' && (
            <span className="text-xs text-muted-foreground font-mono">.{resolution.ext}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <button className="btn-ghost text-xs" onClick={pasteFromClipboard}>
            <ClipboardPaste size={12} />
            Paste
          </button>
          <button className="btn-ghost text-xs" onClick={clear} disabled={!input}>
            <Trash2 size={12} />
            Clear
          </button>
          <button className="btn-primary text-xs" onClick={download} disabled={!canDownload}>
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4 grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex min-h-0 flex-col gap-2">
          <label htmlFor="b64doc-input" className="text-xs text-muted-foreground font-medium">
            Base64 string or data URI
          </label>
          <textarea
            id="b64doc-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="input-code w-full flex-1 min-h-[12rem] text-success text-xs"
            placeholder={'Paste Base64 here…\nJVBERi0xLjQK… or data:application/pdf;base64,JVBERi0x…'}
            spellCheck={false}
          />
        </div>

        {/* Result */}
        <div className="flex min-h-0 flex-col gap-3 overflow-auto scrollbar-thin" aria-live="polite">
          {!input.trim() && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
              <FileText size={28} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Convert Base64 to PDF, Word or Excel</p>
              <p className="text-xs text-muted-foreground">
                Paste a Base64 string and the file type is detected automatically. Everything runs in your browser.
              </p>
            </div>
          )}

          {waiting && <p className="text-xs text-muted-foreground">Decoding…</p>}

          {!waiting && parsed && !parsed.ok && (
            <div className="flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 p-3 text-xs text-error">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{parsed.error}</span>
            </div>
          )}

          {!waiting && bytes && kind && resolution && (
            <>
              <div className="rounded-xl border border-border bg-card p-3 text-xs space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Detected</span>
                  <span className="font-medium text-foreground">{KIND_LABEL[kind]}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium text-foreground">{formatBytes(bytes.length)}</span>
                </div>
                {resolution.status === 'ready' && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Will save as</span>
                    <span className="font-medium text-foreground">
                      {OUTPUT_TYPES[resolution.target].label} (.{resolution.ext})
                    </span>
                  </div>
                )}
              </div>

              {resolution.status !== 'ready' && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{resolution.message}</span>
                </div>
              )}
              {resolution.status === 'ready' && resolution.warning && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{resolution.warning}</span>
                </div>
              )}

              {(kind === 'pdf' || kind === 'docx' || kind === 'xlsx') && (
                <DocumentPreview bytes={bytes} kind={kind} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
