'use client';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import ToolIcon from '@/components/ui/ToolIcon';
import { getToolPath } from '@/data/tools';
import { getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';
import { searchTools } from '@/lib/searchTools';

/** Large homepage search with an inline result list (combobox pattern). Press "/" to focus. */
export default function HeroSearch() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => (query.trim() ? searchTools(query, locale).slice(0, 6) : []), [query, locale]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => setActive(0), [query]);

  const go = (index: number) => {
    const tool = results[index];
    if (!tool) return;
    setQuery('');
    setOpen(false);
    router.push(getToolPath(tool));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results.length) {
      e.preventDefault();
      go(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div
      className="relative w-full"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        className="search-input h-14 rounded-2xl !pl-12 !pr-12 text-base shadow-card"
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-label={t('searchAria')}
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <kbd className="kbd pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">/</kbd>

      {showList && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-left shadow-popover fade-in">
          {results.length > 0 ? (
            <ul id={listId} role="listbox" aria-label={t('searchResults')}>
              {results.map((tool, index) => (
                <li
                  key={tool.id}
                  id={`${listId}-${tool.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(index)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${index === active ? 'bg-primary/10' : ''}`}
                >
                  <ToolIcon tool={tool} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${index === active ? 'text-primary' : 'text-foreground'}`}>{getToolName(tool.id, tool.name, locale)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{getToolDescription(tool.id, tool.description, locale)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p id={listId} className="px-3 py-3 text-sm text-muted-foreground">{t('noSearchMatches')}</p>
          )}
        </div>
      )}
    </div>
  );
}
