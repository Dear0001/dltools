'use client';
import React, { useState, useMemo } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import * as Diff from 'diff';
import { GitCompare, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const SAMPLE_LEFT = `{
  "name": "DevToolkit",
  "version": "1.0.0",
  "description": "Browser developer tools",
  "config": {
    "theme": "dark",
    "autosave": true,
    "maxHistory": 50
  }
}`;

const SAMPLE_RIGHT = `{
  "name": "DevToolkit",
  "version": "2.0.0",
  "description": "Browser-based developer tools suite",
  "config": {
    "theme": "dark",
    "autosave": false,
    "maxHistory": 100,
    "language": "en"
  },
  "author": "devtoolkit"
}`;

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNum: number;
}

export default function DiffPanel({ tool: _tool }: { tool: Tool }) {
  const [left, setLeft] = useState(SAMPLE_LEFT);
  const [right, setRight] = useState(SAMPLE_RIGHT);
  const [mode, setMode] = useState<'split' | 'unified'>('split');
  const [leftZoom, setLeftZoom] = useState(13);
  const [rightZoom, setRightZoom] = useState(13);

  const diffLines = useMemo((): DiffLine[] => {
    const changes = Diff.diffLines(left, right);
    const lines: DiffLine[] = [];
    let lineNum = 1;
    for (const part of changes) {
      const rawLines = part.value.split('\n');
      for (let i = 0; i < rawLines.length; i++) {
        if (i === rawLines.length - 1 && rawLines[i] === '') continue;
        lines.push({
          type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
          value: rawLines[i],
          lineNum: lineNum++,
        });
      }
    }
    return lines;
  }, [left, right]);

  const stats = useMemo(() => ({
    added: diffLines.filter((l) => l.type === 'added').length,
    removed: diffLines.filter((l) => l.type === 'removed').length,
    unchanged: diffLines.filter((l) => l.type === 'unchanged').length,
  }), [diffLines]);

  const adjustZoom = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, delta: number) => {
    setter(Math.min(24, Math.max(10, current + delta)));
  };

  const outputText = diffLines.length && (stats.added || stats.removed)
    ? diffLines.map((line) => `${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} ${line.value}`).join('\n')
    : '';
  const editor = (label: string, value: string, onChange: (v: string) => void, zoom: number, setZoom: React.Dispatch<React.SetStateAction<number>>, placeholder: string, which: string) => (
    <div className="flex min-h-[14rem] min-w-0 flex-1 flex-col lg:min-h-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background-secondary/50 px-3.5 py-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" className="btn-icon h-7 min-h-0 w-7 min-w-0" onClick={() => adjustZoom(setZoom, zoom, -1)} title={`Zoom out ${which}`} aria-label={`Zoom out ${which}`}><ZoomOut size={12} /></button>
          <span className="min-w-10 text-center font-mono text-[11px] text-muted-foreground">{zoom}px</span>
          <button type="button" className="btn-icon h-7 min-h-0 w-7 min-w-0" onClick={() => adjustZoom(setZoom, zoom, 1)} title={`Zoom in ${which}`} aria-label={`Zoom in ${which}`}><ZoomIn size={12} /></button>
          <button type="button" className="btn-icon h-7 min-h-0 w-7 min-w-0" onClick={() => setZoom(13)} title={`Reset ${which} zoom`} aria-label={`Reset ${which} zoom`}><RotateCcw size={12} /></button>
        </div>
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="input-code flex-1 resize-none rounded-none border-0 bg-transparent focus:shadow-none" style={{ fontSize: `${zoom}px`, lineHeight: 1.6 }} spellCheck={false} placeholder={placeholder} aria-label={label} />
    </div>
  );

  return (
    <ToolFrame toolbar={<>
      <ToolbarField label="View">
        <select className="select-input" value={mode} onChange={(e) => setMode(e.target.value as 'split' | 'unified')}>
          <option value="split">Split</option>
          <option value="unified">Unified</option>
        </select>
      </ToolbarField>
      <div className="ml-auto flex items-center gap-3 font-mono text-xs">
        <span className="text-success">+{stats.added} added</span>
        <span className="text-error">-{stats.removed} removed</span>
        <span className="text-muted-foreground">{stats.unchanged} unchanged</span>
      </div>
    </>}>
      <PanelLayout
        vertical
        inputLabel="Compare"
        outputLabel="Differences"
        inputPanel={<div className="flex flex-1 flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
          {editor('Original (A)', left, setLeft, leftZoom, setLeftZoom, 'Paste original content here…', 'original')}
          {editor('Modified (B)', right, setRight, rightZoom, setRightZoom, 'Paste modified content here…', 'modified')}
        </div>}
        outputPanel={<div className="flex-1 overflow-auto font-mono text-xs leading-relaxed scrollbar-thin">
          {diffLines.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <GitCompare size={24} />
              <span>Paste content in both panels to see the diff</span>
            </div>
          ) : diffLines.map((line, i) => (
            <div key={`diff-line-${i}-${line.type}`} className={`flex items-start px-4 py-0.5 ${line.type === 'added' ? 'diff-added' : line.type === 'removed' ? 'diff-removed' : ''}`}>
              <span className="mr-4 w-8 flex-shrink-0 select-none text-right tabular-nums text-muted-foreground">{line.lineNum}</span>
              <span className={`w-4 flex-shrink-0 ${line.type === 'added' ? 'text-success' : line.type === 'removed' ? 'text-error' : 'text-muted-foreground'}`}>{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
              <span className={`whitespace-pre-wrap break-all ${line.type === 'added' ? 'text-success' : line.type === 'removed' ? 'text-error' : 'text-foreground'}`}>{line.value || ' '}</span>
            </div>
          ))}
        </div>}
        outputText={outputText}
        outputStatus={stats.added || stats.removed ? 'success' : 'idle'}
        downloadName="changes.diff"
        onSample={() => { setLeft(SAMPLE_LEFT); setRight(SAMPLE_RIGHT); }}
        onClear={() => { setLeft(''); setRight(''); }}
        onSwap={() => { setLeft(right); setRight(left); }}
      />
    </ToolFrame>
  );
}
