'use client';

import { useMemo, useState } from 'react';
import type { Tool } from '@/data/tools';
import { BadgeCheck } from 'lucide-react';
import ToolFrame, { DetailList, OutputPlaceholder } from '../ToolFrame';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { inspectPem } from './certificate';

export default function CertificateInspectorPanel({ tool: _tool }: { tool: Tool }) {
  const [pem, setPem] = useState('');
  const result = useMemo(() => { if (!pem.trim()) return { rows: [], error: '' }; try { return { rows: inspectPem(pem), error: '' }; } catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : 'Could not inspect certificate.' }; } }, [pem]);
  const outputText = result.rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  return (
    <ToolFrame notice="Local inspection only. This tool does not verify the certificate chain, hostname, revocation status, or trust.">
      <PanelLayout
        inputLabel="PEM certificate"
        outputLabel="Certificate details"
        outputBody="content"
        inputPanel={<CodeEditor value={pem} onChange={setPem} minHeight="100%" placeholder="-----BEGIN CERTIFICATE-----" />}
        outputPanel={result.error
          ? <p className="notice notice-error" role="alert">{result.error}</p>
          : result.rows.length ? <DetailList rows={result.rows} /> : <OutputPlaceholder icon={<BadgeCheck size={26} />} title="Paste a PEM certificate to inspect it." />}
        outputText={outputText}
        outputStatus={result.error ? 'error' : result.rows.length ? 'success' : 'idle'}
        downloadName="certificate.txt"
        onClear={() => setPem('')}
      />
    </ToolFrame>
  );
}
