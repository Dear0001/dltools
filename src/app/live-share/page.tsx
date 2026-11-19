import type { Metadata } from 'next';
import LiveShareLanding from '@/components/live-share/LiveShareLanding';

export const metadata: Metadata = {
  title: 'Live Share',
  description: 'Pair two devices with a short code and show your DLTools work in real time. Read-only viewers, host approval, no content stored.',
  alternates: { canonical: '/live-share' },
};

export default function LiveSharePage() {
  return <LiveShareLanding />;
}
