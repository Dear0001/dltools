'use client';
import React from 'react';
import { Check, Clock, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { AUTO_META, THEME_MENU_ORDER, THEME_META, type ThemeId, type ThemePreference } from '@/lib/theme';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * One-click light/dark toggle for the top bar. `onChange` lets callers sync the
 * choice to the signed-in account.
 */
export default function ThemeSwitcher({ onChange, className = '' }: { onChange?: (theme: ThemePreference) => void; className?: string }) {
  const { theme, setPreference: setTheme } = useTheme();
  const { t } = useLocale();
  const dark = THEME_META[theme].dark;
  const next: ThemeId = dark ? 'alabaster-paper' : 'midnight';
  const label = dark ? t('switchToLight') : t('switchToDark');

  return (
    <button
      type="button"
      className={`btn-icon ${className}`}
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme(next);
        onChange?.(next);
      }}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
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
      {THEME_MENU_ORDER.map((id) => {
        const meta = THEME_META[id];
        const active = preference !== 'auto' && id === theme;
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
