/**
 * Live Share tool registry — the single source of truth for which tools can be
 * shared and which fields of each tool are safe and meaningful to synchronize.
 *
 * A tool that is not listed here is "unsupported": the host client never sends it
 * and the server rejects it. Tools that handle credentials (password generator,
 * JWT decoder, hash, API tester, certificate inspector) and tools that process
 * files are deliberately absent. Add a tool by adding an entry — nothing else on
 * the server changes.
 */
export type LiveShareFieldKind = 'code' | 'text' | 'enum' | 'number';

export interface LiveShareFieldSpec {
  /** English label shown on the viewer. */
  label: string;
  kind: LiveShareFieldKind;
  /** Where the viewer renders the field. */
  role: 'input' | 'output' | 'option';
  maxChars: number;
  /** Allowed values when kind is `enum`. */
  values?: readonly string[];
  /**
   * `files`: the value may be file/binary content (e.g. a Base64 document). It is withheld (sent blank) unless
   * the host has explicitly enabled “share file content” for the session — enforced on the client and the server.
   */
  optIn?: 'files';
}

export interface LiveShareToolSpec {
  /** Field order is the viewer's display order. */
  fields: Readonly<Record<string, LiveShareFieldSpec>>;
  /**
   * `true`: the tool's real panel is driven by `useLiveState`, so the viewer renders the actual DLTools UI.
   * Otherwise the viewer falls back to the generic read-only field renderer.
   */
  native?: boolean;
}

import { THEMES } from '../theme';

const STATUS = ['idle', 'success', 'error'] as const;
const MAX_CODE = 200_000;
/** KHQR payloads are a few hundred characters; this leaves room for long custom strings. */
const KHQR_MAX = 4_000;
/** Largest KHQR logo/header image (as a data URL) that is synchronized; larger images are not sent. */
export const KHQR_IMAGE_MAX = 150_000;

const code = (label: string, role: 'input' | 'output', maxChars = MAX_CODE): LiveShareFieldSpec => ({ label, kind: 'code', role, maxChars });
const text = (label: string, role: 'input' | 'option', maxChars = 2_000): LiveShareFieldSpec => ({ label, kind: 'text', role, maxChars });
const choice = (label: string, values: readonly string[]): LiveShareFieldSpec => ({ label, kind: 'enum', role: 'option', maxChars: 24, values });
const status = choice('Status', STATUS);
const num = (label: string): LiveShareFieldSpec => ({ label, kind: 'number', role: 'option', maxChars: 12 });
const flag = (label: string): LiveShareFieldSpec => ({ label, kind: 'enum', role: 'option', maxChars: 5, values: ['true', 'false'] });
const message = (label: string): LiveShareFieldSpec => ({ label, kind: 'text', role: 'output', maxChars: 2_000 });
const native = (spec: LiveShareToolSpec): LiveShareToolSpec => ({ ...spec, native: true });

/** input → output text tools with a success/error status. */
const transform = (extra: Record<string, LiveShareFieldSpec> = {}): LiveShareToolSpec => ({
  fields: { input: code('Input', 'input'), output: code('Output', 'output'), ...extra, status },
});
const diff: LiveShareToolSpec = native({
  fields: { left: code('Original', 'input'), right: code('Changed', 'input'), mode: choice('View', ['split', 'unified']) },
});
const jsonToCode = (key: string, values: readonly string[]): LiveShareToolSpec => ({
  fields: { input: code('JSON', 'input'), output: code('Generated code', 'output'), [key]: choice(key === 'lang' ? 'Language' : 'Target', values), rootName: text('Root name', 'option', 64) },
});

