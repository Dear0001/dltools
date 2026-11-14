import { describe, expect, it } from 'vitest';
import { redactAnalyticsUrl } from './VercelAnalytics';

describe('redactAnalyticsUrl', () => {
  it('removes typed search text but keeps the category filter', () => {
    expect(redactAnalyticsUrl('https://dltools.vercel.app/tools?cat=data&q=my%20secret')).toBe('https://dltools.vercel.app/tools?cat=data');
  });
  it('leaves URLs without typed text unchanged', () => {
    expect(redactAnalyticsUrl('https://dltools.vercel.app/tools/json-formatter')).toBe('https://dltools.vercel.app/tools/json-formatter');
  });
  it('returns unparsable input as-is', () => {
    expect(redactAnalyticsUrl('not a url')).toBe('not a url');
  });
});
