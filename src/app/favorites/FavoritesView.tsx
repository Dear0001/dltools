'use client';
import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import ToolCard from '@/app/components/ToolCard';
import EmptyState from '@/components/ui/EmptyState';
import { TOOLS } from '@/data/tools';
import { useFavorites } from '@/lib/favorites';
import { useLocale } from '@/i18n/LocaleProvider';

export default function FavoritesView() {
  const { locale } = useLocale();
  const kh = locale === 'kh';
  const { ids, ready } = useFavorites();
  const tools = ids.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is (typeof TOOLS)[number] => Boolean(t));

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{kh ? 'ចំណូលចិត្ត' : 'Favorites'}</h1>
        <p className="mt-2 text-muted-foreground">{kh ? 'ឧបករណ៍ដែលអ្នកបានរក្សាទុកនៅលើឧបករណ៍នេះ។' : 'Tools you have saved on this device.'}</p>
      </header>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" aria-hidden="true" />
      ) : tools.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title={kh ? 'មិនទាន់មានចំណូលចិត្ត' : 'No favorites yet'}
          description={kh ? 'ចុចរូបបេះដូងលើឧបករណ៍ណាមួយដើម្បីរក្សាទុកនៅទីនេះ។' : 'Tap the heart on any tool to keep it here for quick access.'}
          action={<Link href="/tools" className="btn-primary">{kh ? 'ស្វែងរកឧបករណ៍' : 'Explore tools'}</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      )}
    </div>
  );
}
