'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, CloudSun, LocateFixed, Palette } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AUTO_META, WEATHER_META, THEME_MENU_ORDER, THEME_META, type ThemePreference } from '@/lib/theme';
import { CAMBODIA_PLACES } from '@/lib/cambodia';
import { useLocale } from '@/i18n/LocaleProvider';

/** Palette icon in the top bar; clicking it opens a dropdown listing every theme. */
export function ThemeMenu({ onChange, className = '' }: { onChange?: (theme: ThemePreference) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        className="btn-icon"
        aria-label={t('theme')}
        title={t('theme')}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Palette size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 max-h-[calc(100vh-5rem)] w-64 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-popover fade-in">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">{t('theme')}</p>
          <ThemeOptions
            onChange={(next) => {
              onChange?.(next);
              // Weather mode keeps the menu open so the place can be chosen.
              if (next !== 'weather') setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Full theme list (Auto by time of day, then every fixed theme) as radio items, for menus and the mobile drawer. */
export function ThemeOptions({ onChange }: { onChange?: (theme: ThemePreference) => void }) {
  const { theme, preference, setPreference: setTheme } = useTheme();
  const { locale, t } = useLocale();
  return (
    <div role="radiogroup" aria-label={t('theme')} className="grid grid-cols-1 gap-1">
      <button
        type="button"
        role="radio"
        aria-checked={preference === 'auto'}
        onClick={() => {
          setTheme('auto');
          onChange?.('auto');
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted ${preference === 'auto' ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        <span
          className="flex h-5 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
          style={{ background: `linear-gradient(90deg, ${AUTO_META.swatch.join(', ')})` }}
          aria-hidden="true"
        >
          <Clock size={11} className="text-foreground mix-blend-difference" />
        </span>
        <span className="flex-1">
          {locale === 'kh' ? AUTO_META.labelKh : AUTO_META.label}
          <span className="block text-xs text-muted-foreground">{locale === 'kh' ? AUTO_META.hintKh : AUTO_META.hint}</span>
        </span>
        {preference === 'auto' && <Check size={15} className="text-primary" aria-hidden="true" />}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={preference === 'weather'}
        onClick={() => {
          setTheme('weather');
          onChange?.('weather');
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted ${preference === 'weather' ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        <span
          className="flex h-5 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
          style={{ background: `linear-gradient(90deg, ${WEATHER_META.swatch.join(', ')})` }}
          aria-hidden="true"
        >
          <CloudSun size={11} className="text-foreground mix-blend-difference" />
        </span>
        <span className="flex-1">
          {locale === 'kh' ? WEATHER_META.labelKh : WEATHER_META.label}
          <span className="block text-xs text-muted-foreground">{locale === 'kh' ? WEATHER_META.hintKh : WEATHER_META.hint}</span>
        </span>
        {preference === 'weather' && <Check size={15} className="text-primary" aria-hidden="true" />}
      </button>
      {preference === 'weather' && <WeatherPlace />}
      {THEME_MENU_ORDER.map((id) => {
        const meta = THEME_META[id];
        const active = preference !== 'auto' && preference !== 'weather' && id === theme;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setTheme(id);
              onChange?.(id);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted ${active ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <span className="flex h-5 w-8 shrink-0 overflow-hidden rounded-md border border-border" aria-hidden="true">
              {meta.swatch.map((c) => (
                <span key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
              ))}
            </span>
            <span className="flex-1">{locale === 'kh' ? meta.labelKh : meta.label}</span>
            {active && <Check size={15} className="text-primary" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

/** City box + "use my location" for weather mode. The place stays in this browser. */
function WeatherPlace() {
  const { location, setLocation, weatherStatus, theme } = useTheme();
  const { locale } = useLocale();
  const kh = locale === 'kh';
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const searchCity = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = city.trim();
    if (!q) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { location?: { name: string; latitude: number; longitude: number }; error?: string };
      if (!res.ok || !data.location) throw new Error(data.error ?? 'failed');
      setLocation(data.location);
      setCity('');
    } catch (e) {
      setError(e instanceof Error && e.message === 'City not found.' ? (kh ? 'រកមិនឃើញទីក្រុងនេះទេ' : 'City not found.') : kh ? 'មិនអាចស្វែងរកបានទេ' : 'Could not look that up. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError(kh ? 'ឧបករណ៍នេះមិនគាំទ្រទីតាំងទេ' : 'Location is not supported here.');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          name: kh ? 'ទីតាំងរបស់ខ្ញុំ' : 'My location',
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
        });
        setBusy(false);
      },
      () => {
        setError(kh ? 'មិនអនុញ្ញាតទីតាំង — សូមវាយឈ្មោះទីក្រុងវិញ' : 'Location was blocked. Type a city instead.');
        setBusy(false);
      },
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  const status = !location
    ? kh ? 'ជ្រើសទីក្រុង — ពេលនេះប្រើម៉ោងជំនួស' : 'Pick a place. Using time of day for now.'
    : weatherStatus === 'error'
      ? kh ? 'អាកាសធាតុមិនអាចប្រើបាន — ប្រើម៉ោងជំនួស' : 'Weather unavailable. Using time of day.'
      : weatherStatus === 'loading'
        ? kh ? 'កំពុងផ្ទុក…' : 'Checking weather…'
        : `${location.name} · ${THEME_META[theme][kh ? 'labelKh' : 'label']}`;

  return (
    <div className="mx-1 mb-1 rounded-lg border border-border bg-background p-2">
      <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">{status}</p>
      <form onSubmit={searchCity} className="flex gap-1.5">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={80}
          list="weather-places"
          placeholder={kh ? 'ឈ្មោះទីក្រុង' : 'City name'}
          aria-label={kh ? 'ឈ្មោះទីក្រុង' : 'City name'}
          className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <datalist id="weather-places">
          {CAMBODIA_PLACES.map((p) => (
            <option key={p.name} value={kh ? p.khmer : p.name} />
          ))}
        </datalist>
        <button type="submit" disabled={busy || !city.trim()} className="rounded-md bg-primary px-2.5 py-1 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {kh ? 'កំណត់' : 'Set'}
        </button>
        <button type="button" onClick={useMyLocation} disabled={busy} className="btn-icon h-8 w-8 shrink-0" aria-label={kh ? 'ប្រើទីតាំងរបស់ខ្ញុំ' : 'Use my location'} title={kh ? 'ប្រើទីតាំងរបស់ខ្ញុំ' : 'Use my location'}>
          <LocateFixed size={15} aria-hidden="true" />
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-error" role="alert">{error}</p>}
    </div>
  );
}
