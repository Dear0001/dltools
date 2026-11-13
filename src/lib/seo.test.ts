import { describe, expect, it } from 'vitest';
import { TOOLS, getToolPath } from '@/data/tools';
import { SITE_URL } from './site';
import {
  DEFAULT_OG_IMAGE,
  buildSiteJsonLd,
  buildToolJsonLd,
  getOgImageForTool,
  serializeJsonLd,
} from './seo';

describe('getOgImageForTool', () => {
  it('uses the dedicated image for the JSON converter', () => {
    expect(getOgImageForTool({ id: 'tool-data-converter' }).url).toBe('/assets/images/og-json-converter.jpg');
  });

  it('falls back to the default image', () => {
    expect(getOgImageForTool({ id: 'tool-uuid' })).toBe(DEFAULT_OG_IMAGE);
    expect(getOgImageForTool({ id: 'unknown' })).toBe(DEFAULT_OG_IMAGE);
  });

  it('declares the 1200x630 size used by link previews', () => {
    expect(DEFAULT_OG_IMAGE).toMatchObject({ width: 1200, height: 630 });
  });
});

describe('buildSiteJsonLd', () => {
  const graph = buildSiteJsonLd()['@graph'];

  it('describes the website and its organization', () => {
    expect(graph.map((node) => node['@type'])).toEqual(['WebSite', 'Organization']);
    expect(graph[0]).toMatchObject({ url: SITE_URL, name: 'DLTools' });
  });

  it('links the website to the organization by id', () => {
    expect(graph[0]).toMatchObject({ publisher: { '@id': graph[1]['@id'] } });
  });

  it('uses an absolute logo URL', () => {
    expect(graph[1]).toMatchObject({ logo: `${SITE_URL}/assets/images/app_logo.jpg` });
  });
});

interface AppNode {
  url: string;
  name: string;
  image?: string;
  applicationCategory?: string;
}

interface BreadcrumbNode {
  itemListElement: { name: string; position: number; item: string }[];
}

describe('buildToolJsonLd', () => {
  const tool = TOOLS.find((t) => t.id === 'tool-base64-document')!;
  const [app, breadcrumbs] = buildToolJsonLd(tool)['@graph'] as unknown as [AppNode, BreadcrumbNode];

  it('builds an absolute WebApplication entry', () => {
    expect(app).toMatchObject({
      '@type': 'WebApplication',
      name: tool.name,
      url: `${SITE_URL}${getToolPath(tool)}`,
      isAccessibleForFree: true,
      offers: { price: '0' },
      applicationCategory: 'UtilitiesApplication',
    });
    expect(app.image).toBe(`${SITE_URL}/assets/images/og-default.jpg`);
  });

  it('builds a four-level breadcrumb (home, all tools, category, tool) matching the visible trail', () => {
    expect(breadcrumbs.itemListElement.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    expect(breadcrumbs.itemListElement.map((item) => item.name)).toEqual(['Home', 'All Tools', 'PDF & Word', tool.name]);
    expect(breadcrumbs.itemListElement[2].item).toMatch(/\/tools\?cat=documents$/);
    expect(breadcrumbs.itemListElement[3].item).toBe(app.url);
  });

  it('classifies developer tools and utilities differently', () => {
    const json = TOOLS.find((t) => t.id === 'tool-json-formatter')!;
    expect((buildToolJsonLd(json)['@graph'][0] as unknown as AppNode).applicationCategory).toBe('DeveloperApplication');
  });

  it('does not invent ratings or reviews', () => {
    const text = JSON.stringify(buildToolJsonLd(tool));
    expect(text).not.toMatch(/"(aggregateRating|review|reviewRating)"/);
  });

  it('works for every registered tool', () => {
    for (const t of TOOLS) {
      const [a, b] = buildToolJsonLd(t)['@graph'] as unknown as [AppNode, BreadcrumbNode];
      expect(a.url).toMatch(/^https?:\/\//);
      expect(a.name).toBeTruthy();
      expect(b.itemListElement).toHaveLength(4);
    }
  });
});

describe('serializeJsonLd', () => {
  it('escapes "<" so a value cannot close the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });

  it('escapes line and paragraph separators', () => {
    const out = serializeJsonLd({ a: 'x\u2028y\u2029z' });
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(out).a).toBe('x\u2028y\u2029z');
  });
});
