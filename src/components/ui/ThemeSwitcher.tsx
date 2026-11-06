'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { THEMES, THEME_META, type ThemeId } from '@/lib/theme';
import { useLocale } from '@/i18n/LocaleProvider';

/** Compact palette button with a menu of the three themes. `onChange` lets callers sync the choice to the account. */
export default function ThemeSwitcher({ onChange, align = 'right' }: { onChange?: (theme: ThemeId) => void; align?: 'left' | 'right' }) {
  const { theme, setTheme } = useTheme();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = locale === 'kh' ? 'ធីម' : 'Theme';

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (next: ThemeId) => {
    setTheme(next);
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn-icon"
        aria-label={`${label}: ${THEME_META[theme].label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Palette size={17} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute top-full z-[80] mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg fade-in ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {THEMES.map((id) => {
            const meta = THEME_META[id];
            const active = id === theme;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(id)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                <span className="flex h-6 w-9 shrink-0 overflow-hidden rounded-md border border-border" aria-hidden="true">
                  {meta.swatch.map((c) => (
                    <span key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="flex-1">{locale === 'kh' ? meta.labelKh : meta.label}</span>
                {active && <Check size={15} className="text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
