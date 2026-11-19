'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_THEME,
  THEME_META,
  THEME_STORAGE_KEY,
  WEATHER_LOCATION_KEY,
  WEATHER_THEME_KEY,
  msUntilNextSlot,
  normalizePreference,
  normalizeTheme,
  themeForDate,
  themeForWeather,
  type ThemeId,
  type ThemePreference,
  type WeatherLocation,
  type WeatherSnapshot,
} from '@/lib/theme';

interface ThemeContextValue {
  /** The theme currently shown (in auto mode, the one the schedule picked). */
  theme: ThemeId;
  /** What the user chose: a fixed theme or 'auto'. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference, options?: { persist?: boolean }) => void;
  /** Pick a fixed theme (leaves auto mode). */
  setTheme: (theme: ThemeId) => void;
  /** Place followed in 'weather' mode. Kept in this browser only, never saved to the account. */
  location: WeatherLocation | null;
  setLocation: (location: WeatherLocation | null) => void;
  weatherStatus: 'idle' | 'loading' | 'ok' | 'error';
}

const WEATHER_REFRESH_MS = 30 * 60_000;
const WEATHER_RETRY_MS = 5 * 60_000;

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
  const [location, setLocationState] = useState<WeatherLocation | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

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
      const place = JSON.parse(window.localStorage.getItem(WEATHER_LOCATION_KEY) ?? 'null') as WeatherLocation | null;
      if (place && typeof place.latitude === 'number' && typeof place.longitude === 'number') setLocationState(place);
    } catch {
      // Storage unavailable; fall through to the theme the init script chose.
    }
    setPreferenceState(stored === 'auto' || stored === 'weather' ? stored : (current ?? DEFAULT_THEME));
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

  // Weather mode: ask our /api/weather proxy, re-check every 30 minutes and when
  // the tab comes back. Without a place, or when the lookup fails, use the clock.
  useEffect(() => {
    if (preference !== 'weather') return;
    let cancelled = false;
    let timer: number | undefined;
    let lastRun = 0;
    const byClock = () => show(themeForDate(new Date()), true);

    const load = async () => {
      window.clearTimeout(timer);
      lastRun = Date.now();
      if (!location) {
        setWeatherStatus('idle');
        byClock();
        timer = window.setTimeout(load, WEATHER_RETRY_MS);
        return;
      }
      setWeatherStatus('loading');
      let delay = WEATHER_REFRESH_MS;
      try {
        const res = await fetch(`/api/weather?lat=${location.latitude}&lon=${location.longitude}`);
        if (!res.ok) throw new Error('weather');
        const snapshot = (await res.json()) as WeatherSnapshot;
        if (cancelled) return;
        const next = themeForWeather(snapshot);
        show(next, true);
        setWeatherStatus('ok');
        try {
          window.localStorage.setItem(WEATHER_THEME_KEY, JSON.stringify({ theme: next, at: Date.now() }));
        } catch {
          // Cache is only a first-paint optimisation.
        }
      } catch {
        if (cancelled) return;
        setWeatherStatus('error');
        byClock();
        delay = WEATHER_RETRY_MS;
      }
      if (!cancelled) timer = window.setTimeout(load, delay);
    };

    void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRun > 10 * 60_000) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [preference, location, show]);

  const setLocation = useCallback((next: WeatherLocation | null) => {
    setLocationState(next);
    try {
      if (next) window.localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(WEATHER_LOCATION_KEY);
    } catch {
      // Blocked storage: the place applies for this visit only.
    }
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference, options?: { persist?: boolean }) => {
      setPreferenceState(next);
      if (next !== 'auto' && next !== 'weather') show(next, true);
      // Live Share viewers follow the host's theme without overwriting their own saved choice.
      if (options?.persist === false) return;
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
      if (next !== 'auto' && next !== 'weather') show(next, false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [show]);

  const value = useMemo(
    () => ({ theme, preference, setPreference, setTheme: setPreference, location, setLocation, weatherStatus }),
    [theme, preference, setPreference, location, setLocation, weatherStatus],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
