'use client';
import React, { useRef } from 'react';
import { translateText, useLocale } from '@/i18n/LocaleProvider';
import { useLiveViewerMode } from '@/lib/live-share/toolContext';

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
}

export default function CodeEditor({
  value,
  onChange,
  placeholder = 'Paste your input here…',
  readOnly: readOnlyProp = false,
  minHeight = '200px',
  className = '',
}: CodeEditorProps) {
  const { locale } = useLocale();
  // A Live Share viewer sees the host's editor content but can never type into it.
  const viewing = useLiveViewerMode();
  const readOnly = readOnlyProp || viewing;
  const ref = useRef<HTMLTextAreaElement>(null);
  // After Escape, the next Tab moves focus out of the editor instead of indenting,
  // so keyboard users are never trapped (WCAG 2.1.2).
  const releaseTab = useRef(false);

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      releaseTab.current = true;
      return;
    }
    if (e.key === 'Tab' && (releaseTab.current || readOnly || e.shiftKey)) {
      releaseTab.current = false;
      return;
    }
    releaseTab.current = false;
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newVal);
      setTimeout(() => el.setSelectionRange(start + 2, start + 2), 0);
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleTab}
      placeholder={translateText(placeholder, locale)}
      readOnly={readOnly}
      aria-readonly={readOnly || undefined}
      className={`input-code w-full h-full flex-1 resize-none border-0 rounded-none bg-transparent focus:ring-0 focus:border-0 focus:shadow-none ${className}`}
      style={{ minHeight }}
      aria-label={translateText(placeholder, locale)}
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
    />
  );
}