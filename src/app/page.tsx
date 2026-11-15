import type { Metadata } from 'next';
import HomePage from './HomePage';

// The root layout deliberately sets no canonical, so each page declares its own self-referencing URL.
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Page() {
  return <HomePage />;
}
