import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ToolCard from '@/app/components/ToolCard';
import JsonLd from '@/components/JsonLd';
import { CATEGORIES, getToolsByCategory, type ToolCategory } from '@/data/tools';
import { CATEGORY_CONTENT } from '@/data/categoryContent';
import { buildCategoryJsonLd } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.id }));
}

const find = (id: string) => CATEGORIES.find((category) => category.id === id);

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const info = find(category);
  if (!info) return {};
  const content = CATEGORY_CONTENT[info.id as ToolCategory];
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: `/categories/${info.id}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const info = find(category);
  if (!info) notFound();
  const content = CATEGORY_CONTENT[info.id];
  const tools = getToolsByCategory(info.id);

  return (
    <div className="page-container pb-16 pt-10">
      <JsonLd data={buildCategoryJsonLd(info.id, info.label, tools)} />
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">Home</Link> › <Link href="/tools" className="hover:underline">All Tools</Link> › <span className="font-medium text-foreground">{info.label}</span>
      </nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{content.title}</h1>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-7 text-muted-foreground">
        <p>{content.intro}</p>
        <p>{content.whenToUse}</p>
      </div>
      <h2 className="section-title mt-10">{tools.length} tools in this category</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => <ToolCard key={tool.id} tool={tool} showCategory={false} />)}
      </div>
    </div>
  );
}
