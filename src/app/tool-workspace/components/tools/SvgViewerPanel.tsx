'use client';

import { useEffect, useMemo, useState } from 'react';
import beautify from 'js-beautify';
import { Link2, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" rx="24" fill="#0ea5e9"/><circle cx="160" cy="90" r="48" fill="white"/><path d="M145 65v50l45-25z" fill="#0ea5e9"/></svg>`;

function sanitizeSvg(source: string): string {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') throw new Error('Enter valid SVG markup with an <svg> root element.');
  document.querySelectorAll('script, style, foreignObject, iframe, object, embed').forEach((node) => node.remove());
  for (const element of Array.from(document.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || /javascript:/i.test(value) || /@import|expression\s*\(/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (['href', 'xlink:href'].includes(name) && value && !value.startsWith('#') && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (/url\(\s*['"]?(?!#)/i.test(value)) element.removeAttribute(attribute.name);
    }
  }
  return new XMLSerializer().serializeToString(document.documentElement);
}

export default function SvgViewerPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [dataUri, setDataUri] = useState('');
  const isValid = useMemo(() => {
    try { return Boolean(sanitizeSvg(input)); } catch { return false; }
  }, [input]);

  useEffect(() => {
    if (!isValid) {
      setPreviewUrl('');
      return;
    }
    const safe = sanitizeSvg(input);
    const url = URL.createObjectURL(new Blob([safe], { type: 'image/svg+xml' }));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [input, isValid]);

  const optimize = () => {
    try {
      const safe = sanitizeSvg(input);
      const formatted = beautify.html(safe, { indent_size: 2, preserve_newlines: false });
      setOutput(formatted);
      setDataUri(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(safe)))}`);
      setError('');
    } catch (cause) {
      setOutput('');
      setDataUri('');
      setError(cause instanceof Error ? cause.message : 'Could not process this SVG.');
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <ToolFrame toolbar={<div className="ml-auto"><button type="button" className="btn-primary" onClick={optimize} disabled={!isValid}><WandSparkles size={14} />Sanitize &amp; format</button></div>}>
      <PanelLayout
        inputLabel="SVG source"
        outputLabel="Preview"
        outputBody="content"
        inputPanel={<CodeEditor value={input} onChange={(value) => { setInput(value); setError(''); setOutput(''); setDataUri(''); }} minHeight="100%" placeholder="Paste SVG markup…" />}
        outputPanel={<div className="flex flex-1 flex-col gap-3">
          <div className="flex min-h-48 flex-1 items-center justify-center overflow-auto rounded-lg border border-border bg-[linear-gradient(45deg,var(--tw-gradient-stops))] from-muted via-background to-muted p-6">
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- user-generated blob/data URL; next/image cannot optimise it */}
                <img src={previewUrl} alt="Sanitized SVG preview" className="max-h-full max-w-full object-contain" />
              </>
            ) : <p className="text-sm text-muted-foreground">Enter valid SVG markup to preview it.</p>}
          </div>
          {output && <details className="rounded-lg border border-border"><summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">Sanitized SVG output</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap px-3 pb-3 font-mono text-xs text-foreground">{output}</pre></details>}
        </div>}
        outputActions={dataUri ? <button type="button" className="btn-icon gap-1 px-2 text-xs font-medium" onClick={() => void copy(dataUri, 'Data URI')} title="Copy data URI" aria-label="Copy data URI"><Link2 size={13} /><span className="hidden sm:inline">Data URI</span></button> : null}
        outputText={output}
        outputStatus={error ? 'error' : output ? 'success' : 'idle'}
        errorMessage={error}
        downloadName="optimized.svg"
        onSample={() => setInput(SAMPLE)}
        onClear={() => { setInput(''); setOutput(''); setDataUri(''); setError(''); }}
      />
    </ToolFrame>
  );
}
