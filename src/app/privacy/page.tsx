import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return <PrivacyContent />;
}
