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
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
      <ExploreHeader />
      <ToolBrowser idPrefix="explore" />
    </div>
  );
}
