'use client';
import React, { useEffect, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE_DECODED = 'https://api.devtoolkit.io/v2/search?query=json formatter&category=formatters&lang=en&sort=popular&page=1&limit=20&tags=json,format,validate';

export default function UrlCodecPanel({ tool: _tool }: { tool: Tool }) {
  const [decoded, setDecoded] = useState(SAMPLE_DECODED);
  const [encoded, setEncoded] = useState('');
  const [error, setError] = useState('');
  const [activeSide, setActiveSide] = useState<'decoded' | 'encoded'>('decoded');
  const debouncedDecoded = useDebouncedValue(decoded);
  const debouncedEncoded = useDebouncedValue(encoded);

  useEffect(() => {
    if (activeSide !== 'decoded') return;
    if (decoded !== debouncedDecoded) return;
    setEncoded(encodeURIComponent(debouncedDecoded));
    setError('');
  }, [activeSide, decoded, debouncedDecoded]);

  useEffect(() => {
    if (activeSide !== 'encoded') return;
    if (encoded !== debouncedEncoded) return;
    try {
      setDecoded(decodeURIComponent(debouncedEncoded));
      setError('');
    } catch {
      setError('Decode error — invalid percent-encoded string');
    }
  }, [activeSide, encoded, debouncedEncoded]);

  const encode = () => {
    try {
      setEncoded(encodeURIComponent(decoded));
      setActiveSide('decoded');
      setError('');
    } catch {
      setError('Encode error');
    }
  };

  const decode = () => {
    try {
      setDecoded(decodeURIComponent(encoded));
      setActiveSide('encoded');
      setError('');
    } catch {
      setError('Decode error — invalid percent-encoded string');
    }
  };

  const reference = [['Space', '%20'], ['/', '%2F'], ['?', '%3F'], ['&', '%26'], ['=', '%3D'], ['#', '%23'], ['+', '%2B'], ['@', '%40'], [':', '%3A']];
  return (
    <ToolFrame
      toolbar={<>
        <button type="button" className="btn-primary" onClick={encode}><ArrowRight size={14} />Encode</button>
        <button type="button" className="btn-ghost" onClick={decode}><ArrowLeft size={14} />Decode</button>
        <span className="text-xs text-muted-foreground">Edit either side — the other updates automatically.</span>
      </>}
      notice={<span className="font-mono">{reference.map(([char, enc]) => `${char} → ${enc}`).join('   ·   ')}</span>}
    >
      <PanelLayout
        inputLabel="Decoded / Plain URL"
        outputLabel="Encoded / Percent-Encoded"
        inputPanel={<CodeEditor value={decoded} onChange={(value) => { setActiveSide('decoded'); setDecoded(value); setEncoded(''); setError(''); }} minHeight="100%" placeholder="https://example.com/path?query=value&other=hello world" />}
        outputPanel={<CodeEditor value={encoded} onChange={(value) => { setActiveSide('encoded'); setEncoded(value); setDecoded(''); setError(''); }} minHeight="100%" placeholder="https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue%26other%3Dhello%20world" />}
        outputText={encoded}
        outputStatus={error ? 'error' : encoded ? 'success' : 'idle'}
        errorMessage={error}
        downloadName="encoded-url.txt"
        onSample={() => { setActiveSide('decoded'); setDecoded(SAMPLE_DECODED); }}
        onClear={() => { setActiveSide('decoded'); setDecoded(''); setEncoded(''); setError(''); }}
        onSwap={() => { setActiveSide('decoded'); setDecoded(encoded); }}
      />
    </ToolFrame>
  );
}
