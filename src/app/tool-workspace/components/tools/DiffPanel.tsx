'use client';
import React, { useState, useMemo } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { GitCompare, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { translateText, useLocale } from '@/i18n/LocaleProvider';
import { buildSplitDiff, buildUnifiedDiff, type DiffLineType, type SplitCell } from './diffRows';
import { normalizeXml } from './xmlFormat';

/** Each diff tool opens with an example in its own format. */
const SAMPLES: Record<string, [string, string]> = {
  'tool-json-diff': [
    `{
  "name": "DevToolkit",
  "version": "1.0.0",
  "description": "Browser developer tools",
  "config": {
    "theme": "dark",
    "autosave": true,
    "maxHistory": 50
  }
}`,
    `{
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
}`,
  ],
  'tool-text-diff': [
    `Release notes
- Faster JSON formatting
- New KHQR validator
- Dark theme fixes
Thanks for using DLTools.`,
    `Release notes
- Faster JSON and YAML formatting
- New KHQR validator
- Khmer translation updates
Thanks for using DLTools.`,
  ],
  // Same document with different layout plus two real changes; XML Diff normalises the layout first.
  'tool-xml-diff': [
    `<?xml version="1.0" encoding="UTF-8"?><catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><price>44.95</price></book><book id="bk102"><author>Ralls, Kim</author><title>Midnight Rain</title><price>5.95</price></book></catalog>`,
    `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>39.95</price>
  </book>
  <book id="bk102">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
    <genre>Fantasy</genre>
  </book>
</catalog>`,
  ],
  'tool-java-diff': [
    `public class Greeter {
    private final String name;

    public Greeter(String name) {
        this.name = name;
    }

    public String greet() {
        return "Hello, " + name;
    }
}`,
    `public class Greeter {
    private final String name;
    private final String greeting;

    public Greeter(String name, String greeting) {
        this.name = name;
        this.greeting = greeting;
    }

    public String greet() {
        return greeting + ", " + name + "!";
    }
}`,
  ],
};

const textClass: Record<DiffLineType, string> = { added: 'text-success', removed: 'text-error', unchanged: 'text-foreground' };
const rowClass: Record<DiffLineType, string> = { added: 'diff-added', removed: 'diff-removed', unchanged: '' };
const marker: Record<DiffLineType, string> = { added: '+', removed: '-', unchanged: ' ' };

function isWellFormedXml(value: string): boolean {
  if (!value.trim()) return true;
  const doc = new DOMParser().parseFromString(value, 'application/xml');
  return doc.getElementsByTagName('parsererror').length === 0;
}

function SplitSide({ cell }: { cell?: SplitCell }) {
  if (!cell) return <div className="flex min-w-0 items-start bg-background-secondary/40 px-3 py-0.5" aria-hidden="true">&nbsp;</div>;
  return (
    <div className={`flex min-w-0 items-start px-3 py-0.5 ${rowClass[cell.type]}`}>
      <span className="mr-3 w-8 flex-shrink-0 select-none text-right tabular-nums text-muted-foreground">{cell.lineNum}</span>
      <span className={`w-4 flex-shrink-0 select-none ${cell.type === 'unchanged' ? 'text-muted-foreground' : textClass[cell.type]}`}>{marker[cell.type]}</span>
      <span className={`min-w-0 whitespace-pre-wrap break-all ${textClass[cell.type]}`}>{cell.value || ' '}</span>
    </div>
  );
}

export default function DiffPanel({ tool }: { tool: Tool }) {
  const { locale } = useLocale();
  const [sampleLeft, sampleRight] = SAMPLES[tool.id] ?? SAMPLES['tool-text-diff'];
  const isXml = tool.id === 'tool-xml-diff';
  const [left, setLeft] = useState(sampleLeft);
  const [right, setRight] = useState(sampleRight);
  const [mode, setMode] = useState<'split' | 'unified'>('split');
  const [leftZoom, setLeftZoom] = useState(13);
  const [rightZoom, setRightZoom] = useState(13);

  // XML Diff compares the documents after normalising their layout, so indentation and line breaks
  // alone never show up as changes. If either side is not well-formed, it falls back to a plain text diff.
  const xmlState = useMemo(() => {
    if (!isXml) return { ok: true, left, right };
    const ok = isWellFormedXml(left) && isWellFormedXml(right);
    return ok
      ? { ok, left: left.trim() ? normalizeXml(left) : '', right: right.trim() ? normalizeXml(right) : '' }
      : { ok, left, right };
  }, [isXml, left, right]);

  const diffLines = useMemo(() => buildUnifiedDiff(xmlState.left, xmlState.right), [xmlState]);
  const splitRows = useMemo(() => buildSplitDiff(xmlState.left, xmlState.right), [xmlState]);

  const stats = useMemo(() => ({
    added: diffLines.filter((l) => l.type === 'added').length,
    removed: diffLines.filter((l) => l.type === 'removed').length,
    unchanged: diffLines.filter((l) => l.type === 'unchanged').length,
  }), [diffLines]);

  const adjustZoom = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, delta: number) => {
    setter(Math.min(24, Math.max(10, current + delta)));
  };

  const outputText = diffLines.length && (stats.added || stats.removed)
    ? diffLines.map((line) => `${marker[line.type]} ${line.value}`).join('\n')
    : '';
  const identical = diffLines.length > 0 && !stats.added && !stats.removed;
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

  const notice = isXml
    ? translateText(xmlState.ok
      ? 'Both documents are re-indented before comparing, so layout-only differences are ignored.'
      : 'One of the documents is not well-formed XML, so it is compared as plain text.', locale)
    : undefined;

  return (
    <ToolFrame
      notice={notice}
      toolbar={<>
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
      </>}
    >
      <PanelLayout
        vertical
        inputLabel="Compare"
        outputLabel="Differences"
        inputPanel={<div className="flex flex-1 flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
          {editor('Original (A)', left, setLeft, leftZoom, setLeftZoom, 'Paste original content here…', 'original')}
          {editor('Modified (B)', right, setRight, rightZoom, setRightZoom, 'Paste modified content here…', 'modified')}
        </div>}
        outputPanel={<div className="flex-1 overflow-auto font-mono text-xs leading-relaxed scrollbar-thin" data-diff-view={mode}>
          {diffLines.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <GitCompare size={24} aria-hidden="true" />
              <span>Paste content in both panels to see the diff</span>
            </div>
          ) : (
            <>
              {identical && <p className="border-b border-border px-4 py-2 font-sans text-muted-foreground" role="status">{translateText('No differences found. Both sides are identical.', locale)}</p>}
              {mode === 'split' ? (
                <div className="grid min-w-[36rem] grid-cols-2 divide-x divide-border">
                  {splitRows.map((row, i) => (
                    <React.Fragment key={`split-row-${i}`}>
                      <SplitSide cell={row.left} />
                      <SplitSide cell={row.right} />
                    </React.Fragment>
                  ))}
                </div>
              ) : diffLines.map((line, i) => (
                <div key={`diff-line-${i}-${line.type}`} className={`flex items-start px-4 py-0.5 ${rowClass[line.type]}`}>
                  <span className="mr-4 w-8 flex-shrink-0 select-none text-right tabular-nums text-muted-foreground">{line.lineNum}</span>
                  <span className={`w-4 flex-shrink-0 ${line.type === 'unchanged' ? 'text-muted-foreground' : textClass[line.type]}`}>{marker[line.type]}</span>
                  <span className={`whitespace-pre-wrap break-all ${textClass[line.type]}`}>{line.value || ' '}</span>
                </div>
              ))}
            </>
          )}
        </div>}
        outputText={outputText}
        outputStatus={stats.added || stats.removed ? 'success' : 'idle'}
        downloadName="changes.diff"
        onSample={() => { setLeft(sampleLeft); setRight(sampleRight); }}
        onClear={() => { setLeft(''); setRight(''); }}
        onSwap={() => { setLeft(right); setRight(left); }}
      />
    </ToolFrame>
  );
}
