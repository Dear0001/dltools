'use client';
import React from 'react';
import { INTERACTIVE_SELECTOR, classifyTarget, shouldBlockInteraction, type InteractionKind } from '@/lib/live-share/guard';

/**
 * Makes a rendered DLTools workspace behave read-only for a Live Share viewer. See `lib/live-share/guard.ts`
 * for the rules. Controls that are safe for a viewer to use on their own (copy output, zoom…) opt out with
 * `data-live-safe`.
 */
export default function ViewerGuard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const guard = (interaction: InteractionKind) => (event: React.SyntheticEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const el = target.closest(INTERACTIVE_SELECTOR);
    if (!el) return;
    const key = (event as React.KeyboardEvent).key;
    const blocked = shouldBlockInteraction({
      interaction,
      target: classifyTarget(el.tagName, (el as HTMLInputElement).type),
      key,
      ctrlOrMeta: (event as React.KeyboardEvent).ctrlKey || (event as React.KeyboardEvent).metaKey,
      safe: el.closest('[data-live-safe]') !== null,
    });
    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const edit = guard('edit');
  return (
    <div
      data-live-viewer=""
      className={`[&_button:not([data-live-safe])]:cursor-not-allowed [&_input[type=checkbox]]:cursor-not-allowed [&_select]:cursor-not-allowed ${className}`}
      onClickCapture={guard('click')}
      onMouseDownCapture={guard('mousedown')}
      onKeyDownCapture={guard('keydown')}
      onPasteCapture={edit}
      onCutCapture={edit}
      onDropCapture={edit}
      onBeforeInputCapture={edit}
      onChangeCapture={edit}
      onSubmitCapture={edit}
    >
      {children}
    </div>
  );
}
