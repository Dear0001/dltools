import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import WorkspaceShell from '@/app/tool-workspace/components/WorkspaceShell';
import { TOOLS, getToolBySlug, getToolPath, getToolSlug } from '@/data/tools';

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
  return {
    title,
    description: tool.description,
    keywords: tool.tags,
    alternates: { canonical: url },
    openGraph: { title, description: tool.description, url, type: 'website' },
    twitter: { title, description: tool.description },
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
      <Toast />
      <WorkspaceShell tool={tool} />
    </>
  );
}
