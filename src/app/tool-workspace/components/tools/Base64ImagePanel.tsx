'use client';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Tool, getToolPath } from '@/data/tools';
import { Upload, Copy, Download, ClipboardPaste, AlertTriangle, Trash2 } from 'lucide-react';
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

  const copyBase64 = async () => {
    if (!base64) return;
    await navigator.clipboard.writeText(base64);
    toast.success('Base64 string copied');
  };

  const rawBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={`b64-mode-${m}`}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-150 capitalize ${mode === m ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'encode' ? 'File → Base64' : 'Base64 → File'}
            </button>
          ))}
        </div>

        {mode === 'encode' ? (
          <>
            {/* Upload zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-150 cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={28} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drop file here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Images, PDFs, any binary file</p>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="*/*" />
            </div>

            <div className="flex items-center gap-2">
              <button className="btn-ghost text-xs" onClick={handlePaste}>
                <ClipboardPaste size={13} />
                Paste from Clipboard
              </button>
              <span className="text-xs text-muted-foreground">Ctrl+V pastes an image or a Base64 string</span>
            </div>

            {fileName && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{mimeType.split('/')[0].charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{mimeType} · {fileSize}</p>
                </div>
              </div>
            )}

            {base64 && (
              <>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base64 Output</span>
                    <div className="flex items-center gap-1">
                      <button className="btn-icon" onClick={copyBase64} title="Copy Base64">
                        <Copy size={13} />
                      </button>
                      <button className="btn-icon" onClick={downloadFile} title="Download file">
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={rawBase64}
                    readOnly
                    className="input-code w-full text-success text-xs"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Length: <span className="text-foreground tabular-nums">{rawBase64.length.toLocaleString()}</span> chars
                    · Data URI prefix: <span className="text-primary font-mono">{base64.split(',')[0]}</span>
                  </p>
                </div>

                {previewUrl && mimeType.startsWith('image/') && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">Preview</span>
                    <div className="flex items-center justify-center bg-background-secondary rounded-lg p-4 min-h-32">
                      <AppImage
                        src={previewUrl}
                        alt={`Preview of uploaded file ${fileName}`}
                        width={320}
                        height={240}
                        className="max-h-48 object-contain rounded"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-5">
              <label className="block text-xs text-muted-foreground font-medium mb-2">Base64 String</label>
              <textarea
                value={base64}
                onChange={(e) => setBase64(e.target.value)}
                className="input-code w-full text-success text-xs"
                rows={6}
                placeholder="Paste a Base64 string or data URI — it converts automatically…"
                spellCheck={false}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {!base64.trim()
                    ? 'Converts automatically as you paste or type.'
                    : decodePending
                      ? 'Decoding…'
                      : decoded?.ok
                        ? `Detected: ${decoded.info.label} · ${(decoded.bytes.length / 1024).toFixed(1)} KB`
                        : ''}
                </p>
                <button className="btn-ghost text-xs" onClick={() => setBase64('')} disabled={!base64}>
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
            </div>

            {!decodePending && decoded && !decoded.ok && (
              <div className="flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 p-3 text-xs text-error">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{decoded.error}</span>
              </div>
            )}

            {!decodePending && decoded?.ok && decodedUrl && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
                  <button className="btn-ghost text-xs" onClick={downloadDecoded}>
                    <Download size={12} />
                    Download .{decoded.info.ext}
                  </button>
                </div>
                {decoded.info.isImage ? (
                  <div className="flex items-center justify-center bg-background-secondary rounded-lg p-4 min-h-32">
                    <AppImage
                      src={decodedUrl}
                      alt="Decoded image preview from Base64 string"
                      width={320}
                      height={240}
                      className="max-h-48 object-contain rounded"
                      unoptimized
                    />
                  </div>
                ) : documentKind ? (
                  <div className="flex flex-col gap-3">
                    <DocumentPreview bytes={decoded.bytes} kind={documentKind} />
                    <p className="text-xs text-muted-foreground">
                      Need a custom file name or a different format?{' '}
                      <Link href={getToolPath({ id: 'tool-base64-document' })} className="text-primary underline">
                        Open Base64 to PDF / Word / Excel
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                    This is {decoded.info.known ? 'a ' : ''}
                    <span className="font-medium text-foreground">{decoded.info.label.toLowerCase()}</span>, not an
                    image, so there is no preview. You can still download it.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}