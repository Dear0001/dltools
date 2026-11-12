'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { Download, ImageIcon, Wrench, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { KHQR_SAMPLE } from './khqrSample';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useDebouncedValue } from '../useDebouncedValue';
import { analyzeKhqr, formatAmount, withCorrectCrc } from './emvQr';

/** Render scale for crisp PNG export (card is 400×560 CSS px). */
const EXPORT_SCALE = 3;

export default function KhqrBuilderPanel({ tool: _tool }: { tool: Tool }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRequestRef = useRef(0);
  const [khqrString, setKhqrString] = useState('');
  const [generated, setGenerated] = useState(false);
  const [customString, setCustomString] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const defaultLogo = '/assets/images/bakong-mark.png';
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(defaultLogo);
  const [logoName, setLogoName] = useState<string | null>('Bakong logo');
  const [logoSize, setLogoSize] = useState(0.16);
  const [headerText, setHeaderText] = useState('KHQR');
  const [headerImageDataUrl, setHeaderImageDataUrl] = useState<string | null>(null);
  const [headerImageName, setHeaderImageName] = useState('');
  const [headerColor, setHeaderColor] = useState('#e31b23');
  const debouncedCustomString = useDebouncedValue(customString, 200);

  // no external form state - only raw string input

  // Render the card, QR, optional custom header artwork, and center logo.
  const renderQr = async (content: string) => {
    const outputCanvas = canvasRef.current;
    if (!outputCanvas) return false;
    const requestId = ++renderRequestRef.current;
    const canvas = document.createElement('canvas');
    const cardWidth = 400;
    const cardHeight = 560;
    const qrSize = 300;
    canvas.width = cardWidth * EXPORT_SCALE;
    canvas.height = cardHeight * EXPORT_SCALE;
    const qrCanvas = document.createElement('canvas');
    const opts: Parameters<typeof QRCode.toCanvas>[2] = {
      width: qrSize * EXPORT_SCALE,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
      errorCorrectionLevel: 'H',
    };
    await QRCode.toCanvas(qrCanvas, content, opts);

    if (requestId !== renderRequestRef.current) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, cardWidth, cardHeight, 12);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cardWidth, cardHeight);
    ctx.fillStyle = headerColor;
    ctx.beginPath();
    const headerHeight = 88;
    const headerContentCenterY = 32.5;
    ctx.moveTo(0, 0);
    ctx.lineTo(cardWidth, 0);
    ctx.lineTo(cardWidth, headerHeight);
    ctx.lineTo(cardWidth - 30, headerHeight - 30);
    ctx.lineTo(0, headerHeight - 30);
    ctx.closePath();
    ctx.fill();
    if (headerImageDataUrl) {
      const headerImage = new Image();
      headerImage.src = headerImageDataUrl;
      await new Promise<void>((resolve, reject) => {
        headerImage.onload = () => {
          const maxWidth = cardWidth * 0.32;
          const maxHeight = 24;
          const scale = Math.min(maxWidth / headerImage.naturalWidth, maxHeight / headerImage.naturalHeight);
          const width = headerImage.naturalWidth * scale;
          const height = headerImage.naturalHeight * scale;
          ctx.drawImage(headerImage, (cardWidth - width) / 2, headerContentCenterY - height / 2, width, height);
          resolve();
        };
        headerImage.onerror = () => reject(new Error('Could not load the header image.'));
      });
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 30px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(headerText.slice(0, 24) || 'KHQR', cardWidth / 2, headerContentCenterY);
    }

    const { fields } = analyzeKhqr(content);
    const merchantName = fields.merchantName ?? '';
    if (merchantName) {
      ctx.fillStyle = '#1f2937';
      ctx.font = '400 15px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(merchantName.slice(0, 38), 40, 101);
    }
    const amount = fields.amount ?? '';
    const currencyCode = fields.currencyCode ?? '';
    const currency = currencyCode === '116' || currencyCode === '840' ? fields.currency ?? '' : currencyCode;
    const hasKnownCurrency = currencyCode === '116' || currencyCode === '840';
    const formattedAmount = formatAmount(fields, currencyCode === '840' ? '0.0' : '0');
    if (amount !== '' || hasKnownCurrency) {
      ctx.fillStyle = '#080808';
      ctx.font = '700 34px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formattedAmount, 40, 145);
      const amountWidth = ctx.measureText(formattedAmount).width;
      ctx.fillStyle = '#374151';
      ctx.font = '400 13px Arial, sans-serif';
      ctx.fillText(currency, 48 + amountWidth, 145);
    }
    ctx.strokeStyle = '#e5e7eb';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(cardWidth, 180);
    ctx.stroke();
    ctx.setLineDash([]);

    const qrX = Math.round((cardWidth - qrSize) / 2);
    const qrY = 208;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    ctx.restore();

    if (logoDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoDataUrl;
      await new Promise((res, rej) => {
        img.onload = () => {
          try {
            const size = Math.floor(qrSize * logoSize);
            const x = Math.floor((cardWidth - size) / 2);
            const y = qrY + Math.floor((qrSize - size) / 2);
            const radius = Math.floor(size / 2);
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.imageSmoothingEnabled = true;
            // preserve aspect ratio
            const iw = img.width;
            const ih = img.height;
            const ratio = Math.min(size / iw, size / ih);
            const dw = Math.round(iw * ratio);
            const dh = Math.round(ih * ratio);
            const dx = x + Math.round((size - dw) / 2);
            const dy = y + Math.round((size - dh) / 2);
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
            res(true);
          } catch (err) { rej(err); }
        };
        img.onerror = rej;
      });
    }
    if (requestId !== renderRequestRef.current) return false;
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) return false;
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    outputContext.clearRect(0, 0, canvas.width, canvas.height);
    outputContext.drawImage(canvas, 0, 0);
    return true;
  };

  // Update the QR after a short pause; leave the source text exactly as entered.
  useEffect(() => {
    const content = debouncedCustomString;
    if (customString !== debouncedCustomString) {
      setKhqrString('');
      setGenerated(false);
      return () => { renderRequestRef.current += 1; };
    }
    if (!content.trim()) {
      renderRequestRef.current += 1;
      setKhqrString('');
      setGenerated(false);
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    let cancelled = false;
    setKhqrString(content);
    renderQr(content)
      .then((rendered) => { if (!cancelled) setGenerated(rendered); })
      .catch(() => { if (!cancelled) setGenerated(false); });
    return () => {
      cancelled = true;
      renderRequestRef.current += 1;
    };
    // renderQr reads only the appearance settings listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customString, debouncedCustomString, fgColor, bgColor, logoDataUrl, logoSize, headerText, headerImageDataUrl, headerColor]);

  // File / drag-drop handlers for logo image
  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result));
      setLogoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderImage = (file: File | null) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Choose a PNG, JPG, or WebP image for the header.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Header image must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setHeaderImageDataUrl(String(reader.result));
      setHeaderImageName(file.name);
    };
    reader.onerror = () => toast.error('Could not read this header image.');
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeLogo = () => {
    setLogoDataUrl(defaultLogo);
    setLogoName('Bakong logo');
  };

  const removeHeaderImage = () => {
    setHeaderImageDataUrl(null);
    setHeaderImageName('');
  };

  const analysis = khqrString ? analyzeKhqr(khqrString) : null;
  const fileBase = (analysis?.fields.merchantName || 'khqr').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'khqr';

  const downloadQr = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileBase}-khqr.png`;
    a.click();
  };

  const copyImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ClipboardItem === 'undefined') {
      toast.error('Copying images is not supported in this browser');
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('QR image copied');
      } catch {
        toast.error('Clipboard access denied');
      }
    }, 'image/png');
  };

  const fixCrc = () => {
    renderRequestRef.current += 1;
    setCustomString(withCorrectCrc(customString));
    toast.success('CRC recalculated');
  };

  const changeString = (value: string) => {
    renderRequestRef.current += 1;
    setGenerated(false);
    setCustomString(value);
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  };
  const sectionTitle = 'mb-3 text-xs font-semibold text-muted-foreground';

  return (
    <ToolFrame notice={generated ? 'QR code updates automatically as you type.' : 'Enter content to generate a QR preview automatically.'}>
      <PanelLayout
        inputLabel="Encode string"
        outputLabel="QR Code Preview"
        inputBody="content"
        outputBody="content"
        inputPanel={<div className="space-y-5">
          <section>
            <label className="field-label" htmlFor="khqr-raw">Raw string</label>
            <textarea id="khqr-raw" value={customString} onChange={(e) => changeString(e.target.value)} placeholder="Enter the string to encode as QR code" className="input-code min-h-[120px] resize-y text-xs" />
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Foreground</span><input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-9 w-9 rounded border border-border p-0" /></label>
              <label className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Background</span><input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-9 w-9 rounded border border-border p-0" /></label>
              <span className="text-2xs text-muted-foreground">Background is also used behind the center logo</span>
            </div>
          </section>
          <section className="border-t border-border pt-4">
            <h3 className={sectionTitle}>Card header</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <label className="text-xs text-muted-foreground">
                Header text
                <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} maxLength={24} disabled={Boolean(headerImageDataUrl)} placeholder="KHQR" className="input-field mt-1 disabled:opacity-50" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Header color
                <input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="h-10 w-14 rounded border border-border bg-transparent p-1" />
              </label>
              <div className="text-xs text-muted-foreground">
                Header shape
                <span className="input-field mt-1 flex items-center text-foreground">Folded corner</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                {headerImageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={headerImageDataUrl} alt="Custom header artwork" className="h-10 w-20 rounded bg-muted object-contain p-1" />
                ) : (
                  <div className="flex h-10 w-20 items-center justify-center rounded bg-muted text-xs font-semibold text-foreground">{headerText || 'KHQR'}</div>
                )}
                <div className="min-w-0 text-xs">
                  <div className="truncate text-foreground">{headerImageName || 'Use custom header image'}</div>
                  <div className="text-2xs text-muted-foreground">PNG, JPG, or WebP · up to 5 MB · stays on this device</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="khqr-header-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { handleHeaderImage(e.target.files?.[0] ?? null); e.target.value = ''; }} className="hidden" />
                <label htmlFor="khqr-header-upload" className="btn-ghost cursor-pointer text-xs">Upload image</label>
                {headerImageDataUrl && <button type="button" className="btn-ghost text-xs" onClick={removeHeaderImage}>Use text</button>}
              </div>
            </div>
            <p className="mt-2 text-2xs text-muted-foreground">An uploaded image replaces the header text. Color and shape still apply to the band behind it.</p>
          </section>
          <section className="border-t border-border pt-4">
            <h3 className={sectionTitle}>Logo (center) — drag & drop or upload</h3>
            <div onDrop={handleDrop} onDragOver={handleDragOver} className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-background-secondary">
                  {logoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoDataUrl} alt={logoName || 'logo'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-2xs text-muted-foreground">No logo</div>
                  )}
                </div>
                <div className="text-xs">
                  <div className="text-foreground">{logoName || 'No file selected'}</div>
                  <div className="text-2xs text-muted-foreground">Supports PNG/JPG/SVG</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="logo-upload" type="file" accept="image/*" onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }} className="hidden" />
                <label htmlFor="logo-upload" className="btn-ghost cursor-pointer text-xs">Upload</label>
                {logoDataUrl && <button type="button" className="btn-ghost text-xs" onClick={removeLogo}>Remove</button>}
              </div>
            </div>
            <label className="mt-3 block">
              <span className="field-label">Logo size: {Math.round(logoSize * 100)}%</span>
              <input type="range" min={5} max={50} value={Math.round(logoSize * 100)} onChange={(e) => setLogoSize(Number(e.target.value) / 100)} className="w-full accent-primary" />
            </label>
          </section>
        </div>}
        outputActions={generated ? <button type="button" className="btn-icon gap-1 px-2 text-xs font-medium" onClick={copyImage} title="Copy image" aria-label="Copy image"><ImageIcon size={13} /><span className="hidden sm:inline">Image</span></button> : null}
        outputPanel={<div className="flex flex-col gap-4">
          <div className="flex items-center justify-center rounded-xl bg-muted/60 p-3">
            <canvas ref={canvasRef} className="h-auto w-full max-w-[300px] rounded-xl shadow-lg" />
          </div>
          {generated && (
            <button type="button" className="btn-primary w-full" onClick={downloadQr}>
              <Download size={14} />
              Download PNG · {400 * EXPORT_SCALE}×{560 * EXPORT_SCALE}
            </button>
          )}
          {khqrString && analysis && (
            <section className="rounded-lg border border-border bg-background-secondary/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Payload check</h3>
                {analysis.verdict === 'khqr' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 size={12} /> Valid KHQR</span>
                ) : analysis.verdict === 'emv' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warning"><AlertTriangle size={12} /> EMV, not KHQR</span>
                ) : analysis.verdict === 'invalid' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-error"><XCircle size={12} /> Invalid KHQR</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Plain QR content</span>
                )}
              </div>
              {analysis.verdict !== 'not-emv' && (
                <>
                  {(analysis.fields.merchantName || analysis.fields.amount) && (
                    <p className="mb-2 text-xs text-foreground">
                      {analysis.fields.merchantName}
                      {analysis.fields.amount && <span className="ml-1 font-semibold tabular-nums">· {analysis.fields.amount} {analysis.fields.currency}</span>}
                    </p>
                  )}
                  {analysis.checks.filter((c) => c.level !== 'pass').slice(0, 4).map((c) => (
                    <p key={c.id} className={`text-xs ${c.level === 'fail' ? 'text-error' : 'text-warning'}`}>• {c.title}: {c.detail}</p>
                  ))}
                  {analysis.crcValid !== true && analysis.tags.length > 0 && !analysis.trailing && (
                    <button type="button" className="btn-ghost mt-2 text-xs" onClick={fixCrc}><Wrench size={12} /> Recalculate CRC</button>
                  )}
                </>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Length: <span className="tabular-nums text-foreground">{khqrString.length}</span> chars
                {analysis.fields.crc && <>{' '}· CRC: <span className={`font-mono ${analysis.crcValid ? 'text-success' : 'text-error'}`}>{analysis.fields.crc}</span></>}
              </p>
            </section>
          )}
        </div>}
        outputText={generated ? khqrString : ''}
        outputStatus={generated ? 'success' : 'idle'}
        onDownload={downloadQr}
        canDownload={generated}
        onSample={() => changeString(KHQR_SAMPLE)}
        onClear={() => changeString('')}
      />
    </ToolFrame>
  );
}
