'use client';

import { useState } from 'react';
import type { Tool } from '@/data/tools';
import { AlertTriangle, ShieldAlert, Send } from 'lucide-react';
import ToolFrame from '../ToolFrame';
import { fill, useLocale, type MessageKey } from '@/i18n/LocaleProvider';
import PanelLayout from '../PanelLayout';
import CodeOutput from '../CodeOutput';

const SAMPLE_HEADERS = '{\n  "Accept": "application/json"\n}';

/** Header names that usually carry credentials. */
const SENSITIVE_HEADER = /^(authorization|proxy-authorization|cookie|x-api-key|api-key|apikey|x-auth-token|x-access-token|x-csrf-token)$/i;

/** Names of credential headers in the JSON header text, or [] when there are none or it does not parse. */
export function findCredentialHeaders(headers: string): string[] {
  try {
    const parsed: unknown = JSON.parse(headers || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.keys(parsed).filter((name) => SENSITIVE_HEADER.test(name.trim()));
  } catch {
    return [];
  }
}

/** True for a plain-http URL to anything other than this machine, where credentials travel unencrypted. */
export function isInsecureRemoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}
export default function ApiTesterPanel({ tool: _tool }: { tool: Tool }) {
  const { t } = useLocale();
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [headers, setHeaders] = useState(SAMPLE_HEADERS);
  const [body, setBody] = useState('');
  // Kept language-neutral so switching language re-renders every message in the new language.
  const [response, setResponse] = useState<{ headers: string; body: string; status: string } | null>(null);
  const [failure, setFailure] = useState<{ key: MessageKey } | { detail: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true); setResponse(null); setFailure(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    const started = performance.now();
    try {
      const parsedHeaders: unknown = JSON.parse(headers || '{}');
      if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== 'object') {
        setFailure({ key: 'apiHeadersNotObject' });
        return;
      }
      const res = await fetch(url, { method, headers: parsedHeaders as Record<string, string>, ...(method === 'GET' || method === 'HEAD' ? {} : { body }), signal: controller.signal });
      const text = await res.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep response text */ }
      setResponse({
        headers: Array.from(res.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n'),
        body: formatted,
        status: `${res.status} ${res.statusText} · ${Math.round(performance.now() - started)} ms`,
      });
    } catch (cause) {
      // Browser network errors (CORS, DNS, invalid JSON headers) keep their own message.
      if (cause instanceof Error && cause.name === 'AbortError') setFailure({ key: 'apiTimeout' });
      else if (cause instanceof Error && cause.message) setFailure({ detail: cause.message });
      else setFailure({ key: 'apiFailedDetail' });
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  const result = failure
    ? ('key' in failure ? t(failure.key) : failure.detail)
    : response
      ? `${response.headers ? `${t('apiResponseHeaders')}\n${response.headers}\n\n` : ''}${response.body}`
      : '';
  const status = busy ? t('apiSending') : failure ? t('apiFailed') : response?.status ?? '';
  const failed = failure !== null;
  const credentialHeaders = findCredentialHeaders(headers);
  const insecure = isInsecureRemoteUrl(url);
  return (
    <ToolFrame
      toolbar={<>
        <select className="select-input" aria-label={t('apiMethod')} value={method} onChange={(event) => setMethod(event.target.value)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((item) => <option key={item}>{item}</option>)}</select>
        <input className="input-field min-w-0 flex-1 font-mono text-sm" aria-label={t('apiUrl')} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com/resource" />
        <button type="button" className="btn-primary" disabled={busy || !url.trim()} onClick={send}><Send size={14} aria-hidden="true" />{busy ? t('apiSending') : t('apiSend')}</button>
      </>}
      notice={<span className="flex flex-col gap-2">
        <span role="note" className="notice notice-warning">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <span>
            <strong className="font-semibold">{t('apiSecurityTitle')}</strong>{' '}
            {t('apiSecurityBody')} {t('apiSecurityAdvice')}
          </span>
        </span>
        {(credentialHeaders.length > 0 || insecure) && (
          <span role="alert" className="notice notice-error">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="flex flex-col gap-1">
              {credentialHeaders.length > 0 && <span>{fill(t('apiCredentialHeaders'), { names: credentialHeaders.join(', ') })}</span>}
              {insecure && <span>{t('apiInsecureUrl')}</span>}
            </span>
          </span>
        )}
        <span>{t('apiCors')}</span>
      </span>}
    >
      <PanelLayout
        inputLabel={t('apiRequest')}
        outputLabel={t('apiResponse')}
        inputBody="content"
        inputPanel={<div className="flex flex-1 flex-col gap-4">
          <label className="flex min-h-[8rem] flex-1 flex-col"><span className="field-label">{t('apiHeaders')}</span><textarea className="input-code flex-1 resize-none" value={headers} onChange={(event) => setHeaders(event.target.value)} spellCheck={false} /></label>
          <label className="flex min-h-[8rem] flex-1 flex-col"><span className="field-label">{t('apiBody')}</span><textarea className="input-code flex-1 resize-none" value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} placeholder={t('apiBodyPlaceholder')} /></label>
        </div>}
        outputPanel={<CodeOutput value={result} language="text" placeholder={t('apiResponsePlaceholder')} />}
        outputActions={status ? <span className={`mr-1 rounded-full px-2 py-0.5 font-mono text-xs ${failed ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>{status}</span> : null}
        outputText={result}
        outputStatus={busy ? 'idle' : failed ? 'error' : result ? 'success' : 'idle'}
        downloadName="response.txt"
        onSample={() => { setMethod('GET'); setUrl('https://jsonplaceholder.typicode.com/todos/1'); setHeaders(SAMPLE_HEADERS); setBody(''); }}
        onClear={() => { setUrl(''); setHeaders('{}'); setBody(''); setResponse(null); setFailure(null); }}
      />
    </ToolFrame>
  );
}
