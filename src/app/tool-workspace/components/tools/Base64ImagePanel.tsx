'use client';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Tool, getToolPath } from '@/data/tools';
import { Upload, ClipboardPaste, AlertTriangle, ImageIcon } from 'lucide-react';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { toast } from 'sonner';
import AppImage from '../../../../components/ui/AppImage';
import { useDebouncedValue } from '../useDebouncedValue';
import { parseBase64Input } from './base64Document';
import { describeBinary } from './base64Media';
import DocumentPreview, { type PreviewKind } from './DocumentPreview';

type Mode = 'encode' | 'decode';

export default function Base64ImagePanel({ tool: _tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>('encode');
  const [base64, setBase64] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    setMimeType(file.type);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBase64(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handlePaste = useCallback(async () => {
    // Backend integration point: navigator.clipboard API
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processFile(new File([blob], 'pasted-image.png', { type: imageType }));
          return;
        }
      }
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const text = await (await item.getType('text/plain')).text();
          if (acceptPastedText(text)) return;
        }
      }
      toast.error('No image or Base64 string found in clipboard');
    } catch {
      toast.error('Clipboard access denied — try uploading the file directly');
    }
  }, []);

  // Pasted text is only taken over automatically when it is clearly a Base64 payload
  // (a data URI, or bytes that match a known file type) so ordinary text is never hijacked.
  function acceptPastedText(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 16) return false;
    const parsed = parseBase64Input(trimmed);
    if (!parsed.ok) return false;
    if (!/^data:/i.test(trimmed) && !describeBinary(parsed.bytes, parsed.mime).known) return false;
    setMode('decode');
    setBase64(trimmed);
    toast.success('Base64 detected — decoding automatically');
    return true;
  }

  // Decode mode converts automatically (debounced) whenever the input changes.
  const debouncedBase64 = useDebouncedValue(base64);
  const decodePending = mode === 'decode' && base64.trim() !== '' && base64 !== debouncedBase64;
  const decoded = useMemo(() => {
    if (mode !== 'decode' || !debouncedBase64.trim()) return null;
    const parsed = parseBase64Input(debouncedBase64);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    return { ok: true as const, bytes: parsed.bytes, info: describeBinary(parsed.bytes, parsed.mime) };
  }, [mode, debouncedBase64]);

  const documentKind: PreviewKind | null =
    decoded?.ok && (['pdf', 'docx', 'xlsx'] as const).includes(decoded.info.ext as PreviewKind)
      ? (decoded.info.ext as PreviewKind)
      : null;

  const [decodedUrl, setDecodedUrl] = useState('');
  useEffect(() => {
    if (!decoded?.ok) {
      setDecodedUrl('');
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(decoded.bytes)], { type: decoded.info.mime }));
    setDecodedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [decoded]);

  const downloadDecoded = () => {
    if (!decoded?.ok || !decodedUrl) return;
    const a = document.createElement('a');
    a.href = decodedUrl;
    a.download = `decoded.${decoded.info.ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Ctrl+V anywhere on the page: an image switches to encode, a Base64 string to decode.
  const pasteHandlerRef = useRef<(event: ClipboardEvent) => void>(() => {});
  pasteHandlerRef.current = (event: ClipboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return;
    const data = event.clipboardData;
    if (!data) return;

    const file = Array.from(data.files).find((f) => f.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      setMode('encode');
      processFile(file);
      return;
    }
    if (acceptPastedText(data.getData('text/plain'))) event.preventDefault();
  };
  useEffect(() => {
    const listener = (event: ClipboardEvent) => pasteHandlerRef.current(event);
    document.addEventListener('paste', listener);
    return () => document.removeEventListener('paste', listener);
  }, []);

  const downloadFile = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = fileName || 'decoded-file';
    a.click();
  };

  const rawBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  const decodeStatus = !base64.trim()
    ? 'Converts automatically as you paste or type.'
    : decodePending
      ? 'Decoding…'
      : decoded?.ok
        ? `Detected: ${decoded.info.label} · ${(decoded.bytes.length / 1024).toFixed(1)} KB`
        : '';

  return (
    <ToolFrame toolbar={<>
      <div className="segmented" role="group" aria-label="Mode">
        {(['encode', 'decode'] as Mode[]).map((m) => (
          <button key={`b64-mode-${m}`} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'encode' ? 'File → Base64' : 'Base64 → File'}</button>
        ))}
      </div>
      <button type="button" className="btn-ghost" onClick={handlePaste}><ClipboardPaste size={14} />Paste from Clipboard</button>
      <span className="text-xs text-muted-foreground">Ctrl+V pastes an image or a Base64 string</span>
    </>}>
      {mode === 'encode' ? (
        <PanelLayout
          inputLabel="File"
          outputLabel="Base64 Output"
          inputBody="content"
          inputPanel={<div className="flex flex-1 flex-col gap-3">
            <button
              type="button"
              className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={28} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Drop file here or click to upload</span>
              <span className="text-xs text-muted-foreground">Images, PDFs, any binary file</span>
            </button>
            {fileName && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{mimeType.split('/')[0].charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{mimeType} · {fileSize}</p>
                </div>
              </div>
            )}
            {previewUrl && mimeType.startsWith('image/') && (
              <div className="flex min-h-32 flex-1 items-center justify-center rounded-lg border border-border bg-background-secondary p-4">
                <AppImage src={previewUrl} alt={`Preview of uploaded file ${fileName}`} width={320} height={240} className="max-h-48 rounded object-contain" unoptimized />
              </div>
            )}
          </div>}
          outputPanel={<div className="flex flex-1 flex-col">
            <textarea value={rawBase64} readOnly aria-label="Base64 Output" placeholder="Upload a file to see its Base64 string…" className="input-code flex-1 resize-none rounded-none border-0 bg-transparent text-xs focus:shadow-none" />
            {base64 && (
              <p className="border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
                Length: <span className="tabular-nums text-foreground">{rawBase64.length.toLocaleString()}</span> chars
                · Data URI prefix: <span className="font-mono text-primary">{base64.split(',')[0]}</span>
              </p>
            )}
          </div>}
          outputText={base64}
          outputStatus={base64 ? 'success' : 'idle'}
          onDownload={downloadFile}
          canDownload={Boolean(previewUrl)}
          onClear={() => { setBase64(''); setPreviewUrl(''); setFileName(''); setFileSize(''); setMimeType(''); }}
        />
      ) : (
        <PanelLayout
          inputLabel="Base64 String"
          outputLabel="Preview"
          outputBody="content"
          copyable={false}
          inputPanel={<div className="flex flex-1 flex-col">
            <CodeEditor value={base64} onChange={setBase64} minHeight="100%" placeholder="Paste a Base64 string or data URI — it converts automatically…" />
            <p className="border-t border-border px-3.5 py-2 text-xs text-muted-foreground" aria-live="polite">{decodeStatus}</p>
          </div>}
          outputPanel={<div className="flex flex-1 flex-col gap-3">
            {!decodePending && decoded && !decoded.ok && <p className="notice notice-error" role="alert"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /><span>{decoded.error}</span></p>}
            {!decodePending && decoded?.ok && decodedUrl ? (
              decoded.info.isImage ? (
                <div className="flex min-h-32 flex-1 items-center justify-center rounded-lg border border-border bg-background-secondary p-4">
                  <AppImage src={decodedUrl} alt="Decoded image preview from Base64 string" width={320} height={240} className="max-h-[40vh] rounded object-contain" unoptimized />
                </div>
              ) : documentKind ? (
                <div className="flex flex-col gap-3">
                  <DocumentPreview bytes={decoded.bytes} kind={documentKind} />
                  <p className="text-xs text-muted-foreground">
                    Need a custom file name or a different format?{' '}
                    <Link href={getToolPath({ id: 'tool-base64-document' })} className="text-primary underline">Open Base64 to PDF / Word / Excel</Link>.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                  This is {decoded.info.known ? 'a ' : ''}
                  <span className="font-medium text-foreground">{decoded.info.label.toLowerCase()}</span>, not an
                  image, so there is no preview. You can still download it.
                </div>
              )
            ) : (!decoded && <OutputPlaceholder icon={<ImageIcon size={26} />} title="Paste a Base64 string or data URI — it converts automatically…" />)}
          </div>}
          outputStatus={decoded && !decoded.ok ? 'error' : decoded?.ok ? 'success' : 'idle'}
          onDownload={downloadDecoded}
          canDownload={Boolean(decoded?.ok && decodedUrl)}
          onClear={() => setBase64('')}
        />
      )}
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { handleFileChange(e); e.target.value = ''; }} accept="*/*" />
    </ToolFrame>
  );
}
