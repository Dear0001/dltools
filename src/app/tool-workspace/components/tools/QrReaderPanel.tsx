'use client';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Tool } from '@/data/tools';
import { Upload, ScanLine, ClipboardPaste, ExternalLink } from 'lucide-react';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import AppImage from '@/components/ui/AppImage';
import { analyzeKhqr } from './emvQr';
import KhqrResult from './KhqrResult';

type ContentKind = 'KHQR / EMV' | 'URL' | 'Wi-Fi' | 'Email' | 'Phone' | 'SMS' | 'Contact' | 'Geo' | 'JSON' | 'Text';

function detectKind(text: string): ContentKind {
  const t = text.trim();
  if (analyzeKhqr(t).verdict !== 'not-emv') return 'KHQR / EMV';
  if (/^https?:\/\//i.test(t)) return 'URL';
  if (/^WIFI:/i.test(t)) return 'Wi-Fi';
  if (/^(mailto:|MATMSG:)/i.test(t)) return 'Email';
  if (/^tel:/i.test(t)) return 'Phone';
  if (/^(sms|smsto):/i.test(t)) return 'SMS';
  if (/^(BEGIN:VCARD|MECARD:)/i.test(t)) return 'Contact';
  if (/^geo:/i.test(t)) return 'Geo';
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(t);
      return 'JSON';
    } catch {
      /* not JSON */
    }
  }
  return 'Text';
}

function parseWifi(text: string): [string, string][] {
  const names: Record<string, string> = { S: 'Network (SSID)', T: 'Security', P: 'Password', H: 'Hidden' };
  const out: [string, string][] = [];
  const re = /([STPH]):((?:\\.|[^;])*);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text.slice(5)))) out.push([names[m[1]], m[2].replace(/\\(.)/g, '$1')]);
  return out;
}

/** Try jsQR at a few sizes; very large photos often fail at full resolution. */
function decodeImage(img: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const targets = [Math.min(longest, 1600), 1000, 600, longest].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  for (const target of targets) {
    const scale = target / longest;
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;
  }
  return null;
}

