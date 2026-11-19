/**
 * Viewer-mode interaction rules (pure, so they can be unit-tested without a DOM).
 *
 * In a Live Share viewer the real DLTools panel is rendered, but the viewer must not be able to
 * change the shared workspace. State is already protected at the source (`useLiveState` setters are
 * no-ops for viewers); this guard makes the UI *behave* read-only too: controls don't toggle, selects
 * don't open, editors don't accept typing — while selecting/copying text, scrolling and anything
 * explicitly marked `data-live-safe` (copy, zoom…) keep working.
 */
export type InteractionKind = 'click' | 'mousedown' | 'keydown' | 'edit';
export type TargetKind = 'text' | 'control';

/** Keys that never change a text field's content (navigation and selection). */
const READ_ONLY_KEYS = new Set([
  'Tab', 'Escape', 'Shift', 'Control', 'Meta', 'Alt', 'CapsLock',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown',
]);
const CONTROL_KEYS = new Set([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

export function shouldBlockInteraction(input: {
  interaction: InteractionKind;
  target: TargetKind;
  key?: string;
  ctrlOrMeta?: boolean;
  safe?: boolean;
}): boolean {
  if (input.safe) return false;
  // Paste, cut, drop, input events and form changes/submits are always edits.
  if (input.interaction === 'edit') return true;
  if (input.target === 'text') {
    if (input.interaction !== 'keydown') return false; // clicking to place a caret / select text is fine
    const key = input.key ?? '';
    if (input.ctrlOrMeta) return key.toLowerCase() === 'x' || key.toLowerCase() === 'v' || key.toLowerCase() === 'z' || key.toLowerCase() === 'y';
    return !READ_ONLY_KEYS.has(key);
  }
  // Buttons, selects, checkboxes, radios, tabs, links…
  if (input.interaction === 'keydown') return CONTROL_KEYS.has(input.key ?? '');
  return true;
}

export const INTERACTIVE_SELECTOR =
  'button,select,input,textarea,summary,label,a[href],[role=button],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[role=option],[role=combobox]';

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'url', 'tel', 'email', 'password', 'number']);

export function classifyTarget(tag: string, type: string | undefined): TargetKind {
  const t = tag.toLowerCase();
  if (t === 'textarea') return 'text';
  if (t === 'input' && TEXT_INPUT_TYPES.has((type ?? '').toLowerCase())) return 'text';
  return 'control';
}
