import { Suspense } from 'react';
import type { Metadata } from 'next';
import JoinFlow from '@/components/live-share/JoinFlow';

export const metadata: Metadata = { title: 'Join a Live Share session', robots: { index: false, follow: false } };

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinFlow />
    </Suspense>
  );
}
