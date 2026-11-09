import { describe, expect, it } from 'vitest';
import { describeBinary } from './base64Media';

const bytes = (...values: number[]) => Uint8Array.from(values);
const text = (value: string) => Uint8Array.from(Buffer.from(value, 'latin1'));

describe('describeBinary', () => {
  it('detects PNG', () => {
    expect(describeBinary(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toMatchObject({
      mime: 'image/png',
      ext: 'png',
      isImage: true,
    });
  });

  it('detects JPEG', () => {
    expect(describeBinary(bytes(0xff, 0xd8, 0xff, 0xe0))).toMatchObject({ mime: 'image/jpeg', ext: 'jpg' });
  });

  it('detects GIF', () => {
    expect(describeBinary(text('GIF89a....'))).toMatchObject({ mime: 'image/gif', ext: 'gif' });
  });

  it('detects WebP', () => {
    expect(describeBinary(text('RIFF\x00\x00\x00\x00WEBPVP8 '))).toMatchObject({ mime: 'image/webp', ext: 'webp' });
  });

  it('detects AVIF', () => {
    expect(describeBinary(text('\x00\x00\x00\x1cftypavif'))).toMatchObject({ mime: 'image/avif', ext: 'avif' });
  });

  it('detects BMP and rejects text that merely starts with "BM"', () => {
    const bmp = new Uint8Array(30);
    bmp[0] = 0x42;
    bmp[1] = 0x4d;
    expect(describeBinary(bmp)).toMatchObject({ mime: 'image/bmp' });
    expect(describeBinary(text('BM is a short text, not a bitmap')).isImage).toBe(false);
  });

  it('detects SVG, with and without an XML prolog', () => {
    expect(describeBinary(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toMatchObject({
      mime: 'image/svg+xml',
      ext: 'svg',
    });
    expect(describeBinary(text('<?xml version="1.0"?>\n<svg width="1"/>')).mime).toBe('image/svg+xml');
  });

  it('does not treat other XML or HTML as SVG', () => {
    expect(describeBinary(text('<html><svg></svg></html>')).isImage).toBe(false);
  });

  it('detects PDF, Word and Excel as non-images', () => {
    expect(describeBinary(text('%PDF-1.7'))).toMatchObject({ mime: 'application/pdf', ext: 'pdf', isImage: false });
    expect(describeBinary(text('PK\x03\x04word/document.xml'))).toMatchObject({ ext: 'docx', isImage: false });
    expect(describeBinary(text('PK\x03\x04xl/workbook.xml'))).toMatchObject({ ext: 'xlsx', isImage: false });
  });

  it('uses an image/* data-URI hint for unrecognised bytes', () => {
    const result = describeBinary(text('???? unknown'), 'image/heic');
    expect(result).toMatchObject({ mime: 'image/heic', ext: 'heic', isImage: true, known: false });
  });

  it('ignores a non-image hint when the bytes are unknown', () => {
    expect(describeBinary(text('plain text'), 'text/plain')).toMatchObject({
      mime: 'application/octet-stream',
      ext: 'bin',
      known: false,
    });
  });

  it('prefers the real signature over a wrong hint', () => {
    expect(describeBinary(bytes(0xff, 0xd8, 0xff), 'image/png').mime).toBe('image/jpeg');
  });
});
