'use client';
import React, { useCallback, useState, useEffect } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { AlertTriangle, CheckCircle2, Key } from 'lucide-react';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMTIzNDUiLCJuYW1lIjoiU29waGVhIENoYW4iLCJlbWFpbCI6InNvcGhlYUBkZXZ0b29sa2l0LmlvIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzOTI4MDAwLCJleHAiOjE3NTM5MzE2MDAsImF1ZCI6ImRldnRvb2xraXQiLCJpc3MiOiJodHRwczovL2F1dGguZGV2dG9vbGtpdC5pbyJ9.signature_placeholder';

interface JwtPayload {
  [key: string]: unknown;
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
  aud?: string | string[];
}

export default function JwtPanel({ tool: _tool }: { tool: Tool }) {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [header, setHeader] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [nowTs, setNowTs] = useState(0);
  const debouncedToken = useDebouncedValue(token);

  useEffect(() => {
    setNowTs(Math.floor(Date.now() / 1000));
  }, []);

  const decode = useCallback((source = token) => {
    if (!source.trim()) {
      setHeader(null);
      setPayload(null);
      setSignature('');
      setError('');
      return;
    }
    try {
      const parts = source.trim().split('.');
      if (parts.length !== 3) throw new Error('JWT must have exactly 3 parts separated by dots');
      const decodeB64 = (s: string) => {
        const padded = s + '=='.slice(0, (4 - s.length % 4) % 4);
        return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
      };
      setHeader(decodeB64(parts[0]));
      setPayload(decodeB64(parts[1]));
      setSignature(parts[2]);
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Decode error';
      setError(msg);
      setHeader(null);
      setPayload(null);
      setSignature('');
    }
  }, [token]);

  useEffect(() => {
    if (token !== debouncedToken) {
      setHeader(null);
      setPayload(null);
      setSignature('');
      setError('');
      return;
    }
    decode(debouncedToken);
  }, [token, debouncedToken, decode]);

  const isExpired = payload?.exp ? payload.exp < nowTs : false;
  const expiresIn = payload?.exp ? payload.exp - nowTs : null;

  const formatValue = (v: unknown): string => {
    if (typeof v === 'number' && (String(v).length === 10 || String(v).length === 13)) {
      const d = new Date(v * (String(v).length === 10 ? 1000 : 1));
      return `${v} (${d.toISOString()})`;
    }
    return JSON.stringify(v);
  };

  const outputText = header ? JSON.stringify({ header, payload, signature }, null, 2) : '';
  const section = (title: string, tone: 'primary' | 'warning', children: React.ReactNode, aside?: React.ReactNode) => (
    <section className="rounded-lg border border-border bg-background-secondary/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone === 'primary' ? 'bg-primary' : 'bg-warning'}`} />
        <h3 className={`text-xs font-semibold ${tone === 'primary' ? 'text-primary' : 'text-warning'}`}>{title}</h3>
        {aside && <span className="ml-auto text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
  const rows = (entries: Array<[string, unknown]>, format: (value: unknown) => string) => (
    <dl className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-3">
          <dt className="w-20 flex-shrink-0 truncate font-mono text-xs text-primary">{k}</dt>
          <dd className="break-all font-mono text-xs text-foreground">{format(v)}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <ToolFrame toolbar={<div className="ml-auto"><button type="button" className="btn-primary" onClick={() => decode()}><Key size={14} />Decode JWT</button></div>}>
      <PanelLayout
        inputLabel="JWT Token"
        outputLabel="Decoded token"
        outputBody="content"
        inputPanel={<CodeEditor value={token} onChange={setToken} minHeight="100%" placeholder="Paste JWT token here… eyJhbGciOi..." />}
        outputPanel={!header ? (
          error ? <p className="notice notice-error" role="alert"><AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />{error}</p>
            : <OutputPlaceholder icon={<Key size={24} />} title="Paste a JWT to decode it." />
        ) : <div className="flex flex-col gap-4">
          {payload && expiresIn !== null && (
            <p className={`notice ${isExpired ? 'notice-error' : 'notice-success'}`}>
              {isExpired ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />}
              {isExpired ? `Token expired ${Math.abs(expiresIn)}s ago` : `Token valid — expires in ${expiresIn}s`}
            </p>
          )}
          {section('Header', 'primary', rows(Object.entries(header), (v) => String(v)))}
          {payload && section('Payload', 'primary', rows(Object.entries(payload), formatValue))}
          {signature && section('Signature', 'warning', <p className="break-all font-mono text-xs text-warning">{signature}</p>, 'Not verified — provide secret to verify')}
        </div>}
        outputText={outputText}
        outputStatus={error ? 'error' : header ? 'success' : 'idle'}
        errorMessage={error}
        downloadName="jwt.json"
        onSample={() => setToken(SAMPLE_JWT)}
        onClear={() => setToken('')}
      />
    </ToolFrame>
  );
}
