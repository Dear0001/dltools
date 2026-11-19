import type { Metadata } from 'next';
import HostDashboard from '@/components/live-share/HostDashboard';

export const metadata: Metadata = { title: 'Host a Live Share session', robots: { index: false, follow: false } };

export default function HostPage() {
  return <HostDashboard />;
}
