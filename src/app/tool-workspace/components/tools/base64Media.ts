import { detectDocumentKind } from './base64Document';

export interface BinaryInfo {
  mime: string;
  ext: string;
  label: string;
  /** True when the browser can show it in an <img>. */
  isImage: boolean;
  /** True when it's a known file type (as opposed to unrecognised bytes). */
  known: boolean;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return bytes.length >= offset + signature.length && signature.every((value, i) => bytes[offset + i] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .replace(/^﻿/, '')
    .trimStart();
  return /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)?(<!doctype\s+svg[^>]*>\s*)?<svg[\s>]/i.test(head);
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'application/pdf': 'pdf',
};

/** Identifies decoded bytes by their signature; `mimeHint` (from a data URI) is a fallback only. */
export function describeBinary(bytes: Uint8Array, mimeHint?: string): BinaryInfo {
  const image = (mime: string, label: string): BinaryInfo => ({
    mime,
    ext: MIME_EXTENSIONS[mime] ?? 'img',
    label,
    isImage: true,
    known: true,
  });

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return image('image/png', 'PNG image');
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return image('image/jpeg', 'JPEG image');
  if (ascii(bytes, 0, 4) === 'GIF8') return image('image/gif', 'GIF image');
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return image('image/webp', 'WebP image');
  if (ascii(bytes, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(bytes, 8, 12))) {
    return image('image/avif', 'AVIF image');
  }
  if (startsWith(bytes, [0x42, 0x4d]) && bytes.length > 14 && bytes.subarray(6, 10).every((b) => b === 0)) {
    return image('image/bmp', 'BMP image');
  }
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return image('image/x-icon', 'ICO icon');
  if (looksLikeSvg(bytes)) return image('image/svg+xml', 'SVG image');

  const kind = detectDocumentKind(bytes);
  if (kind === 'pdf') {
    return { mime: 'application/pdf', ext: 'pdf', label: 'PDF document', isImage: false, known: true };
  }
  if (kind === 'docx') {
    return {
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ext: 'docx',
      label: 'Word document (.docx)',
      isImage: false,
      known: true,
    };
  }
  if (kind === 'xlsx') {
    return {
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ext: 'xlsx',
      label: 'Excel workbook (.xlsx)',
      isImage: false,
      known: true,
    };
  }

  // Unrecognised bytes: trust an explicit image/* hint so uncommon formats still preview.
  if (mimeHint?.startsWith('image/')) {
    return {
      mime: mimeHint,
      ext: MIME_EXTENSIONS[mimeHint] ?? mimeHint.split('/')[1].split('+')[0] ?? 'img',
      label: `${mimeHint} (from data URI)`,
      isImage: true,
      known: false,
    };
  }

  return { mime: 'application/octet-stream', ext: 'bin', label: 'Unknown binary data', isImage: false, known: false };
}
