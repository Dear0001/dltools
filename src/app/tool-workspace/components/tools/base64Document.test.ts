import { describe, expect, it } from 'vitest';
import {
  detectDocumentKind,
  formatBytes,
  parseBase64Input,
  resolveOutput,
} from './base64Document';

const b64 = (text: string) => Buffer.from(text, 'latin1').toString('base64');
const ascii = (text: string) => Uint8Array.from(Buffer.from(text, 'latin1'));

const PDF = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF';
const DOCX = 'PK\x03\x04\x14\x00word/document.xml';
const XLSX = 'PK\x03\x04\x14\x00xl/workbook.xml';
const PPTX = 'PK\x03\x04\x14\x00ppt/presentation.xml';
const OLE = '\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1rest';

describe('parseBase64Input', () => {
  it('decodes plain Base64', () => {
    const result = parseBase64Input(b64(PDF));
    expect(result.ok).toBe(true);
    if (result.ok) expect(Buffer.from(result.bytes).toString('latin1')).toBe(PDF);
  });

  it('decodes a data URI and reports its MIME type', () => {
    const result = parseBase64Input(`data:application/pdf;base64,${b64(PDF)}`);
    expect(result.ok && result.mime).toBe('application/pdf');
  });

  it('ignores whitespace and line breaks', () => {
    const encoded = b64(PDF);
    const wrapped = encoded.replace(/(.{10})/g, '$1\n  ');
    const result = parseBase64Input(wrapped);
    expect(result.ok).toBe(true);
  });

  it('ignores JSON-escaped newlines and slashes', () => {
    const encoded = b64('\xff\xfe\xfd?????>>>>');
    const escaped = `"${encoded.slice(0, 8)}\\n${encoded.slice(8).replace(/\//g, '\\/')}"`;
    const plain = parseBase64Input(encoded);
    const result = parseBase64Input(escaped);
    expect(result.ok && plain.ok && Array.from(result.bytes)).toEqual(plain.ok ? Array.from(plain.bytes) : []);
  });

  it('accepts URL-safe Base64 without padding', () => {
    const bytes = '\xfb\xff\xfe';
    const urlSafe = Buffer.from(bytes, 'latin1').toString('base64url');
    const result = parseBase64Input(urlSafe);
    expect(result.ok && Array.from(result.bytes)).toEqual([0xfb, 0xff, 0xfe]);
  });

  it('restores missing padding', () => {
    const result = parseBase64Input(b64('ab').replace(/=+$/, ''));
    expect(result.ok && Buffer.from(result.bytes).toString()).toBe('ab');
  });

  it('rejects empty input', () => {
    expect(parseBase64Input('   ')).toEqual({ ok: false, error: 'Paste a Base64 string to convert.' });
  });

  it('rejects invalid characters', () => {
    const result = parseBase64Input('abcd$efg');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('"$"');
  });

  it('rejects padding in the middle', () => {
    expect(parseBase64Input('ab=cdefg').ok).toBe(false);
  });

  it('rejects truncated data (length % 4 === 1)', () => {
    const result = parseBase64Input('abcde');
    expect(result.ok).toBe(false);
  });

  it('rejects data URIs that are not Base64', () => {
    expect(parseBase64Input('data:text/plain,hello').ok).toBe(false);
    expect(parseBase64Input('data:application/pdf;base64').ok).toBe(false);
  });
});

describe('detectDocumentKind', () => {
  it('detects PDF', () => expect(detectDocumentKind(ascii(PDF))).toBe('pdf'));
  it('detects docx', () => expect(detectDocumentKind(ascii(DOCX))).toBe('docx'));
  it('detects xlsx', () => expect(detectDocumentKind(ascii(XLSX))).toBe('xlsx'));
  it('detects pptx', () => expect(detectDocumentKind(ascii(PPTX))).toBe('pptx'));
  it('detects legacy OLE files', () => expect(detectDocumentKind(ascii(OLE))).toBe('legacy-office'));
  it('detects generic zips', () => expect(detectDocumentKind(ascii('PK\x03\x04xx'))).toBe('zip'));
  it('treats anything else as unknown', () => {
    expect(detectDocumentKind(ascii('hello'))).toBe('unknown');
    expect(detectDocumentKind(new Uint8Array())).toBe('unknown');
  });
  it('tolerates a few bytes before %PDF-', () => {
    expect(detectDocumentKind(ascii(`\n\n${PDF}`))).toBe('pdf');
  });
  it('does not mistake %PDF- deep in a file for a PDF', () => {
    expect(detectDocumentKind(ascii(`${'x'.repeat(2000)}%PDF-`))).toBe('unknown');
  });
});

describe('resolveOutput', () => {
  it('auto-selects by detected kind', () => {
    expect(resolveOutput('auto', 'pdf')).toMatchObject({ status: 'ready', ext: 'pdf', target: 'pdf' });
    expect(resolveOutput('auto', 'docx')).toMatchObject({ status: 'ready', ext: 'docx', target: 'word' });
    expect(resolveOutput('auto', 'xlsx')).toMatchObject({ status: 'ready', ext: 'xlsx', target: 'excel' });
  });

  it('uses the correct MIME types', () => {
    const word = resolveOutput('auto', 'docx');
    const excel = resolveOutput('auto', 'xlsx');
    expect(word.status === 'ready' && word.mime).toContain('wordprocessingml');
    expect(excel.status === 'ready' && excel.mime).toContain('spreadsheetml');
  });

  it('asks the user to choose for legacy Office files', () => {
    expect(resolveOutput('auto', 'legacy-office').status).toBe('needs-choice');
  });

  it('uses the data URI MIME for legacy Office files', () => {
    expect(resolveOutput('auto', 'legacy-office', 'application/msword')).toMatchObject({ ext: 'doc' });
    expect(resolveOutput('auto', 'legacy-office', 'application/vnd.ms-excel')).toMatchObject({ ext: 'xls' });
  });

  it('uses legacy extensions when a legacy file is explicitly chosen', () => {
    expect(resolveOutput('word', 'legacy-office')).toMatchObject({ ext: 'doc', warning: undefined });
    expect(resolveOutput('excel', 'legacy-office')).toMatchObject({ ext: 'xls', warning: undefined });
  });

  it('reports unsupported data in auto mode', () => {
    const result = resolveOutput('auto', 'unknown');
    expect(result.status).toBe('unsupported');
  });

  it('lets the user force a format and warns about the mismatch', () => {
    const result = resolveOutput('pdf', 'docx');
    expect(result).toMatchObject({ status: 'ready', ext: 'pdf' });
    expect(result.status === 'ready' && result.warning).toMatch(/may not open/);
  });

  it('does not warn when the selection matches', () => {
    const result = resolveOutput('word', 'docx');
    expect(result.status === 'ready' && result.warning).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});
