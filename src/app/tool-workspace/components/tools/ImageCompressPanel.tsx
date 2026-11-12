'use client';
import React, { useState, useRef } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { OutputPlaceholder, ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import AppImage from '@/components/ui/AppImage';

export default function ImageCompressPanel({ tool: _tool }: { tool: Tool }) {
  const [original, setOriginal] = useState<{ url: string; size: number; name: string; width: number; height: number } | null>(null);
  const [compressed, setCompressed] = useState<{ url: string; size: number; width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxSizeMB, setMaxSizeMB] = useState(0.5);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [quality, setQuality] = useState(0.8);
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setOriginal({ url, size: file.size, name: file.name, width: img.naturalWidth, height: img.naturalHeight });
      setCompressed(null);
    };
  };

  const compress = async () => {
    if (!original) return;
    setLoading(true);
    try {
      // Backend integration point: browser-image-compression
      const resp = await fetch(original.url);
      const blob = await resp.blob();
      const file = new File([blob], original.name, { type: blob.type });
      const result = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight: maxWidth,
        initialQuality: quality,
        fileType: outputFormat,
        useWebWorker: true,
      });
      const compUrl = URL.createObjectURL(result);
      const img = new Image();
      img.src = compUrl;
      img.onload = () => {
        setCompressed({ url: compUrl, size: result.size, width: img.naturalWidth, height: img.naturalHeight });
        setLoading(false);
        toast.success(`Compressed to ${(result.size / 1024).toFixed(1)} KB`);
      };
    } catch {
      toast.error('Compression failed — try a different format or quality setting');
      setLoading(false);
    }
  };

  const downloadCompressed = () => {
    if (!compressed) return;
    const a = document.createElement('a');
    a.href = compressed.url;
    const ext = outputFormat.split('/')[1];
    a.download = `compressed.${ext}`;
    a.click();
  };

  const savings = original && compressed
    ? Math.round((1 - compressed.size / original.size) * 100)
    : 0;

  const pick = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file && file.type.startsWith('image/')) void handleFile(file);
    else if (file) toast.error('Choose an image file (JPEG, PNG, WebP or GIF).');
  };
  const preview = (url: string, alt: string) => (
    <div className="flex min-h-48 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-background-secondary p-3">
      <AppImage src={url} alt={alt} width={480} height={320} className="max-h-[40vh] w-auto object-contain" unoptimized />
    </div>
  );

  return (
    <ToolFrame toolbar={<>
      <ToolbarField label="Max Size">
        <select className="select-input" value={maxSizeMB} onChange={(e) => setMaxSizeMB(Number(e.target.value))}>
          <option value={0.1}>0.1 MB</option><option value={0.3}>0.3 MB</option><option value={0.5}>0.5 MB</option><option value={1}>1 MB</option><option value={2}>2 MB</option>
        </select>
      </ToolbarField>
      <ToolbarField label="Max Width">
        <select className="select-input" value={maxWidth} onChange={(e) => setMaxWidth(Number(e.target.value))}>
          <option value={640}>640px</option><option value={1280}>1280px</option><option value={1920}>1920px</option><option value={3840}>3840px</option>
        </select>
      </ToolbarField>
      <ToolbarField label="Quality">
        <select className="select-input" value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
          <option value={0.5}>50%</option><option value={0.7}>70%</option><option value={0.8}>80%</option><option value={0.9}>90%</option><option value={1}>100%</option>
        </select>
      </ToolbarField>
      <ToolbarField label="Format">
        <select className="select-input" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}>
          <option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option>
        </select>
      </ToolbarField>
      <div className="ml-auto">
        <button type="button" className="btn-primary" onClick={compress} disabled={loading || !original}>
          {loading ? <><span className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" />Compressing…</> : 'Compress Image'}
        </button>
      </div>
    </>}>
      <PanelLayout
        inputLabel="Original"
        outputLabel="Compressed"
        inputBody="content"
        outputBody="content"
        copyable={false}
        inputActions={original ? <span className="mr-1 font-mono text-xs tabular-nums text-muted-foreground">{(original.size / 1024).toFixed(1)} KB · {original.width}×{original.height}</span> : null}
        outputActions={compressed ? <span className="mr-1 flex items-center gap-2"><span className="font-mono text-xs tabular-nums text-muted-foreground">{(compressed.size / 1024).toFixed(1)} KB · {compressed.width}×{compressed.height}</span><span className="tool-category-badge border border-primary/20 bg-primary/10 text-primary">-{savings}%</span></span> : null}
        inputPanel={original ? preview(original.url, `Original image: ${original.name}`) : (
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}
          >
            <Upload size={32} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Upload an image to compress</span>
            <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF supported</span>
          </button>
        )}
        outputPanel={compressed ? preview(compressed.url, 'Compressed output image') : <OutputPlaceholder icon={<ImageIcon size={26} />} title="Compressed image appears here" />}
        onDownload={downloadCompressed}
        canDownload={Boolean(compressed)}
        outputStatus={compressed ? 'success' : 'idle'}
        onClear={() => { setOriginal(null); setCompressed(null); }}
      />
      <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
    </ToolFrame>
  );
}
