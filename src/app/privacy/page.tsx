import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'How DLTools handles your data: most tools process input only in your browser, and what is stored if you sign in or save tool data.', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return <PrivacyContent />;
}
