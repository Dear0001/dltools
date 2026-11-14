'use client';
import React, { forwardRef, useId, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Visible label at every width; also the button's accessible name. */
  label: string;
  /** Short explanation shown on hover and keyboard focus; linked with aria-describedby. */
  tooltip: string;
  /** Icon to show briefly after a successful action (e.g. a check mark after copying). */
  successIcon?: LucideIcon;
  showSuccess?: boolean;
  iconClassName?: string;
  /** Small trailing icon for a condition such as "sign-in required". Decorative; explain it in `tooltip`. */
  trailingIcon?: LucideIcon;
}

/**
 * The one button style for tool page actions (copy link, favourite, share, saved data).
 * The label is visible at every width (touch devices have no hover tooltip to explain an icon),
 * and the tooltip appears on hover (pointer devices) and on keyboard focus. Escape hides it.
 * On phones the tooltip spans the button's width so it never runs off the screen.
 */
const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { icon: Icon, label, tooltip, successIcon: SuccessIcon, showSuccess = false, iconClassName = '', trailingIcon: TrailingIcon, className = '', onKeyDown, onMouseLeave, onBlur, ...props },
  ref,
) {
  const tooltipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const ShownIcon = showSuccess && SuccessIcon ? SuccessIcon : Icon;

  return (
    <span className="group/action relative inline-flex min-w-0">
      <button
        ref={ref}
        type="button"
        aria-describedby={tooltipId}
        className={`btn-ghost w-full min-w-0 justify-start sm:w-auto sm:justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
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
        <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
        {TrailingIcon && <TrailingIcon size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-0 right-0 top-full z-40 mt-1.5 rounded-md sm:left-auto sm:w-max sm:max-w-[16rem] bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background opacity-0 shadow-md transition-opacity duration-150 group-has-[:focus-visible]/action:opacity-100 [@media(hover:hover)]:group-hover/action:opacity-100 ${dismissed ? '!opacity-0' : ''}`}
      >
        {tooltip}
      </span>
    </span>
  );
});

export default ActionButton;
