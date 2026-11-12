'use client';
import React from 'react';
import { useLocale, type Locale } from '@/i18n/LocaleProvider';

const OPTIONS: { id: Locale; short: string; full: string; lang: string }[] = [
  { id: 'en', short: 'EN', full: 'English', lang: 'en' },
  { id: 'kh', short: 'ខ្មែរ', full: 'ភាសាខ្មែរ', lang: 'km' },
];

/** EN / ខ្មែរ segmented switch. `onChange` lets callers sync the choice to the account. */
export default function LanguageSwitcher({ onChange, className = '' }: { onChange?: (locale: Locale) => void; className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className={`segmented ${className}`} role="group" aria-label={t('language')}>
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          lang={option.lang}
          aria-pressed={locale === option.id}
          title={option.full}
          onClick={() => {
            if (locale === option.id) return;
            setLocale(option.id);
            onChange?.(option.id);
          }}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
