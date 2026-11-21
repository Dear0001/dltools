import { describe, expect, it } from 'vitest';
import { normalizeShareRoute, toolSlugOfRoute } from './routes';

describe('shareable routes', () => {
  it('allows the public tool routes only', () => {
    for (const r of ['/', '/tools', '/tools/json-formatter', '/categories/formatters']) expect(normalizeShareRoute(r)).toBe(r);
    expect(normalizeShareRoute('/tools/sql-formatter/')).toBe('/tools/sql-formatter');
  });
  it('refuses everything else', () => {
    for (const r of ['', '/live-share', '/live-share/join', '/favorites', '/api/weather', '/tools/a/b', '/tools/JSON', '/tools/x?y=1', '/tools/x#h',
      'http://x/tools', '//x', 'javascript:alert(1)', '/tools/-x', '/tools/' + 'a'.repeat(120), null, 7]) {
      expect(normalizeShareRoute(r), String(r)).toBeNull();
    }
  });
  it('extracts the tool slug', () => {
    expect(toolSlugOfRoute('/tools/regex-tester')).toBe('regex-tester');
    expect(toolSlugOfRoute('/tools')).toBeNull();
  });
});
