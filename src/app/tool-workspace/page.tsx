import React, { Suspense } from 'react';
import WorkspaceLoader from './components/WorkspaceLoader';
import type { Metadata } from 'next';
import Toast from '@/components/ui/Toast';
import { TOOLS } from '@/data/tools';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string | string[] }>;
}): Promise<Metadata> {
  const { tool: raw } = await searchParams;
  const toolId = Array.isArray(raw) ? raw[0] : raw;
  const tool = TOOLS.find((t) => t.id === toolId);

  if (!tool) {
    return { title: 'Tools', alternates: { canonical: '/' }, robots: { index: false, follow: true } };
  }

  const title = `${tool.name} — Free Online Tool`;
  const url = `/tool-workspace?tool=${tool.id}`;
  return {
    title,
    description: tool.description,
    keywords: tool.tags,
    alternates: { canonical: url },
    openGraph: { title, description: tool.description, url, type: 'website' },
    twitter: { title, description: tool.description },
  };
}

export default function ToolWorkspacePage() {
  return (
    <>
      <Toast />
      <Suspense fallback={
        <div className="w-full h-[calc(100vh-56px)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading tool…</span>
          </div>
        </div>
      }>
        <WorkspaceLoader />
      </Suspense>
    </>
  );
}