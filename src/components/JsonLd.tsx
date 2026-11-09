import React from 'react';
import { serializeJsonLd } from '@/lib/seo';

/** Renders structured data for search engines. `serializeJsonLd` escapes "<" so the payload cannot break out of the tag. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
