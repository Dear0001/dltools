import { describe, expect, it } from 'vitest';
import { TOOLS } from '@/data/tools';
import { LIVE_SHARE_EXCLUDED_TOOLS, LIVE_SHARE_TOOLS, checkField, getLiveShareTool, isLiveShareTool } from './registry';

describe('Live Share tool registry', () => {
  it('only lists tools that exist', () => {
    const ids = new Set(TOOLS.map((t) => t.id));
    for (const id of Object.keys(LIVE_SHARE_TOOLS)) expect(ids.has(id), id).toBe(true);
  });

  it('never shares credential or file tools', () => {
    for (const id of LIVE_SHARE_EXCLUDED_TOOLS) expect(isLiveShareTool(id), id).toBe(false);
    const ids = new Set(TOOLS.map((t) => t.id));
    for (const id of LIVE_SHARE_EXCLUDED_TOOLS) expect(ids.has(id), `${id} should be a real tool id`).toBe(true);
  });

  it('every tool declares at least one input and one output-ish field, with sane limits', () => {
    for (const [id, spec] of Object.entries(LIVE_SHARE_TOOLS)) {
      const fields = Object.values(spec.fields);
      expect(fields.some((f) => f.role === 'input'), `${id} input`).toBe(true);
      for (const f of fields) {
        expect(f.maxChars, id).toBeGreaterThan(0);
        expect(f.maxChars, id).toBeLessThanOrEqual(f.optIn ? 400_000 : 200_000);
        if (f.kind === 'enum') expect(f.values?.length, id).toBeGreaterThan(0);
      }
    }
  });

  it('rejects unknown fields, wrong types and bad enum values for the new tools', () => {
    expect(checkField('tool-json-schema', 'schema', '{}').ok).toBe(true);
    expect(checkField('tool-json-schema', 'password', 'x').ok).toBe(false);
    expect(checkField('tool-css-formatter', 'language', 'scss').ok).toBe(true);
    expect(checkField('tool-css-formatter', 'language', 'php').ok).toBe(false);
    expect(checkField('tool-json-diff', 'mode', 'unified').ok).toBe(true);
    expect(checkField('tool-text-diff', 'left', 5).ok).toBe(false);
    expect(checkField('tool-password-generator', 'password', 'x').ok).toBe(false);
  });

  it('shares the KHQR tools natively, with uploaded images gated behind file sharing', () => {
    expect(isLiveShareTool('tool-khqr-validator')).toBe(true);
    expect(isLiveShareTool('tool-khqr-builder')).toBe(true);
    expect(LIVE_SHARE_TOOLS['tool-khqr-builder'].native).toBe(true);
    expect(checkField('tool-khqr-builder', 'khqr', '00020101021229').ok).toBe(true);
    expect(checkField('tool-khqr-builder', 'logoSize', '0.16').ok).toBe(true);
    expect(checkField('tool-khqr-builder', 'logoSize', 'big').ok).toBe(false);
    expect(checkField('tool-khqr-builder', 'merchantSecret', 'x').ok).toBe(false);
    const fields = LIVE_SHARE_TOOLS['tool-khqr-builder'].fields;
    expect(fields.logo.optIn).toBe('files');
    expect(fields.headerImage.optIn).toBe('files');
    expect(isLiveShareTool('tool-ip-cidr')).toBe(false);
  });

  it('adds the host theme and language to every tool, and validates them', () => {
    for (const id of Object.keys(LIVE_SHARE_TOOLS)) {
      const spec = getLiveShareTool(id)!;
      expect(spec.fields['ws.theme'], id).toBeDefined();
      expect(spec.fields['ws.locale'], id).toBeDefined();
    }
    expect(checkField('tool-json-formatter', 'ws.theme', 'midnight').ok).toBe(true);
    expect(checkField('tool-json-formatter', 'ws.theme', 'hotpink').ok).toBe(false);
    expect(checkField('tool-json-formatter', 'ws.locale', 'kh').ok).toBe(true);
    expect(checkField('tool-json-formatter', 'ws.locale', 'fr').ok).toBe(false);
  });

  it('validates numbers and booleans carried as strings', () => {
    expect(checkField('tool-json-formatter', 'indent', '4').ok).toBe(true);
    expect(checkField('tool-json-formatter', 'indent', '4; DROP').ok).toBe(false);
    expect(checkField('tool-json-formatter', 'indent', '').ok).toBe(false);
    expect(checkField('tool-json-formatter', 'sortKeys', 'true').ok).toBe(true);
    expect(checkField('tool-json-formatter', 'sortKeys', 'yes').ok).toBe(false);
  });

  it('marks the seven priority tools as native (real UI on the viewer)', () => {
    for (const id of ['tool-json-formatter', 'tool-json-schema', 'tool-json-diff', 'tool-sql-formatter', 'tool-js-formatter', 'tool-regex-tester', 'tool-base64-document']) {
      expect(LIVE_SHARE_TOOLS[id].native, id).toBe(true);
    }
  });

  it('flags the Base64 input as file content that needs host opt-in', () => {
    expect(LIVE_SHARE_TOOLS['tool-base64-document'].fields.input.optIn).toBe('files');
  });
});
