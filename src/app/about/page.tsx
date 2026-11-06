import type { Metadata } from 'next';
import { AboutContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'About DLTools', alternates: { canonical: '/about' } };

export default function AboutPage() {
  return <AboutContent />;
}
