'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE = `.container{display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;background-color:#0e0e10;border-radius:8px;}.title{font-size:24px;font-weight:700;color:#f0f0f5;margin-bottom:8px;}.btn{background:linear-gradient(135deg,#00d4aa,#7c6af7);color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;transition:all 150ms ease;}`;

type Status = 'idle' | 'success' | 'error';
type Language = 'css' | 'scss' | 'less';

/** Formats with Prettier's PostCSS parser, which also understands SCSS and Less and reports syntax errors. */
async function formatStylesheet(source: string, language: Language, indent: number): Promise<string> {
  const prettier = await import('prettier/standalone');
  const postcss = await import('prettier/plugins/postcss');
  return prettier.format(source, { parser: language, plugins: [postcss], tabWidth: indent });
}

/** First line of a Prettier error, e.g. "CssSyntaxError: Unclosed block (1:1)". */
function errorText(cause: unknown): string {
  return (cause instanceof Error ? cause.message : 'Format error').split('\n')[0];
}

export default function CssFormatterPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const [language, setLanguage] = useState<Language>('css');
  const debouncedInput = useDebouncedValue(input);
  // Formatting is async; only the latest request may update the output.
  const requestId = useRef(0);

  const run = useCallback(async (source: string) => {
    const id = ++requestId.current;
    if (!source.trim()) {
      setOutput('');
      setStatus('idle');
      setError('');
      return;
    }
    try {
      const formatted = await formatStylesheet(source, language, indent);
      if (id !== requestId.current) return;
      setOutput(formatted);
      setStatus('success');
      setError('');
    } catch (cause) {
      if (id !== requestId.current) return;
      setOutput('');
      setStatus('error');
      setError(errorText(cause));
    }
  }, [language, indent]);

  useEffect(() => {
    if (input !== debouncedInput) {
      requestId.current += 1;
      setOutput('');
      setStatus('idle');
      setError('');
      return;
    }
    void run(debouncedInput);
  }, [input, debouncedInput, run]);

  const minify = () => {
    requestId.current += 1;
    setOutput(input.replace(/\s+/g, ' ').replace(/\s*{\s*/g, '{').replace(/\s*}\s*/g, '}').replace(/\s*:\s*/g, ':').replace(/\s*;\s*/g, ';').trim());
    setStatus('success');
    setError('');
  };

  return (
    <ToolFrame
      toolbar={<>
        <ToolbarField label="Language">
          <select className="select-input" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            <option value="css">CSS</option>
            <option value="scss">SCSS</option>
            <option value="less">Less</option>
          </select>
        </ToolbarField>
        <ToolbarField label="Indent">
          <select className="select-input" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </ToolbarField>
        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" className="btn-ghost text-xs" onClick={minify}>Minify</button>
          <button type="button" className="btn-primary text-xs" onClick={() => void run(input)}>Format CSS</button>
        </div>
      </>}
    >
      <PanelLayout
        inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste CSS / SCSS here…" minHeight="100%" />}
        outputPanel={<CodeOutput value={output} language="css" placeholder="Formatted CSS appears here…" />}
        outputText={output}
        outputStatus={status}
        errorMessage={error}
        onSample={() => setInput(SAMPLE)}
        downloadName={`formatted.${language}`}
        onClear={() => { requestId.current += 1; setInput(''); setOutput(''); setStatus('idle'); setError(''); }}
        onSwap={() => { if (output) setInput(output); }}
      />
    </ToolFrame>
  );
}
