'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { useDebouncedValue } from '../useDebouncedValue';

type Mode = 'html' | 'hex' | 'gzip';
type Direction = 'encode' | 'decode';

async function gzip(text: string, direction: Direction): Promise<string> {
  if (direction === 'encode') {
    if (typeof CompressionStream === 'undefined') throw new Error('Gzip compression is not supported in this browser.');
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  if (typeof DecompressionStream === 'undefined') throw new Error('Gzip decompression is not supported in this browser.');
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export default function EncodingToolkitPanel({ tool: _tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>('html');
  const [direction, setDirection] = useState<Direction>('encode');
  const [input, setInput] = useState('<div title="hello">A & B</div>');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const processId = useRef(0);
  const debouncedInput = useDebouncedValue(input);
  const process = useCallback(async (source = input, selectedMode = mode, selectedDirection = direction) => {
    const id = ++processId.current;
    if (!source) { setOutput(''); setError(''); return; }
    try {
      let result = '';
      if (selectedMode === 'html') {
        if (selectedDirection === 'encode') result = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        else { const element = document.createElement('textarea'); element.innerHTML = source; result = element.value; }
      } else if (selectedMode === 'hex') {
        if (selectedDirection === 'encode') result = Array.from(new TextEncoder().encode(source), (byte) => byte.toString(16).padStart(2, '0')).join(' ');
        else {
          const cleaned = source.replace(/0x/gi, '').replace(/[\s,:-]/g, '');
          if (!/^(?:[0-9a-f]{2})*$/i.test(cleaned)) throw new Error('Enter complete hexadecimal byte pairs.');
          result = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(cleaned.match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16)));
        }
      } else result = await gzip(source, selectedDirection);
      if (id !== processId.current) return;
      setOutput(result); setError('');
    } catch (cause) {
      if (id !== processId.current) return;
      setOutput(''); setError(cause instanceof Error ? cause.message : 'Could not process this input.');
    }
  }, [input, mode, direction]);

  const changeInput = (value: string) => {
    processId.current += 1;
    setInput(value);
    setOutput('');
    setError('');
  };

  useEffect(() => {
    if (input !== debouncedInput) return;
    void process(debouncedInput, mode, direction);
    return () => { processId.current += 1; };
  }, [input, debouncedInput, mode, direction, process]);

  return <ToolFrame
    toolbar={<>
      <ToolbarField label="Encoding"><select className="select-input" value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="html">HTML entities</option><option value="hex">UTF-8 hex</option><option value="gzip">Gzip</option></select></ToolbarField>
      <ToolbarField label="Direction"><select className="select-input" value={direction} onChange={(event) => setDirection(event.target.value as Direction)}><option value="encode">{mode === 'gzip' ? 'Compress' : 'Encode'}</option><option value="decode">{mode === 'gzip' ? 'Decompress' : 'Decode'}</option></select></ToolbarField>
      <button type="button" className="btn-primary ml-auto" onClick={() => void process()}>{mode === 'gzip' ? (direction === 'encode' ? 'Compress' : 'Decompress') : direction === 'encode' ? 'Encode' : 'Decode'}</button>
    </>}
  ><PanelLayout inputPanel={<CodeEditor value={input} onChange={changeInput} minHeight="100%" placeholder="Input text…" />} outputPanel={<CodeOutput value={output} language="text" placeholder="Result appears here…" />} outputText={output} outputStatus={error ? 'error' : output ? 'success' : 'idle'} errorMessage={error} onClear={() => { processId.current += 1; setInput(''); setOutput(''); setError(''); }} /></ToolFrame>;
}
