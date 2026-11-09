// Decoding and type detection for the "Base64 → PDF / Word / Excel" tool.

export type DocumentKind = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'legacy-office' | 'zip' | 'unknown';
export type DocumentTarget = 'pdf' | 'word' | 'excel';
export type TargetOption = 'auto' | DocumentTarget;

export type Base64ParseResult =
  | { ok: true; bytes: Uint8Array; mime?: string }
  | { ok: false; error: string };

export const OUTPUT_TYPES: Record<DocumentTarget, { label: string; ext: string; mime: string }> = {
  pdf: { label: 'PDF', ext: 'pdf', mime: 'application/pdf' },
  word: {
    label: 'Word',
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  excel: {
    label: 'Excel',
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};

const LEGACY_OUTPUT: Record<'word' | 'excel', { ext: string; mime: string }> = {
  word: { ext: 'doc', mime: 'application/msword' },
  excel: { ext: 'xls', mime: 'application/vnd.ms-excel' },
};

/** Decodes plain Base64, URL-safe Base64, or a `data:` URI into bytes. */
export function parseBase64Input(input: string): Base64ParseResult {
  let text = input.trim();
  if (!text) return { ok: false, error: 'Paste a Base64 string to convert.' };

  // Strip quotes left over from copying a JSON string value.
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  let mime: string | undefined;
  if (/^data:/i.test(text)) {
    const comma = text.indexOf(',');
    if (comma === -1) return { ok: false, error: 'Invalid data URI: missing a comma before the data.' };
    const header = text.slice(5, comma);
    if (!/;base64$/i.test(header)) {
      return { ok: false, error: 'The data URI is not Base64 encoded.' };
    }
    mime = header.replace(/;base64$/i, '').split(';')[0].trim().toLowerCase() || undefined;
    text = text.slice(comma + 1);
  }

  // JSON-escaped newlines / slashes, then whitespace; URL-safe alphabet -> standard.
  text = text
    .replace(/\\[nrt]/g, '')
    .replace(/\\\//g, '/')
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  if (!text) return { ok: false, error: 'The Base64 payload is empty.' };

  const bad = text.match(/[^A-Za-z0-9+/=]/);
  if (bad) {
    return { ok: false, error: `Invalid Base64: unexpected character "${bad[0]}".` };
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    return { ok: false, error: 'Invalid Base64: "=" padding can only appear at the end.' };
  }

  const unpadded = text.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) {
    return { ok: false, error: 'Invalid Base64: the length is not valid (data is truncated or corrupted).' };
  }
  const padded = unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { ok: true, bytes, mime };
  } catch {
    return { ok: false, error: 'Invalid Base64: could not decode the string.' };
  }
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const codes = Array.from(needle, (char) => char.charCodeAt(0));
  const last = bytes.length - codes.length;
  outer: for (let i = 0; i <= last; i += 1) {
    if (bytes[i] !== codes[0]) continue;
    for (let j = 1; j < codes.length; j += 1) {
      if (bytes[i + j] !== codes[j]) continue outer;
    }
    return true;
  }
  return false;
}

/** Identifies the file type from magic bytes (and zip entry names for Office Open XML). */
export function detectDocumentKind(bytes: Uint8Array): DocumentKind {
  if (bytes.length === 0) return 'unknown';

  // %PDF- may be preceded by a few junk bytes, but the spec allows it only within the first 1024.
  if (containsAscii(bytes.subarray(0, Math.min(bytes.length, 1024)), '%PDF-')) return 'pdf';

  // OLE2 compound file: legacy .doc / .xls / .ppt
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'legacy-office';

  // ZIP container (docx / xlsx / pptx are zips). Entry names are stored uncompressed.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    if (containsAscii(bytes, 'word/')) return 'docx';
    if (containsAscii(bytes, 'xl/')) return 'xlsx';
    if (containsAscii(bytes, 'ppt/')) return 'pptx';
    return 'zip';
  }

  return 'unknown';
}

export const KIND_LABEL: Record<DocumentKind, string> = {
  pdf: 'PDF document',
  docx: 'Word document (.docx)',
  xlsx: 'Excel workbook (.xlsx)',
  pptx: 'PowerPoint (.pptx)',
  'legacy-office': 'Legacy Office file (.doc / .xls)',
  zip: 'ZIP archive',
  unknown: 'Unknown binary data',
};

export type OutputResolution =
  | { status: 'ready'; target: DocumentTarget; ext: string; mime: string; warning?: string }
  | { status: 'needs-choice'; message: string }
  | { status: 'unsupported'; message: string };

const EXPECTED_KINDS: Record<DocumentTarget, DocumentKind[]> = {
  pdf: ['pdf'],
  word: ['docx', 'legacy-office'],
  excel: ['xlsx', 'legacy-office'],
};

/** Decides the file extension / MIME type to save as, given the selection and what was detected. */
export function resolveOutput(
  selected: TargetOption,
  kind: DocumentKind,
  mimeHint?: string,
): OutputResolution {
  let target: DocumentTarget;

  if (selected === 'auto') {
    if (kind === 'pdf') target = 'pdf';
    else if (kind === 'docx') target = 'word';
    else if (kind === 'xlsx') target = 'excel';
    else if (kind === 'legacy-office') {
      if (mimeHint?.includes('msword')) target = 'word';
      else if (mimeHint?.includes('ms-excel')) target = 'excel';
      else {
        return {
          status: 'needs-choice',
          message: 'This is a legacy Office file. Choose Word or Excel to pick the right extension.',
        };
      }
    } else {
      return {
        status: 'unsupported',
        message: `This data looks like ${KIND_LABEL[kind].toLowerCase()}, not a PDF, Word or Excel file. Pick a format manually to download it anyway.`,
      };
    }
  } else {
    target = selected;
  }

  const base = OUTPUT_TYPES[target];
  const legacy = kind === 'legacy-office' && target !== 'pdf';
  const ext = legacy ? LEGACY_OUTPUT[target as 'word' | 'excel'].ext : base.ext;
  const mime = legacy ? LEGACY_OUTPUT[target as 'word' | 'excel'].mime : base.mime;

  const warning = EXPECTED_KINDS[target].includes(kind)
    ? undefined
    : `The data looks like ${KIND_LABEL[kind].toLowerCase()}, so the downloaded ${base.label} file may not open.`;

  return { status: 'ready', target, ext, mime, warning };
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
