'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_THEME,
  THEME_META,
  THEME_STORAGE_KEY,
  msUntilNextSlot,
  normalizePreference,
  normalizeTheme,
  themeForDate,
  type ThemeId,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  /** The theme currently shown (in auto mode, the one the schedule picked). */
  theme: ThemeId;
  /** What the user chose: a fixed theme or 'auto'. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Pick a fixed theme (leaves auto mode). */
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeId, animate: boolean) {
  const root = document.documentElement;
  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.setAttribute('data-theme-transition', '');
    window.setTimeout(() => root.removeAttribute('data-theme-transition'), 250);
  }
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', THEME_META[theme].dark);
  root.style.colorScheme = THEME_META[theme].dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME);
  const themeRef = useRef<ThemeId>(DEFAULT_THEME);

  const show = useCallback((next: ThemeId, animate: boolean) => {
    if (themeRef.current !== next) {
      themeRef.current = next;
      setThemeState(next);
      applyTheme(next, animate);
    }
  }, []);

  // The inline init script has already set data-theme before hydration; sync React state to it.
  useEffect(() => {
    const current = normalizeTheme(document.documentElement.getAttribute('data-theme'));
    if (current) {
      themeRef.current = current;
      setThemeState(current);
    }
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Storage unavailable; fall through to the theme the init script chose.
    }
    setPreferenceState(stored === 'auto' ? 'auto' : (current ?? DEFAULT_THEME));
  }, []);

  // Auto mode: follow the clock, re-checking at each schedule boundary and
  // whenever the tab becomes visible again (timers pause while a laptop sleeps).
  useEffect(() => {
    if (preference !== 'auto') return;
    let timer: number | undefined;
    const tick = (animate: boolean) => {
      window.clearTimeout(timer);
      const now = new Date();
      show(themeForDate(now), animate);
      timer = window.setTimeout(() => tick(true), msUntilNextSlot(now) + 250);
    };
    tick(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [preference, show]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      if (next !== 'auto') show(next, true);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage can be blocked (private mode); the theme still applies for this visit.
      }
    },
    [show],
  );

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = normalizePreference(event.newValue);
      if (!next) return;
      setPreferenceState(next);
      if (next !== 'auto') show(next, false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [show]);

  const value = useMemo(
    () => ({ theme, preference, setPreference, setTheme: setPreference }),
    [theme, preference, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
