'use client';
import React, { useEffect, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import beautify from 'js-beautify';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE = `.container{display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;background-color:#0e0e10;border-radius:8px;}.title{font-size:24px;font-weight:700;color:#f0f0f5;margin-bottom:8px;}.btn{background:linear-gradient(135deg,#00d4aa,#7c6af7);color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;transition:all 150ms ease;}`;

type Status = 'idle' | 'success' | 'error';

export default function CssFormatterPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [indent, setIndent] = useState(2);
  const debouncedInput = useDebouncedValue(input);

  useEffect(() => {
    if (input !== debouncedInput) {
      setOutput('');
      setStatus('idle');
      return;
    }
    if (!debouncedInput.trim()) {
      setOutput('');
      setStatus('idle');
      return;
    }
    try {
      setOutput(beautify.css(debouncedInput, { indent_size: indent }));
      setStatus('success');
    } catch {
      setOutput('');
      setStatus('error');
    }
  }, [input, debouncedInput, indent]);

  const format = () => {
    try {
      const formatted = beautify.css(input, { indent_size: indent });
      setOutput(formatted);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const minify = () => {
    setOutput(input.replace(/\s+/g, ' ').replace(/\s*{\s*/g, '{').replace(/\s*}\s*/g, '}').replace(/\s*:\s*/g, ':').replace(/\s*;\s*/g, ';').trim());
    setStatus('success');
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
          <button type="button" className="btn-primary text-xs" onClick={format}>Format CSS</button>
        </div>
      </>}
    >
      <PanelLayout
        inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste CSS / SCSS here…" minHeight="100%" />}
        outputPanel={<CodeOutput value={output} language="css" placeholder="Formatted CSS appears here…" />}
        outputText={output}
        outputStatus={status}
        onSample={() => setInput(SAMPLE)}
        downloadName="formatted.css"
        onClear={() => { setInput(''); setOutput(''); setStatus('idle'); }}
        onSwap={() => { if (output) setInput(output); }}
      />
    </ToolFrame>
  );
}