export const LIVE_SHARE_TOOLS: Readonly<Record<string, LiveShareToolSpec>> = {
  // ---- Priority 1: formatters, validators, diff, regex ----
  'tool-json-formatter': native({
    fields: {
      input: code('Input', 'input'), output: code('Output', 'output'), status, error: message('Error'),
      indent: num('Indent'), sortKeys: flag('Sort keys'),
      inputFormat: choice('Input format', ['auto', 'string', 'json', 'mixed']),
      outputFormat: choice('Output format', ['auto', 'string', 'json']),
      detectedFormat: choice('Detected', ['empty', 'json', 'string', 'mixed', 'invalid-json']),
      outputLanguage: choice('Output language', ['json', 'text']),
    },
  }),
  'tool-sql-formatter': native({
    fields: {
      input: code('Input', 'input'), output: code('Output', 'output'), status, error: message('Error'),
      dialect: choice('Dialect', ['sql', 'mysql', 'postgresql', 'sqlite', 'bigquery', 'tsql']),
      indent: num('Indent'), uppercase: flag('Uppercase keywords'),
    },
  }),
  'tool-js-formatter': native({
    fields: {
      input: code('Input', 'input'), output: code('Output', 'output'), status, error: message('Error'),
      parser: choice('Parser', ['babel', 'typescript']), indent: num('Indent'),
    },
  }),
  'tool-html-formatter': transform(),
  'tool-css-formatter': transform({ language: choice('Language', ['css', 'scss', 'less']) }),
  'tool-xml-formatter': transform(),
  'tool-yaml-formatter': transform(),
  'tool-markdown-formatter': transform(),
  'tool-json-schema': native({ // JSON validator
    fields: { data: code('JSON data', 'input'), schema: code('JSON Schema', 'input'), result: code('Validation result', 'output'), error: message('Error') },
  }),
  'tool-json-diff': diff,
  'tool-text-diff': diff,
  'tool-xml-diff': diff,
  'tool-java-diff': diff,
  'tool-regex-tester': native({
    fields: {
      pattern: text('Regular expression', 'input'),
      flags: text('Flags', 'option', 8),
      testString: code('Test string', 'input'),
      replacement: text('Replace with', 'input'),
      mode: choice('Mode', ['match', 'replace']),
    },
  }),
  // Base64 decoder. The Base64 string IS the file content, so it is opt-in (see `optIn`).
  'tool-base64-document': native({
    fields: {
      input: { label: 'Base64 string or data URI', kind: 'code', role: 'input', maxChars: 400_000, optIn: 'files' },
      target: choice('Convert to', ['auto', 'pdf', 'word', 'excel']),
      fileName: text('File name', 'option', 120),
    },
  }),
  // ---- Priority 2: text-only utilities ----
  'tool-jsonpath': { fields: { json: code('JSON', 'input'), expression: text('JSONPath', 'input'), output: code('Result', 'output'), status } },
  'tool-url-codec': { fields: { decoded: code('Decoded', 'input'), encoded: code('Encoded', 'output') } },
  'tool-data-converter': transform({ inputFormat: choice('From', ['json', 'yaml', 'csv', 'xml']), outputFormat: choice('To', ['json', 'yaml', 'csv', 'xml']) }),
  'tool-encoding-toolkit': transform({ mode: choice('Mode', ['html', 'hex', 'gzip']), direction: choice('Direction', ['encode', 'decode']) }),
  'tool-json-to-ts': jsonToCode('target', ['typescript', 'go', 'python', 'pydantic', 'rust', 'zod', 'dart']),
  'tool-json-to-dart': jsonToCode('target', ['typescript', 'go', 'python', 'pydantic', 'rust', 'zod', 'dart']),
  'tool-json-to-java': jsonToCode('lang', ['java', 'kotlin', 'csharp']),
  // ---- KHQR: payment QR payloads are public by design (printed for customers); viewers stay read-only. ----
  'tool-khqr-validator': native({ fields: { input: code('KHQR / EMVCo string', 'input', KHQR_MAX) } }),
  'tool-khqr-builder': native({
    fields: {
      khqr: code('Raw string', 'input', KHQR_MAX),
      fgColor: text('Foreground', 'option', 16),
      bgColor: text('Background', 'option', 16),
      headerText: text('Header text', 'option', 24),
      headerColor: text('Header color', 'option', 16),
      logoSize: num('Logo size'),
      // Uploaded artwork is file content: withheld unless the host enables "share file content".
      logo: { label: 'Logo image', kind: 'code', role: 'option', maxChars: KHQR_IMAGE_MAX, optIn: 'files' },
      headerImage: { label: 'Header image', kind: 'code', role: 'option', maxChars: KHQR_IMAGE_MAX, optIn: 'files' },
    },
  }),
};

