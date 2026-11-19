'use client';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useLs } from './shared';

/** Renders a QR that opens the join page with the code prefilled. Generated locally in the browser. */
export default function PairingQr({ code, size = 176 }: { code: string; size?: number }) {
  const { t } = useLs();
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    const link = `${window.location.origin}/live-share/join?code=${encodeURIComponent(code)}`;
    QRCode.toDataURL(link, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(''); });
    return () => { cancelled = true; };
  }, [code, size]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-muted" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt={t('qrAlt')} className="rounded-lg border border-border bg-white p-1" />;
}
