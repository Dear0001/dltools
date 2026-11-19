'use client';
import React, { useEffect, useState } from 'react';
import { useLs } from './shared';

/** Join link for a pairing code. `join=1` makes the join page connect immediately, so opening it is enough. */
export function joinLink(code: string): string {
  return `${window.location.origin}/live-share/join?code=${encodeURIComponent(code)}&join=1`;
}

/** Renders a QR that opens the join page and joins right away. Generated locally in the browser. */
export default function PairingQr({ code, size = 176 }: { code: string; size?: number }) {
  const { t } = useLs();
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    const link = joinLink(code);
    // Loaded on demand so the QR library is not part of every tool page's JavaScript.
    import('qrcode')
      .then((mod) => (mod.default ?? mod).toDataURL(link, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }))
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(''); });
    return () => { cancelled = true; };
  }, [code, size]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-muted" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt={t('qrAlt')} className="rounded-lg border border-border bg-white p-1" />;
}
