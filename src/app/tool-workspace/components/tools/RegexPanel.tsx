'use client';
import React, { useState, useMemo } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const SAMPLE_PATTERN = '(\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b)';
const SAMPLE_TEST = `Contact us at support@devtoolkit.io or sales@devtoolkit.io
For billing: billing@devtoolkit.io
Invalid: notanemail@, @nodomain.com, plaintext
Developer: dev+tools@devtoolkit.io`;

export default function RegexPanel({ tool: _tool }: { tool: Tool }) {
  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState({ g: true, i: false, m: true, s: false });
  const [testStr, setTestStr] = useState(SAMPLE_TEST);
  const [replaceStr, setReplaceStr] = useState('');
  const [mode, setMode] = useState<'match' | 'replace'>('match');

  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('');

  const result = useMemo(() => {
    if (!pattern) return { matches: [], error: '', replaced: '', count: 0 };
    try {
      const re = new RegExp(pattern, flagStr);
      const matches: { value: string; index: number; groups: string[] }[] = [];
      if (flags.g) {
        let m;
        const reCopy = new RegExp(pattern, flagStr);
        while ((m = reCopy.exec(testStr)) !== null) {
          matches.push({ value: m[0], index: m.index, groups: m.slice(1) });
          if (!flags.g) break;
        }
      } else {
        const m = re.exec(testStr);
        if (m) matches.push({ value: m[0], index: m.index, groups: m.slice(1) });
      }
      const replaced = replaceStr !== undefined ? testStr.replace(re, replaceStr) : '';
      return { matches, error: '', replaced, count: matches.length };
    } catch (e: unknown) {
      return { matches: [], error: e instanceof Error ? e.message : 'Invalid regex', replaced: '', count: 0 };
    }
  }, [pattern, flagStr, testStr, replaceStr, flags.g]);

  const outputText = mode === 'replace' ? result.replaced : result.matches.map((m) => m.value).join('\n');
  return (
    <ToolFrame toolbar={<>
      <div className="segmented" role="group" aria-label="Mode">
        {(['match', 'replace'] as const).map((m) => (
          <button key={`mode-${m}`} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'match' ? 'Match' : 'Replace'}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {Object.entries(flags).map(([flag, enabled]) => (
          <label key={`flag-${flag}`} className="flex cursor-pointer items-center gap-1.5" title={flag === 'g' ? 'global' : flag === 'i' ? 'case-insensitive' : flag === 'm' ? 'multiline' : 'dotAll'}>
            <input type="checkbox" checked={enabled} onChange={(e) => setFlags((prev) => ({ ...prev, [flag]: e.target.checked }))} className="h-3.5 w-3.5 accent-primary" />
            <span className="font-mono text-xs text-muted-foreground">{flag} — {flag === 'g' ? 'global' : flag === 'i' ? 'case-insensitive' : flag === 'm' ? 'multiline' : 'dotAll'}</span>
          </label>
        ))}
      </div>
    </>}>
      <PanelLayout
        inputBody="content"
        outputBody="content"
        outputLabel={mode === 'replace' ? 'Result' : 'Matches'}
        inputPanel={<div className="flex flex-1 flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="regex-pattern">Regular Expression</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg text-muted-foreground">/</span>
              <input id="regex-pattern" type="text" value={pattern} onChange={(e) => setPattern(e.target.value)} className="input-field flex-1 font-mono" placeholder="([a-z]+)\d+" spellCheck={false} aria-invalid={Boolean(result.error)} />
              <span className="font-mono text-lg text-muted-foreground">/</span>
              <span className="font-mono text-sm text-primary">{flagStr || 'none'}</span>
            </div>
          </div>
          {mode === 'replace' && (
            <div>
              <label className="field-label" htmlFor="regex-replace">Replace With</label>
              <input id="regex-replace" type="text" value={replaceStr} onChange={(e) => setReplaceStr(e.target.value)} className="input-field font-mono" placeholder="Replacement string — use $1, $2 for capture groups" />
            </div>
          )}
          <div className="flex min-h-[10rem] flex-1 flex-col">
            <label className="field-label" htmlFor="regex-test">Test String</label>
            <textarea id="regex-test" value={testStr} onChange={(e) => setTestStr(e.target.value)} className="input-code flex-1 resize-none" placeholder="Enter test string here…" spellCheck={false} />
          </div>
        </div>}
        outputPanel={<div className="flex flex-col gap-3">
          {result.error
            ? <p className="notice notice-error" role="alert"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /><span className="font-mono">{result.error}</span></p>
            : pattern && <p className="notice notice-success"><CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />{result.count} match{result.count !== 1 ? 'es' : ''} found</p>}
          {mode === 'replace'
            ? (result.replaced && <pre className="output-code whitespace-pre-wrap text-xs">{result.replaced}</pre>)
            : <ul className="flex flex-col gap-2">
              {result.matches.map((m, i) => (
                <li key={`match-${i}`} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                  <span className="w-6 flex-shrink-0 text-xs tabular-nums text-muted-foreground">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <span className="break-all font-mono text-xs text-primary">{m.value}</span>
                    {m.groups.length > 0 && <div className="mt-1 flex flex-wrap gap-2">{m.groups.map((g, gi) => <span key={`group-${i}-${gi}`} className="font-mono text-xs text-muted-foreground">${gi + 1}: {g}</span>)}</div>}
                  </div>
                  <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">@{m.index}</span>
                </li>
              ))}
            </ul>}
        </div>}
        outputText={outputText}
        outputStatus={result.error ? 'error' : result.count ? 'success' : 'idle'}
        downloadName={mode === 'replace' ? 'replaced.txt' : 'matches.txt'}
        onSample={() => { setPattern(SAMPLE_PATTERN); setTestStr(SAMPLE_TEST); }}
        onClear={() => { setPattern(''); setTestStr(''); setReplaceStr(''); }}
      />
    </ToolFrame>
  );
}
