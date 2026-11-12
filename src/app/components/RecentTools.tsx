'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import ToolCard from './ToolCard';
import ToolIcon from '@/components/ui/ToolIcon';
import { TOOLS, getToolPath, type Tool } from '@/data/tools';
import { getToolName, translateText, useLocale } from '@/i18n/LocaleProvider';

const STORAGE_KEY = 'devtoolkit-recent';

/** Recently opened tools: read from this device, then merged with the account when signed in. */
export function useRecentTools() {
  const { locale } = useLocale();
  const { data: session, status: authStatus } = useSession();
  const [recents, setRecents] = useState<string[] | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let localRecents: string[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        localRecents = parsed.filter((id): id is string => typeof id === 'string' && TOOLS.some((tool) => tool.id === id)).slice(0, 8);
      }
    } catch {
      toast.error(translateText('Could not read recent tools from this device.', locale));
    }
    setRecents(localRecents);

    if (authStatus !== 'authenticated' || !session?.user?.id) {
      setSynced(false);
      return;
    }

    let active = true;
    const loadRecents = async () => {
      try {
        if (localRecents.length > 0) {
          const syncResponse = await fetch('/api/user/recents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolIds: localRecents }),
          });
          if (!syncResponse.ok) {
            const result = (await syncResponse.json()) as { error?: string };
            throw new Error(result.error ?? 'Could not sync recent tools.');
          }
        }
        const response = await fetch('/api/user/recents');
        const result = (await response.json()) as { toolIds?: string[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Could not load recent tools.');
        if (active) {
          setRecents((result.toolIds ?? []).filter((id) => TOOLS.some((tool) => tool.id === id)));
          setSynced(true);
        }
      } catch (error) {
        if (!active) return;
        toast.error(translateText(error instanceof Error ? error.message : 'Could not sync recent tools.', locale));
        setSynced(false);
      }
    };
    void loadRecents();

    return () => {
      active = false;
    };
    // Re-reading on a language switch is unnecessary; `locale` only localizes error toasts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, session?.user?.id]);

  const remove = async (id: string) => {
    const next = (recents ?? []).filter((recentId) => recentId !== id);
    try {
      if (synced) {
        const response = await fetch(`/api/user/recents/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error ?? 'Could not remove this recent tool.');
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setRecents(next);
    } catch (error) {
      toast.error(translateText(error instanceof Error ? error.message : 'Could not remove this recent tool.', locale));
    }
  };

  const tools = (recents ?? [])
    .map((id) => TOOLS.find((tool) => tool.id === id))
    .filter((tool): tool is Tool => Boolean(tool));

  return { ready: recents !== null, tools, remove };
}

/**
 * `compact` renders a row of small removable tiles (homepage); `cards` renders
 * full tool cards (workspace).
 */
export default function RecentTools({
  variant = 'compact',
  headingLevel = 2,
  hideWhenEmpty = false,
  className = '',
}: {
  variant?: 'compact' | 'cards';
  headingLevel?: 2 | 3;
  /** Render nothing (not even a placeholder) until there is at least one recent tool. */
  hideWhenEmpty?: boolean;
  className?: string;
}) {
  const { locale, t } = useLocale();
  const { ready, tools, remove } = useRecentTools();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  if (hideWhenEmpty && (!ready || tools.length === 0)) return null;

  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        <History size={18} className="text-muted-foreground" aria-hidden="true" />
        <Heading className="section-title">{t('recentTools')}</Heading>
      </div>
      {!ready ? (
        <div className="h-14 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
      ) : tools.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">{t('recentEmpty')}</p>
      ) : variant === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => {
            const name = getToolName(tool.id, tool.name, locale);
            return (
              <li key={`recent-${tool.id}`} className="group relative">
                <Link
                  href={getToolPath(tool)}
                  className="surface-hover flex items-center gap-3 rounded-xl border border-border bg-card py-2.5 pl-2.5 pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ToolIcon tool={tool} size="sm" />
                  <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">{name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(tool.id)}
                  className="btn-icon absolute right-1.5 top-1/2 h-7 min-h-0 w-7 min-w-0 -translate-y-1/2 opacity-70 hover:opacity-100"
                  aria-label={`${t('removeRecent')}: ${name}`}
                  title={t('removeRecent')}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
