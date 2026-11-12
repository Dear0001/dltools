'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UuidPanel({ tool: _tool }: { tool: Tool }) {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);

  const generate = () => {
    // Backend integration point: crypto.randomUUID()
    const generated = Array.from({ length: count }, () => {
      let id = crypto.randomUUID();
      if (!hyphens) id = id.replace(/-/g, '');
      if (uppercase) id = id.toUpperCase();
      return id;
    });
    setUuids(generated);
  };

  const copyOne = async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
    } catch {
      toast.error('Could not copy. Allow clipboard access and try again.');
      return;
    }
    setCopiedId(uuid);
    toast.success('UUID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <ToolFrame toolbar={<div className="ml-auto"><button type="button" className="btn-primary" onClick={generate}><RefreshCw size={14} />Generate</button></div>}>
      <PanelLayout
        inputLabel="Configuration"
        outputLabel="UUIDs"
        inputBody="content"
        outputBody="content"
        inputPanel={<div className="space-y-4">
          <label className="block"><span className="field-label">Count</span>
            <select className="select-input w-full" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[1, 5, 10, 20, 50, 100].map((n) => <option key={`count-${n}`} value={n}>{n} UUID{n > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          <label className="block"><span className="field-label">Version</span><select className="select-input w-full" disabled><option>UUID v4 (random)</option></select></label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="h-3.5 w-3.5 accent-primary" /><span className="text-sm text-muted-foreground">Uppercase</span></label>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} className="h-3.5 w-3.5 accent-primary" /><span className="text-sm text-muted-foreground">Include hyphens</span></label>
          </div>
        </div>}
        outputPanel={uuids.length === 0
          ? <OutputPlaceholder icon={<RefreshCw size={24} />} title="No UUIDs generated yet" description="Configure options above and click Generate to create UUID v4 values." />
          : <ul className="flex flex-col gap-1.5">
            {uuids.map((uuid, i) => (
              <li key={`uuid-result-${i}`} className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-background-secondary/50 px-3 py-2 transition-colors hover:border-primary/30">
                <span className="truncate font-mono text-sm tabular-nums text-foreground">{uuid}</span>
                <button type="button" className={`btn-icon flex-shrink-0 opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${copiedId === uuid ? 'text-primary' : ''}`} onClick={() => copyOne(uuid)} aria-label={`Copy UUID ${uuid}`}>
                  {copiedId === uuid ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </li>
            ))}
          </ul>}
        outputText={uuids.join('\n')}
        outputStatus={uuids.length ? 'success' : 'idle'}
        downloadName="uuids.txt"
        onClear={() => setUuids([])}
      />
    </ToolFrame>
  );
}
