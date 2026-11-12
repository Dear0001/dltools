'use client';
import React, { useMemo, useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}<>?/';

function generatePassword(options: PasswordOptions) {
  const pool = [
    options.lowercase ? LOWER : '',
    options.uppercase ? UPPER : '',
    options.numbers ? NUMBERS : '',
    options.symbols ? SYMBOLS : '',
  ].join('');

  if (!pool) {
    return '';
  }

  const values = Array.from({ length: options.length }, () => {
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  });

  if (!options.lowercase && !options.uppercase && !options.numbers && !options.symbols) {
    return '';
  }

  return values.join('');
}

export default function PasswordGeneratorPanel({ tool: _tool }: { tool: Tool }) {
  const [passwords, setPasswords] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const canGenerate = useMemo(() => {
    return options.lowercase || options.uppercase || options.numbers || options.symbols;
  }, [options]);

  const generate = () => {
    const generated = Array.from({ length: count }, () => generatePassword({ ...options, length }));
    setPasswords(generated.filter(Boolean));
  };

  const copyOne = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      toast.error('Could not copy. Allow clipboard access and try again.');
      return;
    }
    setCopiedValue(password);
    toast.success('Password copied');
    setTimeout(() => setCopiedValue(null), 2000);
  };

  return (
    <ToolFrame toolbar={<div className="ml-auto"><button type="button" className="btn-primary" onClick={generate} disabled={!canGenerate}><RefreshCw size={14} />Generate</button></div>}>
      <PanelLayout
        inputLabel="Configuration"
        outputLabel="Passwords"
        inputBody="content"
        outputBody="content"
        inputPanel={<div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="field-label">Count</span>
              <select className="select-input w-full" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[1, 5, 10, 20, 50].map((n) => <option key={`count-${n}`} value={n}>{n} password{n > 1 ? 's' : ''}</option>)}
              </select>
            </label>
            <label className="block"><span className="field-label">Length</span>
              <input type="number" min={8} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="input-field" />
            </label>
          </div>
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="field-label">Characters</legend>
            {[
              { key: 'lowercase', label: 'Lowercase' },
              { key: 'uppercase', label: 'Uppercase' },
              { key: 'numbers', label: 'Numbers' },
              { key: 'symbols', label: 'Symbols' },
            ].map((item) => (
              <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={Boolean(options[item.key as keyof PasswordOptions])} onChange={(e) => setOptions((prev) => ({ ...prev, [item.key]: e.target.checked }))} className="h-3.5 w-3.5 accent-primary" />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          {!canGenerate && <p className="notice notice-error" role="alert">Choose at least one character set.</p>}
        </div>}
        outputPanel={passwords.length === 0
          ? <OutputPlaceholder icon={<RefreshCw size={24} />} title="No passwords generated yet" description="Choose your character set and click Generate to create secure passwords." />
          : <ul className="flex flex-col gap-1.5">
            {passwords.map((password, i) => (
              <li key={`password-${i}`} className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-background-secondary/50 px-3 py-2 transition-colors hover:border-primary/30">
                <span className="break-all font-mono text-sm tabular-nums text-foreground">{password}</span>
                <button type="button" className={`btn-icon flex-shrink-0 opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${copiedValue === password ? 'text-primary' : ''}`} onClick={() => copyOne(password)} aria-label="Copy password">
                  {copiedValue === password ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </li>
            ))}
          </ul>}
        outputText={passwords.join('\n')}
        outputStatus={passwords.length ? 'success' : 'idle'}
        downloadName="passwords.txt"
        onClear={() => setPasswords([])}
      />
    </ToolFrame>
  );
}
