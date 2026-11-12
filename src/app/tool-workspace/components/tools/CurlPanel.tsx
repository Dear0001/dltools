'use client';
import React, { useEffect, useState } from 'react';
import { Tool } from '@/data/tools';
import { Plus, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeOutput from '../CodeOutput';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface FormValues {
  method: HttpMethod;
  url: string;
  headers: Header[];
  body: string;
  authType: 'none' | 'bearer' | 'basic' | 'apikey';
  authValue: string;
  authUser: string;
  authPassword: string;
  apiKeyHeader: string;
  followRedirects: boolean;
  verbose: boolean;
}

const DEFAULT_VALUES: FormValues = {
  method: 'GET',
  url: 'https://api.devtoolkit.io/v1/tools',
  headers: [
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Accept', value: 'application/json', enabled: true },
  ],
  body: '',
  authType: 'bearer',
  authValue: 'your-token-here',
  authUser: '',
  authPassword: '',
  apiKeyHeader: 'X-API-Key',
  followRedirects: true,
  verbose: false,
};

const EMPTY_VALUES: FormValues = {
  ...DEFAULT_VALUES,
  url: '',
  headers: [],
  body: '',
  authType: 'none',
  authValue: '',
};

export default function CurlPanel({ tool: _tool }: { tool: Tool }) {
  const [output, setCurl] = useState('');

  const { register, control, watch, reset } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const { fields, append, remove } = useFieldArray({ control, name: 'headers' });
  const authType = watch('authType');
  const method = watch('method');
  const watchedFormKey = JSON.stringify(watch());

  const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  const generate = (data: FormValues) => {
    const parts: string[] = ['curl'];
    if (data.verbose) parts.push('-v');
    if (data.followRedirects) parts.push('-L');
    parts.push(`-X ${data.method}`);

    // Auth
    if (data.authType === 'bearer') {
      parts.push(`-H ${shellQuote(`Authorization: Bearer ${data.authValue}`)}`);
    } else if (data.authType === 'basic') {
      parts.push(`-u ${shellQuote(`${data.authUser}:${data.authPassword}`)}`);
    } else if (data.authType === 'apikey') {
      parts.push(`-H ${shellQuote(`${data.apiKeyHeader}: ${data.authValue}`)}`);
    }

    // Headers
    data.headers.filter((h) => h.enabled && h.key).forEach((h) => {
      parts.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);
    });

    // Body
    if (data.body && ['POST', 'PUT', 'PATCH'].includes(data.method)) {
      parts.push(`-d ${shellQuote(data.body)}`);
    }

    parts.push(shellQuote(data.url));

    setCurl(parts.join(' \\\n  '));
  };

  useEffect(() => {
    try { generate(JSON.parse(watchedFormKey) as FormValues); }
    catch { setCurl(''); }
    // watchedFormKey changes only when a form value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFormKey]);

  const heading = 'mb-2 text-xs font-semibold text-muted-foreground';
  return (
    <ToolFrame toolbar={<>
      <select className="select-input w-28 flex-shrink-0" aria-label="HTTP method" {...register('method')}>
        {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as HttpMethod[]).map((m) => <option key={`method-${m}`} value={m}>{m}</option>)}
      </select>
      <input type="text" aria-label="Request URL" {...register('url')} className="input-field min-w-0 flex-1 font-mono text-sm" placeholder="https://api.example.com/endpoint" />
    </>}
      notice="The cURL command updates automatically as you edit the request."
    >
      <PanelLayout
        inputLabel="Request"
        outputLabel="cURL Command"
        inputBody="content"
        inputPanel={<div className="space-y-5">
          <section>
            <h3 className={heading}>Authentication</h3>
            <select className="select-input mb-2 w-full" aria-label="Authentication" {...register('authType')}>
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
            </select>
            {authType === 'bearer' && <input type="text" {...register('authValue')} className="input-field font-mono text-sm" placeholder="Bearer token value" aria-label="Bearer token value" />}
            {authType === 'basic' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" {...register('authUser')} className="input-field" placeholder="Username" aria-label="Username" />
                <input type="password" {...register('authPassword')} className="input-field" placeholder="Password" aria-label="Password" />
              </div>
            )}
            {authType === 'apikey' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" {...register('apiKeyHeader')} className="input-field font-mono text-sm" placeholder="Header name" aria-label="Header name" />
                <input type="text" {...register('authValue')} className="input-field font-mono text-sm" placeholder="API key value" aria-label="API key value" />
              </div>
            )}
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground">Headers</h3>
              <button type="button" className="btn-ghost min-h-0 px-2 py-1 text-xs" onClick={() => append({ key: '', value: '', enabled: true })}><Plus size={12} />Add Header</button>
            </div>
            <div className="flex flex-col gap-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input type="checkbox" {...register(`headers.${i}.enabled`)} className="h-3.5 w-3.5 flex-shrink-0 accent-primary" aria-label="Enable header" />
                  <input type="text" {...register(`headers.${i}.key`)} className="input-field min-w-0 flex-1 py-1.5 font-mono text-xs" placeholder="Header name" aria-label="Header name" />
                  <input type="text" {...register(`headers.${i}.value`)} className="input-field min-w-0 flex-1 py-1.5 font-mono text-xs" placeholder="Value" aria-label="Value" />
                  <button type="button" className="btn-icon flex-shrink-0" onClick={() => remove(i)} aria-label="Remove"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </section>
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <section>
              <h3 className={heading}>Request Body</h3>
              <textarea {...register('body')} className="input-code min-h-28 resize-y" placeholder='{"key": "value"}' spellCheck={false} aria-label="Request Body" />
            </section>
          )}
          <section className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" {...register('followRedirects')} className="h-3.5 w-3.5 accent-primary" /><span className="text-xs text-muted-foreground">Follow redirects (-L)</span></label>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" {...register('verbose')} className="h-3.5 w-3.5 accent-primary" /><span className="text-xs text-muted-foreground">Verbose output (-v)</span></label>
          </section>
        </div>}
        outputPanel={<CodeOutput value={output} language="text" placeholder="cURL command appears here…" />}
        outputText={output}
        outputStatus={output ? 'success' : 'idle'}
        downloadName="request.sh"
        onSample={() => reset(DEFAULT_VALUES)}
        onClear={() => reset(EMPTY_VALUES)}
      />
    </ToolFrame>
  );
}
