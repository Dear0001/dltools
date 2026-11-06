import type { Metadata } from 'next';
import { ContactContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Contact', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return <ContactContent />;
}
