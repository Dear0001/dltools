import type { Metadata } from 'next';
import ToolBrowser from '@/app/components/ToolBrowser';
import ExploreHeader from './ExploreHeader';
import { CATEGORIES, TOOLS } from '@/data/tools';

export const metadata: Metadata = {
  title: 'Explore Tools',
  // Built from the category list so it can never drift from the taxonomy.
  description: `Search and filter all ${TOOLS.length} DLTools utilities across ${CATEGORIES.length} categories: ${CATEGORIES.map((c) => c.label).join(', ')}.`,
  alternates: { canonical: '/tools' },
};

export default function ExploreToolsPage() {
  return (
    <div className="page-container pb-16 pt-10">
      <ExploreHeader />
      <ToolBrowser idPrefix="explore" />
    </div>
  );
}
