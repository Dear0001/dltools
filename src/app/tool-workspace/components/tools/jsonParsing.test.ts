import { describe, expect, it } from 'vitest';
import {
  cleanJsonFragment,
  deepParseJsonStrings,
  looksLikeLegacyJsonInput,
  parseApiResponseWithNestedJson,
  parseJsonLike,
  parseLineBasedJson,
  repairEscapedBase64Padding,
  unquoteJsonString,
} from './jsonParsing';

describe('unquoteJsonString', () => {
  it('removes surrounding quotes and decodes escapes', () => {
    expect(unquoteJsonString('"a\\nb"')).toBe('a\nb');
  });

  it('strips quotes from invalid JSON string literals', () => {
    expect(unquoteJsonString('"bad \\q"')).toBe('bad \\q');
  });

  it('only trims unquoted text', () => {
    expect(unquoteJsonString('  plain  ')).toBe('plain');
  });
});

describe('cleanJsonFragment', () => {
  it('passes non-strings through', () => {
    expect(cleanJsonFragment(5)).toBe(5);
    expect(cleanJsonFragment(null)).toBe(null);
  });

  it('keeps structural markers', () => {
    expect(cleanJsonFragment(' { ')).toBe('{');
    expect(cleanJsonFragment(']')).toBe(']');
  });

  it('removes trailing commas and parses values', () => {
    expect(cleanJsonFragment('42,')).toBe(42);
    expect(cleanJsonFragment('true,')).toBe(true);
  });

  it('unquotes strings', () => {
    expect(cleanJsonFragment('"hello",')).toBe('hello');
  });

  it('returns unparseable text as-is', () => {
    expect(cleanJsonFragment('not json')).toBe('not json');
  });

  it('returns empty string for blank input', () => {
    expect(cleanJsonFragment('   ')).toBe('');
  });
});

describe('deepParseJsonStrings', () => {
  it('parses JSON strings nested inside objects', () => {
    expect(deepParseJsonStrings({ a: '{"b":"[1,2]"}' })).toEqual({ a: { b: [1, 2] } });
  });

  it('parses JSON strings inside arrays', () => {
    expect(deepParseJsonStrings(['{"x":1}', 'plain'])).toEqual([{ x: 1 }, 'plain']);
  });

  it('leaves non-JSON strings and primitives alone', () => {
    expect(deepParseJsonStrings({ a: 'hello', b: 1, c: null })).toEqual({ a: 'hello', b: 1, c: null });
  });

  it('leaves malformed JSON-looking strings alone', () => {
    expect(deepParseJsonStrings({ a: '{oops}' })).toEqual({ a: '{oops}' });
  });

  it('stops at the max depth', () => {
    expect(deepParseJsonStrings('{"a":1}', 15)).toBe('{"a":1}');
  });
});

describe('parseApiResponseWithNestedJson', () => {
  it('parses embedded JSON strings (apiResponse shape)', () => {
    const input = JSON.stringify({
      apiResponse: {
        ResponseBody: { responseObj: JSON.stringify({ expireAt: 1, khQr: 'abc' }) },
      },
    });
    expect(parseApiResponseWithNestedJson(input)).toEqual({
      apiResponse: { ResponseBody: { responseObj: { expireAt: 1, khQr: 'abc' } } },
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseApiResponseWithNestedJson('{nope')).toBeNull();
  });
});

describe('repairEscapedBase64Padding', () => {
  it('fixes escaped = padding after base64 characters', () => {
    // Applies to escaped-quote payloads, where the padding sits right before \"
    expect(repairEscapedBase64Padding('{\\"img\\":\\"QUJD\\=\\=\\"}')).toBe('{\\"img\\":\\"QUJD==\\"}');
  });

  it('does not touch padding that is not followed by an escaped quote', () => {
    expect(repairEscapedBase64Padding('{"img":"QUJD\\=\\="}')).toBe('{"img":"QUJD\\=\\="}');
  });

  it('leaves ordinary text untouched', () => {
    expect(repairEscapedBase64Padding('a \\= b')).toBe('a \\= b');
  });
});

describe('parseLineBasedJson', () => {
  it('parses key=value and key: value lines', () => {
    expect(parseLineBasedJson(['name = "Ann"', 'age: 30'])).toEqual({ name: 'Ann', age: 30 });
  });

  it('builds nested containers from { and [ markers', () => {
    const result = parseLineBasedJson(['user = {', 'name = "Ann"', '}', 'tags = [', 'x = 1', ']']);
    expect(result).toEqual({ user: { name: 'Ann' }, tags: [1] });
  });

  it('handles closers with trailing commas and several on one line', () => {
    const result = parseLineBasedJson(['a = {', 'b = {', 'c = 1', '}},', 'd = 2']);
    expect(result).toEqual({ a: { b: { c: 1 } }, d: 2 });
  });

  it('does not pop past the root on stray closers', () => {
    expect(parseLineBasedJson(['}', 'a = 1'])).toEqual({ a: 1 });
  });

  it('skips blank and unparseable lines', () => {
    expect(parseLineBasedJson(['', 'garbage', 'a = 1'])).toEqual({ a: 1 });
  });
});

describe('looksLikeLegacyJsonInput', () => {
  it('accepts single key=value / key: value lines', () => {
    expect(looksLikeLegacyJsonInput('name = "Ann"')).toBe(true);
    expect(looksLikeLegacyJsonInput('name: Ann')).toBe(true);
  });

  it('rejects URLs and prose', () => {
    expect(looksLikeLegacyJsonInput('https://example.com')).toBe(false);
    expect(looksLikeLegacyJsonInput('hello world')).toBe(false);
  });

  it('accepts multi-line key/value blocks with brackets', () => {
    expect(looksLikeLegacyJsonInput('a = {\nb = 1\n}')).toBe(true);
  });

  it('rejects multi-line prose', () => {
    expect(looksLikeLegacyJsonInput('hello\nworld')).toBe(false);
  });
});

describe('parseJsonLike', () => {
  it('throws on empty input', () => {
    expect(() => parseJsonLike('   ')).toThrow('Input is empty');
  });

  it('parses plain JSON', () => {
    expect(parseJsonLike('{"a":[1,2]}')).toEqual({ a: [1, 2] });
  });

  it('expands nested JSON strings', () => {
    expect(parseJsonLike('{"a":"{\\"b\\":1}"}')).toEqual({ a: { b: 1 } });
  });

  it('parses key=value text', () => {
    expect(parseJsonLike('a = 1\nb = "x"')).toEqual({ a: 1, b: 'x' });
  });

  it('parses nested key=value text', () => {
    expect(parseJsonLike('user = {\nname = "Ann"\n}')).toEqual({ user: { name: 'Ann' } });
  });

  it('throws when nothing can be parsed', () => {
    expect(() => parseJsonLike('???')).toThrow('Unable to parse input');
  });
});
