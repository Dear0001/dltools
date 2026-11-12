'use client';

import { useState } from 'react';
import type { Tool } from '@/data/tools';
import { Send } from 'lucide-react';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeOutput from '../CodeOutput';

const SAMPLE_HEADERS = '{\n  "Accept": "application/json"\n}';
export default function ApiTesterPanel({ tool: _tool }: { tool: Tool }) {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [headers, setHeaders] = useState(SAMPLE_HEADERS);
  const [body, setBody] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true); setResult(''); setStatus('Sending…');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    const started = performance.now();
    try {
      const parsedHeaders = JSON.parse(headers || '{}');
      if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== 'object') throw new Error('Headers must be a JSON object.');
      const response = await fetch(url, { method, headers: parsedHeaders as Record<string, string>, ...(method === 'GET' || method === 'HEAD' ? {} : { body }), signal: controller.signal });
      const text = await response.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep response text */ }
      const responseHeaders = Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n');
      setResult(`${responseHeaders ? `Response headers\n${responseHeaders}\n\n` : ''}${formatted}`);
      setStatus(`${response.status} ${response.statusText} · ${Math.round(performance.now() - started)} ms`);
    } catch (cause) {
      const message = cause instanceof Error && cause.name === 'AbortError' ? 'Request timed out after 30 seconds.' : cause instanceof Error ? cause.message : 'Request failed.';
      setResult(message); setStatus('Request failed');
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  const failed = status === 'Request failed';
  return (
    <ToolFrame
      toolbar={<>
        <select className="select-input" aria-label="HTTP method" value={method} onChange={(event) => setMethod(event.target.value)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((item) => <option key={item}>{item}</option>)}</select>
        <input className="input-field min-w-0 flex-1 font-mono text-sm" aria-label="Request URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com/resource" />
        <button type="button" className="btn-primary" disabled={busy || !url.trim()} onClick={send}><Send size={14} />{busy ? 'Sending…' : 'Send'}</button>
      </>}
      notice="Requests run from your browser. Cross-origin requests require the API to allow CORS. Never send secrets to an endpoint you do not trust."
    >
      <PanelLayout
        inputLabel="Request"
        outputLabel="Response"
        inputBody="content"
        inputPanel={<div className="flex flex-1 flex-col gap-4">
          <label className="flex min-h-[8rem] flex-1 flex-col"><span className="field-label">Headers (JSON)</span><textarea className="input-code flex-1 resize-none" value={headers} onChange={(event) => setHeaders(event.target.value)} spellCheck={false} /></label>
          <label className="flex min-h-[8rem] flex-1 flex-col"><span className="field-label">Request body</span><textarea className="input-code flex-1 resize-none" value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} placeholder="Used for POST, PUT, and PATCH" /></label>
        </div>}
        outputPanel={<CodeOutput value={result} language="text" placeholder="Response body and readable headers will appear here." />}
        outputActions={status ? <span className={`mr-1 rounded-full px-2 py-0.5 font-mono text-xs ${failed ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>{status}</span> : null}
        outputText={result}
        outputStatus={busy ? 'idle' : failed ? 'error' : result ? 'success' : 'idle'}
        downloadName="response.txt"
        onSample={() => { setMethod('GET'); setUrl('https://jsonplaceholder.typicode.com/todos/1'); setHeaders(SAMPLE_HEADERS); setBody(''); }}
        onClear={() => { setUrl(''); setHeaders('{}'); setBody(''); setResult(''); setStatus(''); }}
      />
    </ToolFrame>
  );
}
