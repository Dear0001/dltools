'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeOutput from '../CodeOutput';
import CodeEditor from '../CodeEditor';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE = `{
  "users": [
    { "name": "Dara", "active": true },
    { "name": "Sophea", "active": false },
    { "name": "Vanna", "active": true }
  ]
}`;

type Match = { path: string; value: unknown };

function queryJsonPath(root: unknown, query: string): Match[] {
  const expression = query.trim();
  if (!expression.startsWith('$')) throw new Error('A JSONPath expression must start with $.');
  const tokens: Array<{ kind: 'key' | 'index' | 'wildcard' | 'recursive' | 'filter'; value?: string | number; filter?: { key: string; operator: string; expected: unknown } }> = [];
  let i = 1;
  while (i < expression.length) {
    if (expression.startsWith('..', i)) {
      i += 2;
      const match = /^[\w$-]+/.exec(expression.slice(i));
      if (!match) throw new Error('Recursive descent needs a property name, like ..id.');
      tokens.push({ kind: 'recursive', value: match[0] });
      i += match[0].length;
    } else if (expression[i] === '.') {
      i += 1;
      const match = /^[\w$-]+|^\*/.exec(expression.slice(i));
      if (!match) throw new Error('Expected a property name after the dot.');
      tokens.push(match[0] === '*' ? { kind: 'wildcard' } : { kind: 'key', value: match[0] });
      i += match[0].length;
    } else if (expression[i] === '[') {
      const end = expression.indexOf(']', i + 1);
      if (end < 0) throw new Error('Missing closing ] in JSONPath expression.');
      const part = expression.slice(i + 1, end).trim();
      if (part === '*') tokens.push({ kind: 'wildcard' });
      else if (part.startsWith('?(') && part.endsWith(')')) {
        const condition = /^\?\(@\.([\w$-]+)\s*(==|!=|>=|<=|>|<)\s*(.+)\)$/.exec(part);
        if (!condition) throw new Error('Filter selectors support @.property comparisons such as ?(@.age >= 18).');
        let expected: unknown;
        try { expected = JSON.parse(condition[3]); } catch { expected = condition[3].replace(/^['"]|['"]$/g, ''); }
        tokens.push({ kind: 'filter', filter: { key: condition[1], operator: condition[2], expected } });
      }
      else if (/^\d+$/.test(part)) tokens.push({ kind: 'index', value: Number(part) });
      else if (/^(['"]).*\1$/.test(part)) tokens.push({ kind: 'key', value: part.slice(1, -1) });
      else throw new Error('Bracket selectors support quoted property names, integer indexes, or *.');
      i = end + 1;
    } else throw new Error(`Unexpected character at position ${i + 1}.`);
  }

  let current: Match[] = [{ path: '$', value: root }];
  for (const token of tokens) {
    const next: Match[] = [];
    for (const match of current) {
      const value = match.value;
      const entries = Array.isArray(value) ? value.map((item, index) => [index, item] as const)
        : value && typeof value === 'object' ? Object.entries(value) : [];
      if (token.kind === 'key' && value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, token.value as string)) {
        next.push({ path: `${match.path}.${String(token.value)}`, value: (value as Record<string, unknown>)[String(token.value)] });
      } else if (token.kind === 'index' && Array.isArray(value) && (token.value as number) < value.length) {
        const index = token.value as number;
        next.push({ path: `${match.path}[${index}]`, value: value[index] });
      } else if (token.kind === 'filter' && Array.isArray(value) && token.filter) {
        value.forEach((item, index) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return;
          const actual = (item as Record<string, unknown>)[token.filter!.key];
          const expected = token.filter!.expected;
          const { operator } = token.filter!;
          const matched = operator === '==' ? actual === expected
            : operator === '!=' ? actual !== expected
              : operator === '>' ? (actual as number) > (expected as number)
                : operator === '>=' ? (actual as number) >= (expected as number)
                  : operator === '<' ? (actual as number) < (expected as number)
                    : (actual as number) <= (expected as number);
          if (matched) next.push({ path: `${match.path}[${index}]`, value: item });
        });
      } else if (token.kind === 'wildcard') {
        for (const [key, item] of entries) next.push({ path: Array.isArray(value) ? `${match.path}[${key}]` : `${match.path}.${key}`, value: item });
      } else if (token.kind === 'recursive') {
        const visit = (item: unknown, path: string) => {
          if (!item || typeof item !== 'object') return;
          for (const [key, child] of Array.isArray(item) ? item.map((v, n) => [String(n), v] as const) : Object.entries(item)) {
            const childPath = Array.isArray(item) ? `${path}[${key}]` : `${path}.${key}`;
            if (key === token.value) next.push({ path: childPath, value: child });
            visit(child, childPath);
          }
        };
        visit(value, match.path);
      }
    }
    current = next;
  }
  return current;
}

export default function JsonPathPanel({ tool: _tool }: { tool: Tool }) {
  const [json, setJson] = useState(SAMPLE);
  const [expression, setExpression] = useState('$.users[*].name');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const debouncedJson = useDebouncedValue(json);
  const debouncedExpression = useDebouncedValue(expression);

  const run = useCallback((jsonSource = json, expressionSource = expression) => {
    if (!jsonSource.trim() || !expressionSource.trim()) {
      setResult('');
      setError('Enter a JSON document and JSONPath expression.');
      return;
    }
    try {
      const matches = queryJsonPath(JSON.parse(jsonSource), expressionSource);
      setResult(JSON.stringify(matches, null, 2));
      setError(matches.length ? '' : 'No values matched this expression.');
    } catch (cause) {
      setResult('');
      setError(cause instanceof Error ? cause.message : 'Could not evaluate this JSONPath.');
    }
  }, [json, expression]);

  useEffect(() => {
    if (json !== debouncedJson || expression !== debouncedExpression) {
      setResult('');
      setError('');
      return;
    }
    if (!debouncedJson.trim() && !debouncedExpression.trim()) {
      setResult('');
      setError('');
      return;
    }
    run(debouncedJson, debouncedExpression);
  }, [json, expression, debouncedJson, debouncedExpression, run]);

  return (
    <ToolFrame toolbar={<>
      <label className="flex min-w-0 flex-1 items-center gap-2" title="Examples: $.users[*].name · $.users[?(@.active == true)] · $..id">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">JSONPath</span>
        <input className="input-field min-w-0 flex-1 py-1.5 font-mono text-sm" value={expression} onChange={(event) => setExpression(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') run(); }} placeholder="$.users[*].name" />
      </label>
      <button type="button" className="btn-primary" onClick={() => run()}>Evaluate</button>
    </>}
      notice="Examples: $.users[*].name · $.users[?(@.active == true)] · $..id"
    >
      <PanelLayout
        inputLabel="JSON document"
        outputLabel="Matches"
        inputPanel={<CodeEditor value={json} onChange={setJson} minHeight="100%" placeholder="JSON document…" />}
        outputPanel={<CodeOutput value={result} language="json" placeholder="Matched paths and values will appear here." />}
        outputText={result}
        outputStatus={error ? 'error' : result ? 'success' : 'idle'}
        errorMessage={error}
        downloadName="jsonpath-matches.json"
        onSample={() => { setJson(SAMPLE); setExpression('$.users[*].name'); }}
        onClear={() => { setJson(''); setResult(''); setError(''); }}
      />
    </ToolFrame>
  );
}
