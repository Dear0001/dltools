'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { ClipboardPaste, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import KhqrResult from './KhqrResult';
import crc16 from './crc16';
import { useDebouncedValue } from '../useDebouncedValue';

function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

function withCrc(parts: string[]): string {
  const payload = `${parts.join('')}6304`;
  return `${payload}${crc16(payload)}`;
}

const SAMPLE = withCrc([
  tlv('00', '01'),
  tlv('01', '12'),
  tlv('29', tlv('00', 'devtoolkit@aclb') + tlv('01', '000123456789') + tlv('02', 'ACLEDA Bank')),
  tlv('52', '5999'),
  tlv('53', '840'),
  tlv('54', '12.50'),
  tlv('58', 'KH'),
  tlv('59', 'DevToolkit Store'),
  tlv('60', 'Phnom Penh'),
  tlv('99', tlv('00', '1767225600000') + tlv('01', '4102444800000')),
]);

export default function KhqrValidatorPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const debounced = useDebouncedValue(input).trim();

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setInput(text.trim());
      else toast.error('Clipboard is empty');
    } catch {
      toast.error('Clipboard access denied — paste with Ctrl/⌘+V instead');
    }
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-4 sm:p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="khqr-input" className="text-xs text-muted-foreground font-medium">
              KHQR / EMVCo string
            </label>
            <button type="button" className="btn-ghost text-2xs" onClick={() => setInput(SAMPLE)}>
              Load sample
            </button>
          </div>
          <textarea
            id="khqr-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input-code w-full text-xs"
            rows={4}
            placeholder="Paste KHQR EMVCo string here… 000201010212…"
            spellCheck={false}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary text-xs" onClick={paste}>
              <ClipboardPaste size={12} /> Paste
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => setInput('')} disabled={!input}>
              <Eraser size={12} /> Clear
            </button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{input.trim().length} chars · auto-detected as you type</span>
          </div>
        </div>

        {debounced ? (
          <KhqrResult data={debounced} onFixCrc={(fixed) => { setInput(fixed); toast.success('CRC recalculated'); }} />
        ) : (
          <p className="py-10 text-center text-xs text-muted-foreground">Enter a KHQR / EMVCo string to validate.</p>
        )}
      </div>
    </div>
  );
}