export default function QrReaderPanel({ tool: _tool }: { tool: Tool }) {
  const [result, setResult] = useState('');
  const [source, setSource] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevPreviewUrl = useRef<string | null>(null);

  const updateResult = useCallback((decoded: string, from: string) => {
    setResult(decoded.trim());
    setSource(from);
    setError('');
  }, []);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const processImage = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file');
        return;
      }
      setError('');
      const url = URL.createObjectURL(file);
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
      prevPreviewUrl.current = url;
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        const decoded = decodeImage(img);
        if (decoded) {
          updateResult(decoded, file.name === 'pasted.png' ? 'Clipboard image' : file.name || 'Image');
          toast.success('QR code decoded');
        } else {
          setResult('');
          setError('No QR code detected — try a sharper, well-lit image where the QR fills more of the frame.');
        }
      };
      img.onerror = () => setError('This image could not be opened.');
      img.src = url;
    },
    [updateResult],
  );

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processImage(new File([blob], 'pasted.png', { type: imageType }));
          return;
        }
      }
    } catch {
      /* fall back to text below */
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        updateResult(text, 'Clipboard text');
        return;
      }
      toast.error('No image or text found in clipboard');
    } catch {
      toast.error('Clipboard access denied — press Ctrl/⌘+V instead');
    }
  }, [processImage, updateResult]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    if (video.readyState >= 2 && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          updateResult(code.data, 'Camera');
          if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
          prevPreviewUrl.current = null;
          setPreviewUrl('');
          stopCamera();
          navigator.vibrate?.(60);
          toast.success('QR code scanned');
          return;
        }
      }
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, updateResult]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not available in this browser (HTTPS is required)');
      return;
    }
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      // The <video> element mounts after setScanning; wait a tick for the ref.
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
        frameRef.current = requestAnimationFrame(scanFrame);
      });
    } catch {
      toast.error('Camera access denied — try uploading an image instead');
      stopCamera();
    }
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (!event.clipboardData) return;
      const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (file) processImage(new File([file], 'pasted.png', { type: file.type }));
        return;
      }
      const text = event.clipboardData.getData('text');
      if (text.trim()) {
        event.preventDefault();
        updateResult(text, 'Clipboard text');
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [processImage, updateResult]);

  useEffect(
    () => () => {
      stopCamera();
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    },
    [stopCamera],
  );

  const clear = () => {
    setResult('');
    setSource('');
    setError('');
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    prevPreviewUrl.current = null;
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const kind = useMemo(() => (result ? detectKind(result) : null), [result]);
  const tile = 'flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-colors';

  return (
    <ToolFrame>
      <PanelLayout
        inputLabel="Source"
        outputLabel="Decoded Result"
        inputBody="content"
        outputBody="content"
        outputActions={kind ? <span className="mr-1 rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-medium text-primary">{kind}</span> : null}
        inputPanel={<div
          className="flex flex-1 flex-col gap-4"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processImage(file); }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button type="button" className={`${tile} ${dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30 hover:bg-primary/5'}`} onClick={() => fileRef.current?.click()}>
              <Upload size={22} className="text-primary" />
              <span className="text-xs font-medium text-foreground">{dragging ? 'Drop image here' : 'Upload Image'}</span>
              <span className="text-center text-xs text-muted-foreground">Click or drag & drop</span>
            </button>
            <button type="button" className={`${tile} border-border hover:border-primary/30 hover:bg-primary/5`} onClick={handlePaste}>
              <ClipboardPaste size={22} className="text-primary" />
              <span className="text-xs font-medium text-foreground">Paste</span>
              <span className="text-center text-xs text-muted-foreground">Image or text · Ctrl/⌘+V</span>
            </button>
            <button type="button" className={`${tile} ${scanning ? 'border-error/30 bg-error/5' : 'border-border hover:border-primary/30 hover:bg-primary/5'}`} onClick={scanning ? stopCamera : startCamera}>
              <ScanLine size={22} className={scanning ? 'text-error' : 'text-primary'} />
              <span className="text-xs font-medium text-foreground">{scanning ? 'Stop Camera' : 'Live Camera'}</span>
              <span className="text-center text-xs text-muted-foreground">{scanning ? 'Scanning…' : 'Webcam / phone camera'}</span>
            </button>
          </div>

          {scanning && (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="relative">
                <video ref={videoRef} className="w-full" autoPlay playsInline muted />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="aspect-square w-1/2 max-w-[260px] rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="flex items-center justify-center gap-2 p-3 text-xs text-primary"><span className="status-dot-success animate-pulse-soft" />Point the camera at a QR code…</p>
            </div>
          )}

          {previewUrl && !scanning && (
            <div className="flex min-h-40 flex-1 items-center justify-center rounded-lg border border-border bg-background-secondary p-3">
              <AppImage key={previewUrl} src={previewUrl} alt="Uploaded image scanned for a QR code" width={320} height={320} className="max-h-[40vh] w-auto rounded object-contain" unoptimized />
            </div>
          )}
          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) processImage(file); e.target.value = ''; }} />
        </div>}
        outputPanel={<div className="flex flex-1 flex-col gap-4">
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          {result ? (
            <>
              <div className="rounded-lg border border-border bg-background-secondary/50 p-4">
                {kind === 'URL' ? (
                  <a href={result} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 break-all font-mono text-sm text-primary hover:underline">
                    {result}
                    <ExternalLink size={13} className="mt-1 flex-shrink-0" />
                  </a>
                ) : kind === 'JSON' ? (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-foreground">{JSON.stringify(JSON.parse(result), null, 2)}</pre>
                ) : (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">{result}</pre>
                )}
                {kind === 'Wi-Fi' && (
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    {parseWifi(result).map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="break-all font-mono text-foreground">{v}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                )}
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">{result.length} characters{source ? ` · from ${source}` : ''}</p>
              </div>
              {kind === 'KHQR / EMV' && <KhqrResult data={result} />}
            </>
          ) : !error && (
            <OutputPlaceholder icon={<ScanLine size={30} />} title="No QR code scanned yet" description="Upload or drop an image, paste from clipboard, or use your camera" />
          )}
        </div>}
        outputText={result}
        outputStatus={error ? 'error' : result ? 'success' : 'idle'}
        downloadName="qr-result.txt"
        onClear={clear}
      />
    </ToolFrame>
  );
}
