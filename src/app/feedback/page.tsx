import type { Metadata } from 'next';
import { FeedbackContent } from '@/components/InfoContent';

export const metadata: Metadata = { title: 'Feedback', alternates: { canonical: '/feedback' } };

export default function FeedbackPage() {
  return <FeedbackContent />;
}
