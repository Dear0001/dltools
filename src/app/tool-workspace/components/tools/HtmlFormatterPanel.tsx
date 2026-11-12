'use client';
import React, { useEffect, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import beautify from 'js-beautify';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>DevToolkit</title><link rel="stylesheet" href="/styles.css"></head><body><div class="container"><h1 class="title">Hello World</h1><p class="description">A developer toolkit.</p><button type="button" onClick="handleClick()">Click me</button></div><script src="/app.js"></script></body></html>`;

type Status = 'idle' | 'success' | 'error';

export default function HtmlFormatterPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const debouncedInput = useDebouncedValue(input);

  useEffect(() => {
    if (input !== debouncedInput) {
      setOutput('');
      setStatus('idle');
      setError('');
      return;
    }
    if (!debouncedInput.trim()) {
      setOutput('');
      setStatus('idle');
      setError('');
      return;
    }
    try {
      setOutput(beautify.html(debouncedInput, { indent_size: indent, wrap_line_length: 120 }));
      setStatus('success');
      setError('');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Could not format HTML.');
      setOutput('');
    }
  }, [input, debouncedInput, indent]);

  const format = () => {
    try {
      // Backend integration point: js-beautify html formatter
      const formatted = beautify.html(input, { indent_size: indent, wrap_line_length: 120 });
      setOutput(formatted);
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Format error';
      setStatus('error');
      setError(msg);
      setOutput('');
    }
  };

  const minify = () => {
    setOutput(input.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim());
    setStatus('success');
    setError('');
  };

  return (
    <ToolFrame
      toolbar={<>
        <ToolbarField label="Indent">
          <select className="select-input" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </ToolbarField>
        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" className="btn-ghost text-xs" onClick={minify}>Minify</button>
          <button type="button" className="btn-primary text-xs" onClick={format}>Format HTML</button>
        </div>
      </>}
    >
      <PanelLayout
        inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste HTML here…" minHeight="100%" />}
        outputPanel={<CodeOutput value={output} language="html" placeholder="Formatted HTML appears here…" />}
        outputText={output}
        outputStatus={status}
        errorMessage={error}
        onSample={() => setInput(SAMPLE)}
        downloadName="formatted.html"
        onClear={() => { setInput(''); setOutput(''); setStatus('idle'); setError(''); }}
        onSwap={() => { if (output) setInput(output); }}
      />
    </ToolFrame>
  );
}
