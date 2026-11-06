'use client';
import { useCallback, useEffect, useState } from 'react';
import { TOOLS } from '@/data/tools';

const KEY = 'devtoolkit-favorites';
const EVENT = 'devtoolkit-favorites-changed';

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && TOOLS.some((t) => t.id === id));
  } catch {
    return [];
  }
}

/** Favourite tool ids stored on this device (no account needed). */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      return false;
    }
    window.dispatchEvent(new Event(EVENT));
    return true;
  }, []);

  return { ids, ready, isFavorite: (id: string) => ids.includes(id), toggle };
}