/**
 * Deliberately NOT shareable: password generator, JWT decoder, hash, API tester, cURL generator,
 * certificate inspector (credentials / secrets), and every file-based tool — Base64 image,
 * image compressor, QR reader, PDF/Word/image converters (files need an explicit extra approval step that
 * v1 does not implement). IP / CIDR calculator is excluded by product decision. `registry.test.ts` pins this list.
 */
export const LIVE_SHARE_EXCLUDED_TOOLS: readonly string[] = [
  'tool-password-generator', 'tool-jwt-decoder', 'tool-hash', 'tool-api-tester', 'tool-curl-generator', 'tool-certificate-inspector',
  'tool-base64-image', 'tool-image-compress', 'tool-qr-reader',
  'tool-pdf-word-converter', 'tool-image-to-pdf', 'tool-image-to-word',
  'tool-ip-cidr', // product decision: not part of Live Share
];

export function isLiveShareTool(toolId: string): boolean {
  return Object.prototype.hasOwnProperty.call(LIVE_SHARE_TOOLS, toolId);
}

/**
 * Workspace-level appearance shared with every tool: the host's theme and language.
 * The `ws.` prefix keeps them from colliding with a tool's own field names.
 */
export const WORKSPACE_FIELD_PREFIX = 'ws.';
const WORKSPACE_FIELDS: Readonly<Record<string, LiveShareFieldSpec>> = {
  'ws.theme': { label: 'Theme', kind: 'enum', role: 'option', maxChars: 24, values: THEMES },
  'ws.locale': { label: 'Language', kind: 'enum', role: 'option', maxChars: 4, values: ['en', 'kh'] },
  /** Whether the host has allowed file content, so a viewer can explain a blank file field. */
  'ws.filesShared': { label: 'File content shared', kind: 'enum', role: 'option', maxChars: 5, values: ['true', 'false'] },
};

const merged = new Map<string, LiveShareToolSpec>();
export function getLiveShareTool(toolId: string): LiveShareToolSpec | null {
  if (!isLiveShareTool(toolId)) return null;
  let spec = merged.get(toolId);
  if (!spec) {
    spec = { ...LIVE_SHARE_TOOLS[toolId], fields: { ...LIVE_SHARE_TOOLS[toolId].fields, ...WORKSPACE_FIELDS } };
    merged.set(toolId, spec);
  }
  return spec;
}

/** True for fields whose value is free text the credential scanner should inspect. */
export function isFreeText(kind: LiveShareFieldKind): boolean {
  return kind === 'code' || kind === 'text';
}

export type FieldCheck = { ok: true } | { ok: false; reason: 'unknown_field' | 'too_long' | 'bad_value' | 'not_string' };

const NUMBER_RE = /^-?\d{1,9}(?:\.\d{1,6})?$/;

export function checkField(toolId: string, key: string, value: unknown): FieldCheck {
  const spec = getLiveShareTool(toolId);
  if (!spec || !Object.prototype.hasOwnProperty.call(spec.fields, key)) return { ok: false, reason: 'unknown_field' };
  if (typeof value !== 'string') return { ok: false, reason: 'not_string' };
  const field = spec.fields[key];
  if (value.length > field.maxChars) return { ok: false, reason: 'too_long' };
  if (field.kind === 'enum' && !field.values?.includes(value)) return { ok: false, reason: 'bad_value' };
  if (field.kind === 'number' && !NUMBER_RE.test(value)) return { ok: false, reason: 'bad_value' };
  return { ok: true };
}
