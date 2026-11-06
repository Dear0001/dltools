import type { MetadataRoute } from 'next';
import { TOOLS, getToolPath } from '@/data/tools';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...TOOLS.map((tool) => ({
      url: `${SITE_URL}${getToolPath(tool)}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: tool.popular ? 0.9 : 0.7,
    })),
  ];
}
