import { describe, expect, it } from 'vitest';
import { buildSplitDiff, buildUnifiedDiff } from './diffRows';
import { normalizeXml } from './xmlFormat';

describe('buildUnifiedDiff', () => {
  it('marks added, removed and unchanged lines', () => {
    const lines = buildUnifiedDiff('a\nb\nc\n', 'a\nB\nc\n');
    expect(lines.map((l) => `${l.type}:${l.value}`)).toEqual(['unchanged:a', 'removed:b', 'added:B', 'unchanged:c']);
    expect(lines.map((l) => l.lineNum)).toEqual([1, 2, 3, 4]);
  });
});

describe('buildSplitDiff', () => {
  it('puts a changed line opposite its replacement with per-file line numbers', () => {
    const rows = buildSplitDiff('a\nb\nc', 'a\nB\nc');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({ left: { type: 'removed', value: 'b', lineNum: 2 }, right: { type: 'added', value: 'B', lineNum: 2 } });
    expect(rows[2].left?.lineNum).toBe(3);
    expect(rows[2].right?.lineNum).toBe(3);
  });

  it('leaves a gap opposite pure insertions and deletions', () => {
    const rows = buildSplitDiff('a\nc', 'a\nb\nc');
    expect(rows[1].left).toBeUndefined();
    expect(rows[1].right).toEqual({ type: 'added', value: 'b', lineNum: 2 });
    expect(rows[2].left?.lineNum).toBe(2);
    expect(rows[2].right?.lineNum).toBe(3);
    const removed = buildSplitDiff('a\nb\nc', 'a\nc');
    expect(removed[1]).toEqual({ left: { type: 'removed', value: 'b', lineNum: 2 }, right: undefined });
  });

  it('pairs uneven replacement blocks', () => {
    const rows = buildSplitDiff('x\ny', 'z');
    expect(rows).toHaveLength(2);
    expect(rows[0].left?.value).toBe('x');
    expect(rows[0].right?.value).toBe('z');
    expect(rows[1].right).toBeUndefined();
  });
});

describe('normalizeXml', () => {
  it('formats single-line and indented XML identically', () => {
    const compact = '<a><b>1</b><c>2</c></a>';
    const spaced = '<a>\n    <b>1</b>\n\n  <c>2</c>\n</a>';
    expect(normalizeXml(compact)).toBe(normalizeXml(spaced));
    expect(normalizeXml(compact)).toBe('<a>\n  <b>1</b>\n  <c>2</c>\n</a>');
  });
});
