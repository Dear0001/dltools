'use client';
import React, { useEffect, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE = `const fetchUserData=async(userId)=>{const response=await fetch(\`/api/users/\${userId}\`);if(!response.ok){throw new Error('Failed to fetch user: '+response.status);}const data=await response.json();return{id:data.id,name:data.name,email:data.email,createdAt:new Date(data.created_at).toISOString()};}`;

type Status = 'idle' | 'success' | 'error';

export default function JsFormatterPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const [parser, setParser] = useState<'babel' | 'typescript'>('babel');
  const [loading, setLoading] = useState(false);
  const debouncedInput = useDebouncedValue(input, 300);

  useEffect(() => {
    let cancelled = false;
    if (input !== debouncedInput) {
      setOutput('');
      setStatus('idle');
      setError('');
      return () => { cancelled = true; };
    }
    if (!debouncedInput.trim()) {
      setOutput('');
      setStatus('idle');
      setError('');
      return;
    }
    const formatLive = async () => {
      try {
        const prettier = await import('prettier/standalone');
        const babelPlugin = await import('prettier/plugins/babel');
        const estreePlugin = await import('prettier/plugins/estree');
        const tsPlugin = await import('prettier/plugins/typescript');
        const plugins = parser === 'typescript'
          ? [tsPlugin.default, estreePlugin.default]
          : [babelPlugin.default, estreePlugin.default];
        const formatted = await prettier.format(debouncedInput, {
          parser,
          plugins,
          tabWidth: indent,
          semi: true,
          singleQuote: true,
        });
        if (cancelled) return;
        setOutput(formatted);
        setStatus('success');
        setError('');
      } catch (cause) {
        if (cancelled) return;
        setStatus('error');
        setError((cause instanceof Error ? cause.message : 'Format error').split('\n')[0]);
        setOutput('');
      }
    };
    void formatLive();
    return () => { cancelled = true; };
  }, [input, debouncedInput, parser, indent]);

  const format = async () => {
    setLoading(true);
    try {
      // Backend integration point: call prettier/babel formatter
      const prettier = await import('prettier/standalone');
      const babelPlugin = await import('prettier/plugins/babel');
      const estreePlugin = await import('prettier/plugins/estree');
      const tsPlugin = await import('prettier/plugins/typescript');
      const plugins = parser === 'typescript'
        ? [tsPlugin.default, estreePlugin.default]
        : [babelPlugin.default, estreePlugin.default];
      const formatted = await prettier.format(input, {
        parser,
        plugins,
        tabWidth: indent,
        semi: true,
        singleQuote: true,
      });
      setOutput(formatted);
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Format error';
      setStatus('error');
      setError(msg.split('\n')[0]);
      setOutput('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolFrame
      toolbar={<>
        <ToolbarField label="Parser">
          <select className="select-input" value={parser} onChange={(e) => setParser(e.target.value as 'babel' | 'typescript')}>
            <option value="babel">JavaScript</option>
            <option value="typescript">TypeScript</option>
          </select>
        </ToolbarField>
        <ToolbarField label="Indent">
          <select className="select-input" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </ToolbarField>
        <div className="ml-auto">
          <button type="button" className="btn-primary text-xs" onClick={format} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />Formatting…</span>
            ) : 'Format'}
          </button>
        </div>
      </>}
    >
      <PanelLayout
        inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste JavaScript or TypeScript here…" minHeight="100%" />}
        outputPanel={
          <CodeOutput
            value={output}
            language={parser === 'typescript' ? 'typescript' : 'javascript'}
            placeholder="Formatted code appears here…"
          />
        }
        outputText={output}
        outputStatus={status}
        errorMessage={error}
        onSample={() => setInput(SAMPLE)}
        downloadName="formatted.js"
        onClear={() => { setInput(''); setOutput(''); setStatus('idle'); setError(''); }}
        onSwap={() => { if (output) setInput(output); }}
      />
    </ToolFrame>
  );
}
