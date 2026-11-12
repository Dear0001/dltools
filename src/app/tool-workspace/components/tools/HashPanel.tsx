'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { Copy, CheckCircle2, Hash } from 'lucide-react';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';
import { useDebouncedValue } from '../useDebouncedValue';

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

const ALGORITHMS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];
const SAMPLE = 'DevToolkit — browser developer tools 2026';

export default function HashPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [results, setResults] = useState<Record<Algorithm, string>>({} as Record<Algorithm, string>);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(false);
  const [hmacKey, setHmacKey] = useState('');
  const [useHmac, setUseHmac] = useState(false);
  const debouncedInput = useDebouncedValue(input, 180);

  const compute = useCallback((source = input, secret = hmacKey, hmac = useHmac, upper = uppercase) => {
    if (!source) { setResults({} as Record<Algorithm, string>); return; }
    // Backend integration point: crypto-js hashing
    const compute = (algo: Algorithm): string => {
      let result: string;
      if (hmac) {
        switch (algo) {
          case 'MD5': result = CryptoJS.HmacMD5(source, secret).toString(); break;
          case 'SHA-1': result = CryptoJS.HmacSHA1(source, secret).toString(); break;
          case 'SHA-256': result = CryptoJS.HmacSHA256(source, secret).toString(); break;
          case 'SHA-512': result = CryptoJS.HmacSHA512(source, secret).toString(); break;
          default: result = '';
        }
      } else {
        switch (algo) {
          case 'MD5': result = CryptoJS.MD5(source).toString(); break;
          case 'SHA-1': result = CryptoJS.SHA1(source).toString(); break;
          case 'SHA-256': result = CryptoJS.SHA256(source).toString(); break;
          case 'SHA-512': result = CryptoJS.SHA512(source).toString(); break;
          default: result = '';
        }
      }
      return upper ? result.toUpperCase() : result;
    };

    const newResults = {} as Record<Algorithm, string>;
    for (const algo of ALGORITHMS) {
      newResults[algo] = compute(algo);
    }
    setResults(newResults);
  }, [input, hmacKey, useHmac, uppercase]);

  useEffect(() => {
    if (input !== debouncedInput) { setResults({} as Record<Algorithm, string>); return; }
    compute(debouncedInput, hmacKey, useHmac, uppercase);
  }, [input, debouncedInput, hmacKey, useHmac, uppercase, compute]);

  const copyHash = async (algo: Algorithm, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      toast.error('Could not copy. Allow clipboard access and try again.');
      return;
    }
    setCopiedKey(algo);
    toast.success(`${algo} hash copied`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const outputText = ALGORITHMS.filter((algo) => results[algo]).map((algo) => `${algo}: ${results[algo]}`).join('\n');
  return (
    <ToolFrame toolbar={<>
      <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="h-3.5 w-3.5 accent-primary" /><span className="text-xs text-muted-foreground">Uppercase output</span></label>
      <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={useHmac} onChange={(e) => setUseHmac(e.target.checked)} className="h-3.5 w-3.5 accent-primary" /><span className="text-xs text-muted-foreground">HMAC mode</span></label>
      {useHmac && <input type="text" value={hmacKey} onChange={(e) => setHmacKey(e.target.value)} placeholder="HMAC secret key…" aria-label="HMAC secret key" className="input-field min-w-48 flex-1 py-1.5 font-mono text-xs" />}
      <div className="ml-auto"><button type="button" className="btn-primary" onClick={() => compute()}><Hash size={14} />Compute Hashes</button></div>
    </>}>
      <PanelLayout
        inputLabel="Input Text"
        outputLabel="Hashes"
        outputBody="content"
        inputPanel={<CodeEditor value={input} onChange={setInput} minHeight="100%" placeholder="Enter text to hash…" />}
        outputPanel={<ul className="flex flex-col gap-3">
          {ALGORITHMS.map((algo) => (
            <li key={`hash-${algo}`} className="rounded-lg border border-border bg-background-secondary/50 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{algo}</span>
                {results[algo] && (
                  <button type="button" className={`btn-icon h-7 min-h-0 w-7 min-w-0 ${copiedKey === algo ? 'text-primary' : ''}`} onClick={() => copyHash(algo, results[algo])} aria-label={`Copy ${algo} hash`}>
                    {copiedKey === algo ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
              <div className="min-h-[20px] break-all font-mono text-xs text-foreground">{results[algo] || <span className="text-muted-foreground">—</span>}</div>
            </li>
          ))}
        </ul>}
        outputText={outputText}
        outputStatus={outputText ? 'success' : 'idle'}
        downloadName="hashes.txt"
        onSample={() => setInput(SAMPLE)}
        onClear={() => setInput('')}
      />
    </ToolFrame>
  );
}
