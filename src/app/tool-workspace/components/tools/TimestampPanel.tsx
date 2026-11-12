'use client';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Tool } from '@/data/tools';
import ToolFrame, { OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import { Clock, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Phnom_Penh',
  'Australia/Sydney',
];

export default function TimestampPanel({ tool: _tool }: { tool: Tool }) {
  const [tsInput, setTsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [tz, setTz] = useState('UTC');
  const [nowTs, setNowTs] = useState('');
  const [results, setResults] = useState<{ label: string; value: string }[]>([]);
  const activeInput = useRef<'timestamp' | 'date'>('timestamp');

  useEffect(() => {
    const ts = Math.floor(Date.now() / 1000);
    setNowTs(String(ts));
    setTsInput(String(ts));
  }, []);

  const convertFromTs = useCallback((source = tsInput) => {
    if (!/^-?\d+$/.test(source.trim())) { setResults([]); return; }
    const ts = Number(source);
    const ms = source.trim().replace('-', '').length >= 13 ? ts : ts * 1000;
    const d = new Date(ms);
    if (!Number.isFinite(ms) || Number.isNaN(d.getTime())) { setResults([]); return; }
    const fmt = (locale: string, options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { ...options, timeZone: tz }).format(d);

    setResults([
      { label: 'ISO 8601', value: d.toISOString() },
      { label: 'UTC String', value: d.toUTCString() },
      { label: 'Local (selected TZ)', value: fmt('en-US', { dateStyle: 'full', timeStyle: 'long' }) },
      { label: 'Date only', value: fmt('en-CA', { dateStyle: 'short' }) },
      { label: 'Time only', value: fmt('en-US', { timeStyle: 'medium' }) },
      { label: 'Unix (seconds)', value: String(Math.floor(ms / 1000)) },
      { label: 'Unix (milliseconds)', value: String(ms) },
      { label: 'Day of week', value: fmt('en-US', { weekday: 'long' }) },
      { label: 'Relative', value: getRelative(d) },
    ]);
  }, [tsInput, tz]);

  const convertFromDate = useCallback((source = dateInput) => {
    if (!source) { setResults([]); return; }
    const d = new Date(source);
    if (isNaN(d.getTime())) { setResults([]); return; }
    const timestamp = String(Math.floor(d.getTime() / 1000));
    setTsInput(timestamp);
    convertFromTs(timestamp);
  }, [dateInput, convertFromTs]);

  useEffect(() => {
    if (activeInput.current === 'date') convertFromDate();
    else convertFromTs();
  }, [tsInput, dateInput, tz, convertFromDate, convertFromTs]);

  const getRelative = (d: Date): string => {
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    const sign = diff > 0 ? 'ago' : 'from now';
    if (abs < 60000) return `${Math.floor(abs / 1000)}s ${sign}`;
    if (abs < 3600000) return `${Math.floor(abs / 60000)}m ${sign}`;
    if (abs < 86400000) return `${Math.floor(abs / 3600000)}h ${sign}`;
    return `${Math.floor(abs / 86400000)}d ${sign}`;
  };

  const copyResult = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy. Allow clipboard access and try again.');
    }
  };

  const useNow = () => {
    const ts = Math.floor(Date.now() / 1000);
    activeInput.current = 'timestamp';
    setNowTs(String(ts));
    setTsInput(String(ts));
  };

  const outputText = results.map((r) => `${r.label}: ${r.value}`).join('\n');
  return (
    <ToolFrame toolbar={<>
      <span className="text-xs text-muted-foreground">Current Unix timestamp:</span>
      <span className="font-mono text-sm tabular-nums text-primary">{nowTs}</span>
      <button type="button" className="btn-ghost py-1" onClick={useNow} title="Use current timestamp"><RefreshCw size={13} />Now</button>
      <label className="ml-auto flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Timezone</span>
        <select className="select-input" value={tz} onChange={(e) => setTz(e.target.value)}>
          {TIMEZONES.map((zone) => <option key={`tz-${zone}`} value={zone}>{zone}</option>)}
        </select>
      </label>
    </>}>
      <PanelLayout
        inputBody="content"
        outputBody="content"
        outputLabel="Formats"
        inputPanel={<div className="space-y-5">
          <div>
            <label className="field-label" htmlFor="ts-unix">Unix Timestamp</label>
            <input id="ts-unix" type="text" value={tsInput} onChange={(e) => { activeInput.current = 'timestamp'; setTsInput(e.target.value); }} className="input-field font-mono" placeholder="1753928000" />
            <button type="button" className="btn-primary mt-2 w-full" onClick={() => { activeInput.current = 'timestamp'; convertFromTs(); }}>Convert Timestamp →</button>
          </div>
          <div>
            <label className="field-label" htmlFor="ts-date">Date / Time String</label>
            <input id="ts-date" type="datetime-local" value={dateInput} onChange={(e) => { activeInput.current = 'date'; setDateInput(e.target.value); }} className="input-field" />
            <button type="button" className="btn-ghost mt-2 w-full" onClick={() => { activeInput.current = 'date'; convertFromDate(); }}>← Convert Date</button>
          </div>
        </div>}
        outputPanel={results.length === 0
          ? <OutputPlaceholder icon={<Clock size={24} />} title="Enter a Unix timestamp or pick a date." />
          : <ul className="overflow-hidden rounded-lg border border-border">
            {results.map((r, i) => (
              <li key={`ts-result-${i}`} className="group flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/50">
                <span className="w-36 flex-shrink-0 text-xs text-muted-foreground">{r.label}</span>
                <span className="flex-1 truncate font-mono text-xs text-foreground" title={r.value}>{r.value}</span>
                <button type="button" className="btn-icon h-7 min-h-0 w-7 min-w-0 opacity-60 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => copyResult(r.value)} aria-label={`Copy ${r.label}`}><Copy size={12} /></button>
              </li>
            ))}
          </ul>}
        outputText={outputText}
        outputStatus={results.length ? 'success' : 'idle'}
        downloadName="timestamp.txt"
        onSample={useNow}
        onClear={() => { activeInput.current = 'timestamp'; setTsInput(''); setDateInput(''); }}
      />
    </ToolFrame>
  );
}
