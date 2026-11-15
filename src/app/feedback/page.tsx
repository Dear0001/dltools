import type { Metadata } from 'next';
import { FeedbackContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Feedback', description: 'Send feedback or suggest a new tool for DLTools.', alternates: { canonical: '/feedback' }, robots: { index: false, follow: true } };

export default function FeedbackPage() {
  return <FeedbackContent />;
}
