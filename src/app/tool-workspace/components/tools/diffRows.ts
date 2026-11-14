import * as Diff from 'diff';

export type DiffLineType = 'added' | 'removed' | 'unchanged';

export interface DiffLine {
  type: DiffLineType;
  value: string;
  lineNum: number;
}

export interface SplitCell {
  type: DiffLineType;
  value: string;
  lineNum: number;
}

/** One row of the side-by-side view. A missing side is an empty gap opposite an added or removed line. */
export interface SplitRow {
  left?: SplitCell;
  right?: SplitCell;
}

function toLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Unified view: one list of lines, numbered in display order. */
export function buildUnifiedDiff(left: string, right: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let lineNum = 1;
  for (const part of Diff.diffLines(left, right)) {
    const type: DiffLineType = part.added ? 'added' : part.removed ? 'removed' : 'unchanged';
    for (const value of toLines(part.value)) lines.push({ type, value, lineNum: lineNum++ });
  }
  return lines;
}

/**
 * Split view: original lines on the left, modified lines on the right, each numbered from its own file.
 * A removed block followed by an added block is shown side by side, so a changed line sits opposite its replacement.
 */
export function buildSplitDiff(left: string, right: string): SplitRow[] {
  const rows: SplitRow[] = [];
  let leftNum = 1;
  let rightNum = 1;
  let pendingRemoved: SplitCell[] = [];

  const flushRemoved = (added: SplitCell[] = []) => {
    const count = Math.max(pendingRemoved.length, added.length);
    for (let i = 0; i < count; i++) rows.push({ left: pendingRemoved[i], right: added[i] });
    pendingRemoved = [];
  };

  for (const part of Diff.diffLines(left, right)) {
    const values = toLines(part.value);
    if (part.removed) {
      pendingRemoved.push(...values.map((value) => ({ type: 'removed' as const, value, lineNum: leftNum++ })));
    } else if (part.added) {
      flushRemoved(values.map((value) => ({ type: 'added' as const, value, lineNum: rightNum++ })));
    } else {
      flushRemoved();
      for (const value of values) {
        rows.push({
          left: { type: 'unchanged', value, lineNum: leftNum++ },
          right: { type: 'unchanged', value, lineNum: rightNum++ },
        });
      }
    }
  }
  flushRemoved();
  return rows;
}
