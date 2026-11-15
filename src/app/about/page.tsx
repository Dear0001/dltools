import type { Metadata } from 'next';
import { AboutContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'About DLTools', description: 'What DLTools is: 44 free developer tools and converters that run in your browser, built in Cambodia, with English and Khmer support.', alternates: { canonical: '/about' } };

export default function AboutPage() {
  return <AboutContent />;
}
