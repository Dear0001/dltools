import type { Metadata } from 'next';
import FavoritesView from './FavoritesView';

export const metadata: Metadata = {
  title: 'Favorites',
  description: 'Your favourite DLTools, saved on this device.',
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
