import type { Metadata } from 'next';
import { TermsContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Terms of Service', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return <TermsContent />;
}
