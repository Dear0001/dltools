import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KH_AVOID_TERMS, KH_GLOSSARY } from './khGlossary';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !path.endsWith('khGlossary.ts') ? [path] : [];
  });
}

const KHMER = /[ក-៿]/;
// Khmer letters and signs (excluding the punctuation block ។ ៕ etc.) directly touching a Latin letter or digit.
const GLUED = /[ក-៓៝][A-Za-z0-9]|[A-Za-z0-9][ក-៓៝]/;

const khmerLines = sourceFiles('src').flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .map((line, index) => ({ where: `${file}:${index + 1}`, line }))
    .filter(({ line }) => KHMER.test(line)),
);

describe('Khmer terminology dictionary', () => {
  it('has one entry per English term', () => {
    const keys = KH_GLOSSARY.map((term) => term.en);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never lists a preferred term as a variant to avoid', () => {
    for (const term of KH_GLOSSARY) expect(term.avoid ?? []).not.toContain(term.kh);
  });

  it('finds Khmer copy to check', () => {
    expect(khmerLines.length).toBeGreaterThan(100);
  });

  it('uses no variant the dictionary says to avoid', () => {
    const hits = khmerLines.flatMap(({ where, line }) => KH_AVOID_TERMS.filter((term) => line.includes(term)).map((term) => `${where}: ${term}`));
    expect(hits).toEqual([]);
  });

  it('puts a space between Khmer and Latin text or digits', () => {
    expect(khmerLines.filter(({ line }) => GLUED.test(line)).map(({ where }) => where)).toEqual([]);
  });

  it('has no space before the khan (។)', () => {
    expect(khmerLines.filter(({ line }) => /[ក-៿] +។/.test(line)).map(({ where }) => where)).toEqual([]);
  });
});
