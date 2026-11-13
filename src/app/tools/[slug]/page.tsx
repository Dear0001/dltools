import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ToolContent from './ToolContent';
import WorkspaceShell from '@/app/tool-workspace/components/WorkspaceShell';
import JsonLd from '@/components/JsonLd';
import { TOOLS, getToolBySlug, getToolPath, getToolSlug } from '@/data/tools';
import { SITE_NAME } from '@/lib/site';
import { buildToolJsonLd, getOgImageForTool } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: getToolSlug(tool) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};

  const title = `${tool.name} — Free Online Tool`;
  const url = getToolPath(tool);
  const ogImage = getOgImageForTool(tool);
  return {
    title,
    description: tool.description,
    keywords: tool.tags,
    alternates: { canonical: url },
    // A page-level openGraph/twitter replaces the layout's, so siteName and images must be repeated here.
    openGraph: {
      title,
      description: tool.description,
      url,
      type: 'website',
      siteName: SITE_NAME,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: tool.description,
      images: [{ url: ogImage.url, alt: ogImage.alt }],
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <>
      <JsonLd data={buildToolJsonLd(tool)} />
      <WorkspaceShell tool={tool} />
      <ToolContent tool={tool} />
    </>
  );
}
