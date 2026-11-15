import type { Metadata } from 'next';
import { TermsContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Terms of Service', description: 'The terms for using DLTools, a free set of browser-based developer tools and file converters.', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return <TermsContent />;
}
