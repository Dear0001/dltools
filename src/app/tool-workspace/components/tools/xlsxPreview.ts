import JSZip from 'jszip';

// A small, dependency-light .xlsx reader for previews: it extracts sheet names and
// the text of the first rows/columns. It does not evaluate formulas or apply number formats,
// so dates appear as their stored serial numbers.

export interface SheetPreview {
  name: string;
  rows: string[][];
  totalRows: number;
  totalCols: number;
}

export interface PreviewLimits {
  maxRows: number;
  maxCols: number;
  maxSheets: number;
}

const DEFAULT_LIMITS: PreviewLimits = { maxRows: 200, maxCols: 30, maxSheets: 10 };

export function decodeXmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'amp') return '&';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    const code = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    try {
      return String.fromCodePoint(code);
    } catch {
      return match;
    }
  });
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[match[1]] = decodeXmlEntities(match[2] ?? match[3] ?? '');
  }
  return attrs;
}

/** Concatenates every <t> text run in a fragment, skipping phonetic (<rPh>) runs. */
function collectText(fragment: string): string {
  const withoutPhonetic = fragment.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let text = '';
  for (const match of withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
    text += match[1];
  }
  return decodeXmlEntities(text);
}

export function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) {
    strings.push(match[1] ? collectText(match[1]) : '');
  }
  return strings;
}

/** "A" -> 0, "Z" -> 25, "AA" -> 26 */
export function columnIndex(letters: string): number {
  let index = 0;
  for (const char of letters.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

/** 0 -> "A", 26 -> "AA" */
export function columnLetters(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function parseSheetXml(
  xml: string,
  sharedStrings: string[],
  limits: Pick<PreviewLimits, 'maxRows' | 'maxCols'> = DEFAULT_LIMITS,
): Omit<SheetPreview, 'name'> {
  const cells = new Map<string, string>();
  let totalRows = 0;
  let totalCols = 0;
  let nextCol = 0;
  let lastRowSeen = -1;

  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowAttrs = parseAttributes(rowMatch[1]);
    const explicitRow = rowAttrs.r ? parseInt(rowAttrs.r, 10) - 1 : undefined;
    const rowIndex = explicitRow ?? (lastRowSeen + 1);
    lastRowSeen = rowIndex;
    nextCol = 0;

    const body = rowMatch[2] ?? '';
    for (const cellMatch of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = parseAttributes(cellMatch[1]);
      let col = nextCol;
      if (attrs.r) {
        const ref = /^([A-Za-z]+)(\d+)$/.exec(attrs.r);
        if (ref) col = columnIndex(ref[1]);
      }
      nextCol = col + 1;

      const inner = cellMatch[2] ?? '';
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value = '';
      switch (attrs.t) {
        case 's':
          value = raw !== undefined ? (sharedStrings[Number(raw)] ?? '') : '';
          break;
        case 'inlineStr':
          value = collectText(/<is\b[^>]*>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? '');
          break;
        case 'b':
          value = raw === '1' ? 'TRUE' : raw === '0' ? 'FALSE' : '';
          break;
        default:
          value = raw !== undefined ? decodeXmlEntities(raw) : '';
      }

      if (value === '') continue;
      totalRows = Math.max(totalRows, rowIndex + 1);
      totalCols = Math.max(totalCols, col + 1);
      if (rowIndex < limits.maxRows && col < limits.maxCols) cells.set(`${rowIndex}:${col}`, value);
    }
  }

  const rowCount = Math.min(totalRows, limits.maxRows);
  const colCount = Math.min(totalCols, limits.maxCols);
  const rows: string[][] = [];
  for (let r = 0; r < rowCount; r += 1) {
    const row: string[] = [];
    for (let c = 0; c < colCount; c += 1) row.push(cells.get(`${r}:${c}`) ?? '');
    rows.push(row);
  }
  return { rows, totalRows, totalCols };
}

function resolveSheetPath(target: string): string {
  const clean = target.replace(/^\/+/, '');
  return clean.startsWith('xl/') ? clean : `xl/${clean}`;
}

export async function readXlsxPreview(
  bytes: Uint8Array,
  limits: PreviewLimits = DEFAULT_LIMITS,
): Promise<SheetPreview[]> {
  const zip = await JSZip.loadAsync(bytes);

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  if (!workbookXml) throw new Error('This file is not a valid Excel workbook (xl/workbook.xml is missing).');

  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedXml ? parseSharedStrings(sharedXml) : [];

  const relsXml = (await zip.file('xl/_rels/workbook.xml.rels')?.async('string')) ?? '';
  const targets = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const attrs = parseAttributes(match[1]);
    if (attrs.Id && attrs.Target) targets.set(attrs.Id, attrs.Target);
  }

  const sheets: SheetPreview[] = [];
  let index = 0;
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    index += 1;
    if (sheets.length >= limits.maxSheets) break;
    const attrs = parseAttributes(match[1]);
    const target = targets.get(attrs['r:id'] ?? '') ?? `worksheets/sheet${index}.xml`;
    const sheetXml = await zip.file(resolveSheetPath(target))?.async('string');
    if (!sheetXml) continue; // chartsheets and other non-worksheet entries have no cell data
    sheets.push({ name: attrs.name || `Sheet${index}`, ...parseSheetXml(sheetXml, sharedStrings, limits) });
  }

  if (sheets.length === 0) throw new Error('No worksheets were found in this workbook.');
  return sheets;
}
