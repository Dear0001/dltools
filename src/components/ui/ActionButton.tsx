'use client';
import React, { forwardRef, useId, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Visible label (hidden below `sm`, still the accessible name at every width). */
  label: string;
  /** Short explanation shown on hover and keyboard focus; linked with aria-describedby. */
  tooltip: string;
  /** Icon to show briefly after a successful action (e.g. a check mark after copying). */
  successIcon?: LucideIcon;
  showSuccess?: boolean;
  iconClassName?: string;
}

/**
 * The one button style for tool page actions (copy link, favourite, share, saved data).
 * The label stays in the DOM at every width, so screen readers always get the same name,
 * and the tooltip appears on hover (pointer devices) and on keyboard focus. Escape hides it.
 */
const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { icon: Icon, label, tooltip, successIcon: SuccessIcon, showSuccess = false, iconClassName = '', className = '', onKeyDown, onMouseLeave, onBlur, ...props },
  ref,
) {
  const tooltipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const ShownIcon = showSuccess && SuccessIcon ? SuccessIcon : Icon;

  return (
    <span className="group/action relative inline-flex">
      <button
        ref={ref}
        type="button"
        aria-describedby={tooltipId}
        className={`btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${className}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setDismissed(true);
          onKeyDown?.(event);
        }}
        onMouseLeave={(event) => {
          setDismissed(false);
          onMouseLeave?.(event);
        }}
        onBlur={(event) => {
          setDismissed(false);
          onBlur?.(event);
        }}
        {...props}
      >
        <ShownIcon size={15} className={`shrink-0 ${showSuccess ? 'text-success' : iconClassName}`} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{label}</span>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute right-0 top-full z-40 mt-1.5 w-max max-w-[16rem] rounded-md bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background opacity-0 shadow-md transition-opacity duration-150 group-has-[:focus-visible]/action:opacity-100 [@media(hover:hover)]:group-hover/action:opacity-100 ${dismissed ? '!opacity-0' : ''}`}
      >
        {tooltip}
      </span>
    </span>
  );
});

export default ActionButton;
