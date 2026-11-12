'use client';

import { useEffect, useMemo, useState } from 'react';
import { WandSparkles } from 'lucide-react';
import { marked } from 'marked';
import { toast } from 'sonner';
import type { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE = `# Markdown preview

Write **Markdown** on the left and preview it here.

- Headings and lists
- [Links](https://example.com)

\`\`\`js
const ready = true;
\`\`\`
`;

function safeMarkdownHtml(markdown: string): string {
  const rendered = marked.parse(markdown, { async: false });
  const parsed = new DOMParser().parseFromString(rendered, 'text/html');
  const allowed = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'STRONG', 'B', 'EM', 'I', 'DEL', 'S', 'HR', 'BR', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
  const clean = (parent: ParentNode) => {
    for (const child of Array.from(parent.childNodes)) {
      if (!(child instanceof HTMLElement)) continue;
      if (!allowed.has(child.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG'].includes(child.tagName)) child.remove();
        else {
          clean(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }
      const href = child.tagName === 'A' ? child.getAttribute('href') : null;
      for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      if (child.tagName === 'A' && href && /^(https?:|mailto:|#|\/)/i.test(href)) {
        child.setAttribute('href', href);
        child.setAttribute('rel', 'noreferrer noopener');
        child.setAttribute('target', '_blank');
      }
      clean(child);
    }
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}

export default function MarkdownFormatterPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [formatted, setFormatted] = useState(SAMPLE);
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const debouncedInput = useDebouncedValue(input, 300);
  const safeHtml = useMemo(() => safeMarkdownHtml(preview ? formatted : ''), [formatted, preview]);

  useEffect(() => {
    let cancelled = false;
    if (input !== debouncedInput) {
      setFormatted(input);
      return () => { cancelled = true; };
    }
    if (!debouncedInput.trim()) {
      setFormatted('');
      return;
    }
    const formatLive = async () => {
      try {
        const [{ format: prettierFormat }, markdownPlugin] = await Promise.all([
          import('prettier/standalone'),
          import('prettier/plugins/markdown'),
        ]);
        const result = await prettierFormat(debouncedInput, { parser: 'markdown', plugins: [markdownPlugin], proseWrap: 'preserve' });
        if (!cancelled) setFormatted(result);
      } catch {
        if (!cancelled) setFormatted(debouncedInput);
      }
    };
    void formatLive();
    return () => { cancelled = true; };
  }, [input, debouncedInput]);

  const format = async () => {
    setBusy(true);
    try {
      const [{ format: prettierFormat }, markdownPlugin] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/markdown'),
      ]);
      const result = await prettierFormat(input, { parser: 'markdown', plugins: [markdownPlugin], proseWrap: 'preserve' });
      setFormatted(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not format Markdown.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolFrame toolbar={<>
      <div className="segmented" role="group" aria-label="Output view">
        <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>Preview</button>
        <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>Markdown</button>
      </div>
      <div className="ml-auto"><button type="button" className="btn-primary" onClick={format} disabled={busy}><WandSparkles size={14} />{busy ? 'Formatting…' : 'Format'}</button></div>
    </>}>
      <PanelLayout
        inputLabel="Source"
        outputLabel={preview ? 'Preview' : 'Formatted Markdown'}
        outputBody={preview ? 'content' : 'code'}
        inputPanel={<CodeEditor value={input} onChange={(value) => { setInput(value); setFormatted(value); }} minHeight="100%" placeholder="Write Markdown…" />}
        outputPanel={preview
          ? <article className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          : <CodeOutput value={formatted} language="text" placeholder="Formatted Markdown appears here…" />}
        outputText={formatted}
        outputStatus={formatted ? 'success' : 'idle'}
        downloadName="formatted.md"
        onSample={() => { setInput(SAMPLE); setFormatted(SAMPLE); }}
        onClear={() => { setInput(''); setFormatted(''); }}
        onSwap={() => setInput(formatted)}
      />
    </ToolFrame>
  );
}
