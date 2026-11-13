import React from 'react';
import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import NoToolSelected from './components/NoToolSelected';
import { TOOLS, getToolPath } from '@/data/tools';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'Your favourite and recently used DLTools in one place.',
  alternates: { canonical: '/' },
  robots: { index: false, follow: true },
};

// Legacy URL: /tool-workspace?tool=tool-json-formatter -> /tools/json-formatter
export default async function ToolWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string | string[] }>;
}) {
  const { tool: raw } = await searchParams;
  const toolId = Array.isArray(raw) ? raw[0] : raw;
  const tool = TOOLS.find((t) => t.id === toolId);
  if (tool) permanentRedirect(getToolPath(tool));

  return (
    <>
      <NoToolSelected />
    </>
  );
}
