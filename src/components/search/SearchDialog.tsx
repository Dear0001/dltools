'use client';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search, X } from 'lucide-react';
import ToolIcon from '@/components/ui/ToolIcon';
import { CATEGORIES, TOOLS, getToolPath } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';
import { searchTools } from '@/lib/searchTools';

const SUGGESTED = TOOLS.filter((tool) => tool.popular).slice(0, 6);

/**
 * Command-palette style tool search. Opened from the top bar button or with
 * Ctrl/⌘ K. Fully keyboard operable: arrows move, Enter opens, Esc closes.
 */
export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const listId = useId();
  const titleId = useId();

  const results = useMemo(() => (query.trim() ? searchTools(query, locale).slice(0, 8) : SUGGESTED), [query, locale]);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActive(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      returnFocus.current?.focus?.();
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (index: number) => {
    const tool = results[index];
    if (!tool) return;
    onClose();
    router.push(getToolPath(tool));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Khmer and other IMEs use Enter/arrows to pick candidates; don't hijack those keystrokes.
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Tab') {
      // Keep focus inside the dialog: the input is the only tab stop.
      event.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-overlay px-4 pt-[10vh] fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-popover slide-up"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="sr-only">{t('searchDialogTitle')}</h2>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchTools')}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            aria-autocomplete="list"
            aria-label={t('searchDialogTitle')}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('close')}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2 scrollbar-thin">
          <p className="px-2 pb-1.5 pt-1 text-xs font-semibold text-muted-foreground">
            {query.trim() ? t('searchResults') : t('searchSuggested')}
          </p>
          {results.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t('noSearchMatches')}</p>
              <p className="mt-4 text-left text-xs font-semibold text-muted-foreground">{t('searchSuggested')}</p>
              <ul className="mt-1 text-left">
                {SUGGESTED.slice(0, 4).map((tool) => (
                  <li key={tool.id}>
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-primary/10" onClick={() => { onClose(); router.push(getToolPath(tool)); }}>
                      <ToolIcon tool={tool} size="sm" />
                      <span className="truncate text-sm font-medium text-foreground">{getToolName(tool.id, tool.name, locale)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-ghost mt-3" onClick={() => { onClose(); router.push('/tools'); }}>
                {t('viewAllTools')}
              </button>
            </div>
          ) : (
            <ul ref={listRef} id={listId} role="listbox" aria-label={t('searchResults')}>
              {results.map((tool, index) => {
                const category = CATEGORIES.find((c) => c.id === tool.category);
                const selected = index === active;
                return (
                  <li
                    key={tool.id}
                    id={`${listId}-${tool.id}`}
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => go(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 ${selected ? 'bg-primary/10' : ''}`}
                  >
                    <ToolIcon tool={tool} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>
                        {getToolName(tool.id, tool.name, locale)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {getToolDescription(tool.id, tool.description, locale)}
                      </span>
                    </span>
                    {category && (
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {getCategoryName(category.id, category.label, locale)}
                      </span>
                    )}
                    {selected && <CornerDownLeft size={14} className="hidden shrink-0 text-primary sm:block" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="hidden border-t border-border bg-background-secondary px-4 py-2.5 text-xs text-muted-foreground sm:block">
          {t('searchKeyboardHint')}
        </p>
      </div>
    </div>
  );
}
