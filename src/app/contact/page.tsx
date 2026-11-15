import type { Metadata } from 'next';
import { ContactContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Contact', description: 'Contact the DLTools team with questions, bug reports or tool requests.', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return <ContactContent />;
}
