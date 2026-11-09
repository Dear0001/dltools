import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';
import { getToolPath, type Tool, type ToolCategory } from '@/data/tools';

export interface OgImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export const DEFAULT_OG_IMAGE: OgImage = {
  url: '/assets/images/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'DLTools: free online developer tools and file converters',
};

const JSON_CONVERTER_OG_IMAGE: OgImage = {
  url: '/assets/images/og-json-converter.jpg',
  width: 1200,
  height: 630,
  alt: 'JSON Converter: convert JSON to PDF, Word, Excel, CSV, XML and images',
};

/** Tools whose link preview uses a dedicated image instead of the site default. */
const TOOL_OG_IMAGES: Record<string, OgImage> = {
  'tool-data-converter': JSON_CONVERTER_OG_IMAGE,
};

export function getOgImageForTool(tool: Pick<Tool, 'id'>): OgImage {
  return TOOL_OG_IMAGES[tool.id] ?? DEFAULT_OG_IMAGE;
}

const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const CATEGORY_APPLICATION_TYPE: Record<ToolCategory, 'DeveloperApplication' | 'UtilitiesApplication'> = {
  formatters: 'DeveloperApplication',
  diff: 'DeveloperApplication',
  qr: 'DeveloperApplication',
  generators: 'DeveloperApplication',
  utilities: 'UtilitiesApplication',
  image: 'UtilitiesApplication',
  documents: 'UtilitiesApplication',
};

/** WebSite + Organization, for the whole site. */
export function buildSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl('/assets/images/app_logo.jpg'),
      },
    ],
  };
}

/** WebApplication + BreadcrumbList for one tool page. */
export function buildToolJsonLd(tool: Pick<Tool, 'id' | 'name' | 'description' | 'category'>) {
  const url = absoluteUrl(getToolPath(tool));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: tool.name,
        description: tool.description,
        url,
        image: absoluteUrl(getOgImageForTool(tool).url),
        applicationCategory: CATEGORY_APPLICATION_TYPE[tool.category],
        operatingSystem: 'Any (runs in the browser)',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: absoluteUrl('/tools') },
          { '@type': 'ListItem', position: 3, name: tool.name, item: url },
        ],
      },
    ],
  };
}

/** JSON for an inline <script type="application/ld+json">: "<" is escaped so content can never close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
