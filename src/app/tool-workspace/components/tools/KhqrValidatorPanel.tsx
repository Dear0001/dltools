'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { ClipboardPaste, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import KhqrResult from './KhqrResult';
import { KHQR_SAMPLE as SAMPLE } from './khqrSample';
import { useDebouncedValue } from '../useDebouncedValue';


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
    <ToolFrame>
      <PanelLayout
        inputLabel="KHQR / EMVCo string"
        outputLabel="Validation result"
        outputBody="content"
        copyable={false}
        downloadable={false}
        inputActions={<button type="button" className="btn-icon gap-1 px-2 text-xs font-medium" onClick={paste} title="Paste from clipboard" aria-label="Paste from clipboard"><ClipboardPaste size={13} /><span className="hidden sm:inline">Paste</span></button>}
        inputPanel={<div className="flex flex-1 flex-col">
          <CodeEditor value={input} onChange={setInput} minHeight="10rem" placeholder="Paste KHQR EMVCo string here… 000201010212…" />
          <p className="border-t border-border px-3.5 py-2 text-xs text-muted-foreground tabular-nums">{input.trim().length} chars · auto-detected as you type</p>
        </div>}
        outputPanel={debounced
          ? <KhqrResult data={debounced} onFixCrc={(fixed) => { setInput(fixed); toast.success('CRC recalculated'); }} />
          : <OutputPlaceholder icon={<QrCode size={28} />} title="Enter a KHQR / EMVCo string to validate." />}
        onSample={() => setInput(SAMPLE)}
        onClear={() => setInput('')}
      />
    </ToolFrame>
  );
}
