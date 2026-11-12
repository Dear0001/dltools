'use client';
import React, { useMemo, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { DetailList, OutputPlaceholder, ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { AlertTriangle, ClipboardPaste, Download, FileText } from 'lucide-react';
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
    <ToolFrame toolbar={<>
      <ToolbarField label="Save as">
        <select id="b64doc-format" className="select-input" value={target} onChange={(event) => setTarget(event.target.value as TargetOption)}>
          <option value="auto">Auto detect</option>
          <option value="pdf">PDF (.pdf)</option>
          <option value="word">Word (.docx)</option>
          <option value="excel">Excel (.xlsx)</option>
        </select>
      </ToolbarField>
      <ToolbarField label="File name">
        <input id="b64doc-name" className="input-field w-40 py-1.5" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="document" spellCheck={false} />
      </ToolbarField>
      {resolution?.status === 'ready' && <span className="font-mono text-xs text-muted-foreground">.{resolution.ext}</span>}
      <div className="ml-auto"><button type="button" className="btn-primary" onClick={download} disabled={!canDownload}><Download size={14} />Download</button></div>
    </>}>
      <PanelLayout
        inputLabel="Base64 string or data URI"
        outputLabel="Document"
        outputBody="content"
        copyable={false}
        inputActions={<button type="button" className="btn-icon gap-1 px-2 text-xs font-medium" onClick={pasteFromClipboard} title="Paste from clipboard" aria-label="Paste from clipboard"><ClipboardPaste size={13} /><span className="hidden sm:inline">Paste</span></button>}
        inputPanel={<CodeEditor value={input} onChange={setInput} minHeight="100%" placeholder={'Paste Base64 here…\nJVBERi0xLjQK… or data:application/pdf;base64,JVBERi0x…'} />}
        outputPanel={<div className="flex flex-1 flex-col gap-3" aria-live="polite">
          {!input.trim() && <OutputPlaceholder icon={<FileText size={28} />} title="Convert Base64 to PDF, Word or Excel" description="Paste a Base64 string and the file type is detected automatically. Everything runs in your browser." />}
          {waiting && <p className="text-xs text-muted-foreground">Decoding…</p>}
          {!waiting && parsed && !parsed.ok && <p className="notice notice-error" role="alert"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /><span>{parsed.error}</span></p>}
          {!waiting && bytes && kind && resolution && (
            <>
              <DetailList mono={false} rows={[
                ['Detected', KIND_LABEL[kind]],
                ['Size', formatBytes(bytes.length)],
                ...(resolution.status === 'ready' ? [['Will save as', `${OUTPUT_TYPES[resolution.target].label} (.${resolution.ext})`] as [string, string]] : []),
              ]} />
              {resolution.status !== 'ready' && <p className="notice border-warning/40 bg-warning/5 text-warning"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /><span>{resolution.message}</span></p>}
              {resolution.status === 'ready' && resolution.warning && <p className="notice border-warning/40 bg-warning/5 text-warning"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /><span>{resolution.warning}</span></p>}
              {(kind === 'pdf' || kind === 'docx' || kind === 'xlsx') && <DocumentPreview bytes={bytes} kind={kind} />}
            </>
          )}
        </div>}
        onDownload={download}
        canDownload={canDownload}
        outputStatus={parsed && !parsed.ok ? 'error' : canDownload ? 'success' : 'idle'}
        onClear={clear}
      />
    </ToolFrame>
  );
}
