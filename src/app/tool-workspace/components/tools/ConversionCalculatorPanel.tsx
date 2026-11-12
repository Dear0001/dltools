'use client';

import { useEffect, useState } from 'react';
import type { Tool } from '@/data/tools';
import ToolFrame, { DetailList } from '../ToolFrame';
import PanelLayout from '../PanelLayout';

type UnitKind = 'length' | 'weight' | 'temperature' | 'data';
const UNIT_TABLE: Record<UnitKind, Record<string, number>> = {
  length: { meter: 1, kilometer: 1000, centimeter: 0.01, mile: 1609.344, foot: 0.3048, inch: 0.0254 },
  weight: { kilogram: 1, gram: 0.001, pound: 0.45359237, ounce: 0.028349523125 },
  temperature: { celsius: 1, fahrenheit: 1, kelvin: 1 },
  data: { byte: 1, kilobyte: 1000, megabyte: 1_000_000, gigabyte: 1_000_000_000, kibibyte: 1024, mebibyte: 1_048_576, gibibyte: 1_073_741_824 },
};
const ZONES = ['Asia/Phnom_Penh', 'UTC', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];

function localTimeInZone(value: string, zone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Enter a valid date and time.');
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(candidate));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
    const represented = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
    candidate += desired - represented;
  }
  return new Date(candidate);
}

function convertTemperature(value: number, from: string, to: string) {
  const celsius = from === 'fahrenheit' ? (value - 32) * 5 / 9 : from === 'kelvin' ? value - 273.15 : value;
  return to === 'fahrenheit' ? celsius * 9 / 5 + 32 : to === 'kelvin' ? celsius + 273.15 : celsius;
}

export default function ConversionCalculatorPanel({ tool: _tool }: { tool: Tool }) {
  const [mode, setMode] = useState<'timezone' | 'units'>('timezone');
  const [dateValue, setDateValue] = useState('2026-10-17T12:00');
  const [fromZone, setFromZone] = useState('Asia/Phnom_Penh');
  const [toZone, setToZone] = useState('America/New_York');
  const [kind, setKind] = useState<UnitKind>('length');
  const [amount, setAmount] = useState('1');
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('kilometer');
  useEffect(() => { setDateValue(new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)); }, []);
  const zoneResult = (() => {
    try {
      const date = localTimeInZone(dateValue, fromZone);
      const source = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long', timeZone: fromZone }).format(date);
      const target = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long', timeZone: toZone }).format(date);
      return { source, target, error: '' };
    } catch (cause) { return { source: '', target: '', error: cause instanceof Error ? cause.message : 'Invalid date or timezone.' }; }
  })();
  const numeric = Number(amount);
  const unitResult = Number.isFinite(numeric) ? kind === 'temperature'
    ? convertTemperature(numeric, fromUnit, toUnit)
    : numeric * UNIT_TABLE[kind][fromUnit] / UNIT_TABLE[kind][toUnit]
    : NaN;

  const changeKind = (next: UnitKind) => { setKind(next); const units = Object.keys(UNIT_TABLE[next]); setFromUnit(units[0]); setToUnit(units[1] ?? units[0]); };
  const unitText = Number.isFinite(unitResult) ? Number(unitResult.toPrecision(12)).toString() : '';
  const outputText = mode === 'timezone'
    ? (zoneResult.error ? '' : `${fromZone}: ${zoneResult.source}\n${toZone}: ${zoneResult.target}`)
    : (unitText ? `${amount} ${fromUnit} = ${unitText} ${toUnit}` : '');
  return (
    <ToolFrame
      toolbar={<div className="segmented" role="group" aria-label="Mode">
        <button type="button" aria-pressed={mode === 'timezone'} onClick={() => setMode('timezone')}>Timezones</button>
        <button type="button" aria-pressed={mode === 'units'} onClick={() => setMode('units')}>Units</button>
      </div>}
      notice={mode === 'timezone' ? 'Enter a valid IANA timezone name. The entered wall-clock time is interpreted in the “From timezone”.' : undefined}
    >
      <PanelLayout
        inputBody="content"
        outputBody="content"
        inputPanel={mode === 'timezone' ? <div className="space-y-4">
          <label className="block"><span className="field-label">Date and time</span><input type="datetime-local" className="input-field" value={dateValue} onChange={(event) => setDateValue(event.target.value)} /></label>
          {[[fromZone, setFromZone, 'From timezone'], [toZone, setToZone, 'To timezone']].map(([zone, setter, label]) => <label key={String(label)} className="block"><span className="field-label">{String(label)}</span><input className="input-field" list="timezone-options" value={String(zone)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} placeholder="IANA zone, e.g. Asia/Phnom_Penh" /></label>)}
          <datalist id="timezone-options">{ZONES.map((zone) => <option key={zone} value={zone} />)}</datalist>
        </div> : <div className="space-y-4">
          <label className="block"><span className="field-label">Category</span><select className="select-input w-full" value={kind} onChange={(event) => changeKind(event.target.value as UnitKind)}><option value="length">Length</option><option value="weight">Weight</option><option value="temperature">Temperature</option><option value="data">Digital storage</option></select></label>
          <label className="block"><span className="field-label">Value</span><input className="input-field font-mono" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">{[[fromUnit, setFromUnit, 'From unit'], [toUnit, setToUnit, 'To unit']].map(([unit, setter, label]) => <label key={String(label)} className="block"><span className="field-label">{String(label)}</span><select className="select-input w-full" value={String(unit)} onChange={(event) => (setter as (value: string) => void)(event.target.value)}>{Object.keys(UNIT_TABLE[kind]).map((option) => <option key={option}>{option}</option>)}</select></label>)}</div>
        </div>}
        outputPanel={mode === 'timezone'
          ? (zoneResult.error ? <p className="notice notice-error" role="alert">{zoneResult.error}</p> : <DetailList mono={false} rows={[[fromZone, zoneResult.source], [toZone, zoneResult.target]]} />)
          : (unitText ? <div className="rounded-xl border border-border bg-background-secondary/60 p-5"><p className="text-xs text-muted-foreground">{amount} {fromUnit} =</p><p className="mt-1 break-all font-mono text-2xl font-semibold text-foreground">{unitText}</p><p className="mt-1 text-sm text-muted-foreground">{toUnit}</p></div> : <p className="notice notice-error" role="alert">Enter a valid number</p>)}
        outputText={outputText}
        outputStatus={outputText ? 'success' : 'error'}
        downloadName="conversion.txt"
        onSample={() => { if (mode === 'timezone') { setFromZone('Asia/Phnom_Penh'); setToZone('America/New_York'); } else { changeKind('length'); setAmount('1'); } }}
      />
    </ToolFrame>
  );
}
