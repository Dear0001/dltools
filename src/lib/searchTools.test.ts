import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchTools } from './searchTools';
import { CATEGORIES, CATEGORY_COUNTS, TOOLS } from '@/data/tools';

const ids = (query: string, locale: 'en' | 'kh' = 'en') => searchTools(query, locale).map((tool) => tool.id);

describe('searchTools', () => {
  it('returns every tool for an empty query', () => {
    expect(searchTools('  ', 'en')).toHaveLength(TOOLS.length);
  });

  it('ranks name matches first', () => {
    expect(ids('json formatter')[0]).toBe('tool-json-formatter');
  });

  it('finds tools by Khmer name while the interface is in English', () => {
    expect(ids('បង្កើតពាក្យសម្ងាត់', 'en')).toContain('tool-password-generator');
  });

  it('finds tools by English name while the interface is in Khmer', () => {
    expect(ids('password', 'kh')).toContain('tool-password-generator');
  });

  it('matches descriptions and tags', () => {
    expect(ids('crc16')).toContain('tool-khqr-builder');
    expect(ids('subnet')).toContain('tool-ip-cidr');
  });

  it('ignores zero-width spaces in Khmer queries', () => {
    expect(normalizeSearchText('ពាក្យ​សម្ងាត់')).toBe('ពាក្យសម្ងាត់');
    expect(ids('ពាក្យ​សម្ងាត់')).toContain('tool-password-generator');
  });

  it('returns nothing for nonsense', () => {
    expect(ids('zzqxv')).toEqual([]);
  });
});

describe('category taxonomy', () => {
  it('assigns every tool to a known category and counts add up', () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    expect(TOOLS.every((tool) => known.has(tool.category))).toBe(true);
    expect(Object.values(CATEGORY_COUNTS).reduce((a, b) => a + b, 0)).toBe(TOOLS.length);
    expect(Object.values(CATEGORY_COUNTS).every((n) => n > 0)).toBe(true);
  });
});
