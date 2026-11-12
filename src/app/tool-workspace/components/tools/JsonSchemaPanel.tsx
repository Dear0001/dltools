'use client';

import { useCallback, useEffect, useState } from 'react';
import Ajv from 'ajv';
import type { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { useDebouncedValue } from '../useDebouncedValue';

const SAMPLE_DATA = `{"user":{"name":"Dara","age":29},"active":true}`;
const SAMPLE_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["user", "active"],
  "properties": {
    "user": { "type": "object", "required": ["name"], "properties": { "name": { "type": "string" }, "age": { "type": "integer", "minimum": 0 } } },
    "active": { "type": "boolean" }
  }
}`;

export default function JsonSchemaPanel({ tool: _tool }: { tool: Tool }) {
  const [data, setData] = useState(SAMPLE_DATA);
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const debouncedData = useDebouncedValue(data);
  const debouncedSchema = useDebouncedValue(schema);

  const validate = useCallback((dataSource = data, schemaSource = schema) => {
    if (!dataSource.trim() || !schemaSource.trim()) {
      setResult('');
      setError('Enter both JSON data and a JSON Schema.');
      return;
    }
    try {
      const parsedSchema = JSON.parse(schemaSource);
      const parsedData = JSON.parse(dataSource);
      const ajv = new Ajv({ allErrors: true, jsonPointers: true, schemaId: 'auto' });
      const valid = ajv.validate(parsedSchema, parsedData);
      if (valid) {
        setResult('Valid: JSON data matches the schema.');
        setError('');
      } else {
        const errors = ajv.errors ?? [];
        setResult(errors.map((issue) => `${issue.dataPath || '/'} ${issue.message ?? 'is invalid'}`).join('\n'));
        setError('Schema validation failed.');
      }
    } catch (cause) {
      setResult('');
      setError(cause instanceof Error ? cause.message : 'Could not validate this schema.');
    }
  }, [data, schema]);

  useEffect(() => {
    if (data !== debouncedData || schema !== debouncedSchema) {
      setResult('');
      setError('');
      return;
    }
    if (!debouncedData.trim() && !debouncedSchema.trim()) {
      setResult('');
      setError('');
      return;
    }
    validate(debouncedData, debouncedSchema);
  }, [data, schema, debouncedData, debouncedSchema, validate]);

  const status = error ? 'error' : result ? 'success' : 'idle';
  return (
    <ToolFrame toolbar={<><span className="text-xs text-muted-foreground">JSON Schema draft-07</span><div className="ml-auto"><button type="button" className="btn-primary" onClick={() => validate()}>Validate JSON</button></div></>}>
      <PanelLayout
        inputLabel="JSON data & schema"
        outputLabel="Validation result"
        inputPanel={<div className="flex min-h-[24rem] flex-1 flex-col lg:min-h-0">
          <div className="flex min-h-0 flex-1 flex-col"><span className="border-b border-border bg-background-secondary/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">JSON data</span><CodeEditor value={data} onChange={setData} minHeight="100%" placeholder="JSON data…" /></div>
          <div className="flex min-h-0 flex-1 flex-col border-t border-border"><span className="border-b border-border bg-background-secondary/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">JSON Schema</span><CodeEditor value={schema} onChange={setSchema} minHeight="100%" placeholder="JSON Schema…" /></div>
        </div>}
        outputBody="content"
        outputPanel={<div aria-live="polite" className={`notice whitespace-pre-wrap ${error ? 'notice-error' : result ? 'notice-success' : ''}`}>{result || error || 'Validation results will appear here.'}{result && error && <div className="mt-1 font-medium">{error}</div>}</div>}
        outputText={result}
        outputStatus={status}
        downloadName="validation.txt"
        onSample={() => { setData(SAMPLE_DATA); setSchema(SAMPLE_SCHEMA); }}
        onClear={() => { setData(''); setSchema(''); }}
      />
    </ToolFrame>
  );
}
