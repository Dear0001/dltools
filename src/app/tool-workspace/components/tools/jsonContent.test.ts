import { describe, expect, it } from 'vitest';
import {
  detectInputFormat,
  findJsonFragments,
  formatContentOutput,
  formatMixedContent,
  unwrapStringifiedJson,
} from './jsonContent';

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

describe('unwrapStringifiedJson', () => {
  it('decodes a quoted JSON string literal', () => {
    expect(unwrapStringifiedJson('"{\\"a\\":1}"')).toBe('{"a":1}');
  });

  it('decodes escaped text without outer quotes', () => {
    expect(unwrapStringifiedJson('{\\"a\\":[1,{\\"b\\":\\"x\\"}]}')).toBe('{"a":[1,{"b":"x"}]}');
  });

  it('decodes multiply-encoded strings', () => {
    const once = JSON.stringify('{"a":1}');
    const twice = JSON.stringify(once);
    expect(unwrapStringifiedJson(twice)).toBe('{"a":1}');
  });

  it('unwraps arrays', () => {
    expect(unwrapStringifiedJson('"[1,2,3]"')).toBe('[1,2,3]');
  });

  it('leaves plain text unchanged', () => {
    expect(unwrapStringifiedJson('hello world')).toBe('hello world');
  });

  it('leaves valid JSON unchanged', () => {
    expect(unwrapStringifiedJson('{"a":1}')).toBe('{"a":1}');
  });

  it('leaves a quoted string that is not JSON unchanged', () => {
    expect(unwrapStringifiedJson('"just text"')).toBe('"just text"');
  });

  it('leaves a quoted primitive unchanged', () => {
    expect(unwrapStringifiedJson('"42"')).toBe('"42"');
  });

  it('leaves broken escaped JSON unchanged', () => {
    const broken = '{\\"a\\":';
    expect(unwrapStringifiedJson(broken)).toBe(broken);
  });
});

describe('detectInputFormat', () => {
  it('reports empty input', () => {
    expect(detectInputFormat('   ').format).toBe('empty');
  });

  it('detects JSON', () => {
    expect(detectInputFormat('{"a":1}').format).toBe('json');
    expect(detectInputFormat('[1,2]').format).toBe('json');
  });

  it('flags malformed JSON starting with a bracket', () => {
    const result = detectInputFormat('{"a":');
    expect(result.format).toBe('invalid-json');
    expect(result.error).toMatch(/^Invalid JSON/);
  });

  it('detects mixed content', () => {
    expect(detectInputFormat('log: {"a":1} done').format).toBe('mixed');
  });

  it('detects plain strings', () => {
    expect(detectInputFormat('hello').format).toBe('string');
  });
});

describe('findJsonFragments', () => {
  it('finds multiple fragments with positions', () => {
    const input = 'a {"x":1} b [2,3] c';
    const fragments = findJsonFragments(input);
    expect(fragments.map((f) => f.source)).toEqual(['{"x":1}', '[2,3]']);
    expect(input.slice(fragments[0].start, fragments[0].end)).toBe('{"x":1}');
  });

  it('ignores braces inside strings', () => {
    const fragments = findJsonFragments('{"a":"}{"}');
    expect(fragments).toHaveLength(1);
    expect(fragments[0].value).toEqual({ a: '}{' });
  });

  it('returns nothing when there is no valid JSON', () => {
    expect(findJsonFragments('{oops} [')).toEqual([]);
  });
});

describe('formatMixedContent', () => {
  it('formats fragments and preserves surrounding text', () => {
    const input = 'before {"a":1} after';
    const out = formatMixedContent(input, findJsonFragments(input), pretty);
    expect(out).toBe(`before ${pretty({ a: 1 })} after`);
  });
});

describe('formatContentOutput', () => {
  it('formats JSON values', () => {
    expect(formatContentOutput('', 'json', { a: 1 }, [], 'auto', 2, false, pretty)).toBe(pretty({ a: 1 }));
  });

  it('minifies when requested', () => {
    expect(formatContentOutput('', 'json', { a: 1 }, [], 'auto', 2, true, pretty)).toBe('{"a":1}');
  });

  it('returns a raw string when output is "string"', () => {
    expect(formatContentOutput('', 'json', 'hi', [], 'string', 2, false, pretty)).toBe('hi');
  });

  it('encodes plain text as a JSON string when output is "json"', () => {
    expect(formatContentOutput('say "hi"', 'string', undefined, [], 'json', 2, false, pretty)).toBe(
      '"say \\"hi\\""',
    );
  });

  it('passes plain strings through when output is auto', () => {
    expect(formatContentOutput('hello', 'string', undefined, [], 'auto', 2, false, pretty)).toBe('hello');
  });
});
