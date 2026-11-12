import type { Metadata } from 'next';
import ToolBrowser from '@/app/components/ToolBrowser';
import ExploreHeader from './ExploreHeader';

export const metadata: Metadata = {
  title: 'Explore Tools',
  description: 'Search and filter every DLTools utility: formatters, diff checkers, QR and KHQR tools, image and Base64 converters, generators and PDF/Word converters.',
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
