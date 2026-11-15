import type { MetadataRoute } from 'next';
import { CATEGORIES, TOOLS, getToolPath } from '@/data/tools';
import { SITE_URL } from '@/lib/site';

// lastModified is intentionally omitted: stamping every URL with the build time is not a real
// modification date, and search engines learn to ignore sitemaps whose dates are unreliable.
// /feedback is excluded on purpose: it is a form with no search value and carries noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...['/tools', '/about', '/privacy', '/terms', '/contact'].map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'monthly' as const,
      priority: path === '/tools' ? 0.9 : 0.4,
    })),
    ...CATEGORIES.map((category) => ({
      url: `${SITE_URL}/categories/${category.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...TOOLS.map((tool) => ({
      url: `${SITE_URL}${getToolPath(tool)}`,
      changeFrequency: 'monthly' as const,
      priority: tool.popular ? 0.9 : 0.7,
    })),
  ];
}
