'use client';

import { useMemo, useState } from 'react';
import { format as formatSql } from 'sql-formatter';
import type { Tool } from '@/data/tools';
import ToolFrame from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeOutput from '../CodeOutput';

type Operation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export default function SqlQueryBuilderPanel({ tool: _tool }: { tool: Tool }) {
  const [operation, setOperation] = useState<Operation>('SELECT');
  const [table, setTable] = useState('users');
  const [columns, setColumns] = useState('*');
  const [values, setValues] = useState("'Ada Lovelace', 'ada@example.com'");
  const [assignments, setAssignments] = useState("name = 'Ada Lovelace'");
  const [condition, setCondition] = useState('id = 1');
  const [limit, setLimit] = useState('100');

  const query = useMemo(() => {
    const target = table.trim() || 'table_name';
    const selected = columns.trim() || '*';
    let sql = '';
    if (operation === 'SELECT') sql = `SELECT ${selected}\nFROM ${target}${condition.trim() ? `\nWHERE ${condition.trim()}` : ''}${limit.trim() ? `\nLIMIT ${limit.trim()}` : ''};`;
    if (operation === 'INSERT') sql = `INSERT INTO ${target} (${selected === '*' ? 'column_1, column_2' : selected})\nVALUES (${values.trim() || 'value_1, value_2'});`;
    if (operation === 'UPDATE') sql = `UPDATE ${target}\nSET ${assignments.trim() || 'column_name = value'}${condition.trim() ? `\nWHERE ${condition.trim()}` : ''};`;
    if (operation === 'DELETE') sql = `DELETE FROM ${target}${condition.trim() ? `\nWHERE ${condition.trim()}` : ''};`;
    try { return formatSql(sql, { language: 'sql' }); } catch { return sql; }
  }, [operation, table, columns, values, assignments, condition, limit]);

  const field = 'block space-y-1.5';
  const fieldLabel = 'text-sm font-medium text-foreground';
  return (
    <ToolFrame notice="This builder creates SQL text only. Review identifiers, values, and conditions before running it in your database.">
      <PanelLayout
        inputLabel="Query options"
        outputLabel="Generated SQL"
        inputBody="content"
        inputPanel={<div className="space-y-4">
          <label className={field}><span className={fieldLabel}>Operation</span><select className="select-input w-full" value={operation} onChange={(event) => setOperation(event.target.value as Operation)}><option>SELECT</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option></select></label>
          <label className={field}><span className={fieldLabel}>Table</span><input className="input-field" value={table} onChange={(event) => setTable(event.target.value)} placeholder="table_name" /></label>
          {!['DELETE', 'UPDATE'].includes(operation) && <label className={field}><span className={fieldLabel}>Columns</span><input className="input-field" value={columns} onChange={(event) => setColumns(event.target.value)} placeholder="id, name, email" /><span className="text-xs text-muted-foreground">Separate multiple column names with commas.</span></label>}
          {operation === 'INSERT' && <label className={field}><span className={fieldLabel}>Values</span><input className="input-field" value={values} onChange={(event) => setValues(event.target.value)} placeholder="value_1, value_2" /></label>}
          {operation === 'UPDATE' && <label className={field}><span className={fieldLabel}>Assignments</span><textarea className="input-code min-h-20" value={assignments} onChange={(event) => setAssignments(event.target.value)} placeholder="status = 'active'" /></label>}
          {operation !== 'INSERT' && <label className={field}><span className={fieldLabel}>WHERE condition <span className="font-normal text-muted-foreground">(optional)</span></span><input className="input-field" value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="id = 1" /></label>}
          {operation === 'SELECT' && <label className={field}><span className={fieldLabel}>LIMIT <span className="font-normal text-muted-foreground">(optional)</span></span><input type="number" min="1" className="input-field" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="100" /></label>}
        </div>}
        outputPanel={<CodeOutput value={query} language="sql" placeholder="Generated SQL appears here…" />}
        outputText={query}
        outputStatus="success"
        downloadName="query.sql"
        onSample={() => { setOperation('SELECT'); setTable('users'); setColumns('*'); setValues("'Ada Lovelace', 'ada@example.com'"); setAssignments("name = 'Ada Lovelace'"); setCondition('id = 1'); setLimit('100'); }}
        onClear={() => { setTable(''); setColumns('*'); setCondition(''); setValues(''); setAssignments(''); setLimit(''); }}
      />
    </ToolFrame>
  );
}
