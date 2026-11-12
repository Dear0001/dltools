'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Tool } from '@/data/tools';
import ToolFrame, { DetailList, ToolbarField } from '../ToolFrame';
import PanelLayout from '../PanelLayout';

const SAMPLE = '*/15 9-17 * * 1-5';
const FIELD_RANGES: Array<[number, number]> = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

function parseField(field: string, index: number): Set<number> {
  const [min, max] = FIELD_RANGES[index];
  const values = new Set<number>();
  for (const part of field.split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step in ${field}.`);
    let start: number;
    let end: number;
    if (rangePart === '*') { start = min; end = max; }
    else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-').map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a > b) throw new Error(`Invalid range in ${field}.`);
      start = a; end = b;
    } else {
      start = Number(rangePart); end = stepPart === undefined ? start : max;
    }
    if (start < min || end > max || start > end) throw new Error(`${field} is outside the valid range ${min}-${max}.`);
    for (let value = start; value <= end; value += step) values.add(index === 4 && value === 7 ? 0 : value);
  }
  if (!values.size) throw new Error(`No values found in ${field}.`);
  return values;
}

function explain(expression: string) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Use five fields: minute hour day-of-month month day-of-week.');
  const sets = fields.map((field, index) => parseField(field, index));
  const anyDayOfMonth = fields[2] === '*';
  const anyDayOfWeek = fields[4] === '*';
  const matches = (date: Date) => sets[0].has(date.getUTCMinutes()) && sets[1].has(date.getUTCHours()) && sets[3].has(date.getUTCMonth() + 1) &&
    (anyDayOfMonth || anyDayOfWeek ? sets[2].has(date.getUTCDate()) && sets[4].has(date.getUTCDay()) : sets[2].has(date.getUTCDate()) || sets[4].has(date.getUTCDay()));

  const next: Date[] = [];
  const cursor = new Date();
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  for (let i = 0; i < 527040 && next.length < 5; i += 1) {
    if (matches(cursor)) next.push(new Date(cursor));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  const descriptions = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'];
  return { fields, summary: fields.map((field, index) => `${descriptions[index]}: ${field}`).join('\n'), next };
}

export default function CronBuilderPanel({ tool: _tool }: { tool: Tool }) {
  const [expression, setExpression] = useState(SAMPLE);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const result = useMemo(() => {
    if (!ready) return { fields: [], summary: '', next: [], error: '' };
    try { return { ...explain(expression), error: '' }; }
    catch (cause) { return { fields: [], summary: '', next: [], error: cause instanceof Error ? cause.message : 'Invalid cron expression.' }; }
  }, [expression, ready]);
  const nextRuns = result.next.map((date) => date.toISOString().replace('T', ' ').slice(0, 16));
  const outputText = result.error ? '' : `${result.summary}\n\nNext run times (UTC)\n${nextRuns.join('\n')}`;
  return (
    <ToolFrame
      toolbar={<ToolbarField label="Preset"><select className="select-input" defaultValue="custom" onChange={(event) => { if (event.target.value !== 'custom') setExpression(event.target.value); }}><option value="custom">Custom expression</option><option value="* * * * *">Every minute</option><option value="*/5 * * * *">Every 5 minutes</option><option value="0 * * * *">Every hour</option><option value="0 0 * * *">Every day at midnight UTC</option><option value="0 9 * * 1-5">Weekdays at 09:00 UTC</option><option value="0 9 * * 1">Every Monday at 09:00 UTC</option><option value="0 9 1 * *">First day of each month at 09:00 UTC</option></select></ToolbarField>}
      notice="Fields use UTC. Supports *, lists, ranges, and steps."
    >
      <PanelLayout
        inputBody="content"
        outputBody="content"
        inputPanel={<label className="block"><span className="field-label">Five-field cron expression</span><input value={expression} onChange={(event) => setExpression(event.target.value)} className="input-field font-mono" placeholder="minute hour day-of-month month day-of-week" aria-invalid={Boolean(result.error)} /></label>}
        outputPanel={result.error ? <p className="notice notice-error" role="alert">{result.error}</p> : <div className="space-y-5">
          <section><h3 className="field-label">Field breakdown</h3><DetailList rows={result.fields.map((value, index) => [['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'][index], value] as [string, string])} /></section>
          <section><h3 className="field-label">Next run times (UTC)</h3>{nextRuns.length ? <ol className="space-y-1.5 font-mono text-sm text-foreground">{nextRuns.map((run) => <li key={run} className="rounded-md bg-background-secondary/60 px-3 py-1.5">{run}</li>)}</ol> : ready && <p className="text-sm text-muted-foreground">No run found in the next year.</p>}</section>
        </div>}
        outputText={outputText}
        outputStatus={result.error ? 'error' : result.fields.length ? 'success' : 'idle'}
        downloadName="cron.txt"
        onSample={() => setExpression(SAMPLE)}
        onClear={() => setExpression('')}
      />
    </ToolFrame>
  );
}
