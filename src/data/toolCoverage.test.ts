import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, TOOLS, getToolSlug } from './tools';
import { getToolContent } from './toolContent';
import { getToolContentKh } from './toolContentKh';
import { getToolPrivacyMode } from './toolPrivacy';
import { getCategoryName, getToolDescription, getToolName } from '@/i18n/LocaleProvider';
import { searchTools } from '@/lib/searchTools';

const hasKhmer = (value: string) => /[ក-៿]/.test(value);
const shell = readFileSync('src/app/tool-workspace/components/WorkspaceShell.tsx', 'utf8');

describe('every tool is complete', () => {
  it('has 44 tools with unique ids and slugs', () => {
    expect(TOOLS).toHaveLength(44);
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map(getToolSlug)).size).toBe(TOOLS.length);
  });

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s has a workspace panel', (id) => {
    expect(shell).toContain(`'${id}':`);
  });

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s has Khmer name and description', (id, tool) => {
    expect(hasKhmer(getToolName(id, tool.name, 'kh')), 'Khmer name').toBe(true);
    expect(hasKhmer(getToolDescription(id, tool.description, 'kh')), 'Khmer description').toBe(true);
  });

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s has English and Khmer how-to content', (_id, tool) => {
    const slug = getToolSlug(tool);
    const en = getToolContent(slug);
    const kh = getToolContentKh(slug);
    expect(en, 'English content').toBeDefined();
    expect(kh, 'Khmer content').toBeDefined();
    expect(kh?.steps.length).toBe(en?.steps.length);
  });

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s is found by its English and Khmer name', (id, tool) => {
    expect(searchTools(tool.name).map((t) => t.id)).toContain(id);
    expect(searchTools(getToolName(id, tool.name, 'kh')).map((t) => t.id)).toContain(id);
  });

  it('has Khmer category names', () => {
    for (const c of CATEGORIES) expect(hasKhmer(getCategoryName(c.id, c.label, 'kh'))).toBe(true);
  });

  it('works with a category scope', () => {
    const scoped = TOOLS.filter((t) => t.category === 'qr');
    const results = searchTools('qr', 'en', scoped);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((t) => t.category === 'qr')).toBe(true);
  });

  it('marks only the API tester as sending network requests', () => {
    expect(TOOLS.filter((t) => getToolPrivacyMode(t.id) === 'network').map((t) => t.id)).toEqual(['tool-api-tester']);
  });
});

describe('how-to steps', () => {
  // The <ol> numbers each step; text that also starts with a number reads "1. 1 Paste…".
  const leadingNumber = /^\s*(?:step\s*)?[0-9០-៩]+\s*[.):\-–]?\s/i;
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s steps do not repeat the list number', (_id, tool) => {
    const slug = getToolSlug(tool);
    for (const step of [...(getToolContent(slug)?.steps ?? []), ...(getToolContentKh(slug)?.steps ?? [])]) {
      expect(step, step).not.toMatch(leadingNumber);
    }
  });

  it('renders steps with native list numbering only', () => {
    const source = readFileSync('src/app/tools/[slug]/ToolContent.tsx', 'utf8');
    expect(source).toContain('list-decimal');
    expect(source).not.toMatch(/\{index \+ 1\}/);
  });
});
