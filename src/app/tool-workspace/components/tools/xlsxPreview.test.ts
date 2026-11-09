import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { detectDocumentKind } from './base64Document';
import {
  columnIndex,
  columnLetters,
  decodeXmlEntities,
  parseSharedStrings,
  parseSheetXml,
  readXlsxPreview,
} from './xlsxPreview';

const sheetXml = (rows: string) =>
  `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;

async function buildWorkbook(options: {
  sheets: Array<{ name: string; xml: string }>;
  shared?: string;
}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file(
    'xl/workbook.xml',
    `<workbook><sheets>${options.sheets
      .map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<Relationships>${options.sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('')}</Relationships>`,
  );
  if (options.shared) zip.file('xl/sharedStrings.xml', options.shared);
  options.sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
  return zip.generateAsync({ type: 'uint8array' });
}

describe('column helpers', () => {
  it('converts letters to indexes and back', () => {
    expect(columnIndex('A')).toBe(0);
    expect(columnIndex('Z')).toBe(25);
    expect(columnIndex('AA')).toBe(26);
    expect(columnIndex('ab')).toBe(27);
    expect(columnLetters(0)).toBe('A');
    expect(columnLetters(25)).toBe('Z');
    expect(columnLetters(26)).toBe('AA');
    expect(columnLetters(701)).toBe('ZZ');
    expect(columnLetters(702)).toBe('AAA');
  });
});

describe('decodeXmlEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeXmlEntities('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos; &#65;&#x42;')).toBe(`a & b <c> "d" 'e' AB`);
  });

  it('leaves invalid code points alone', () => {
    expect(decodeXmlEntities('&#99999999;')).toBe('&#99999999;');
  });
});

describe('parseSharedStrings', () => {
  it('reads plain, rich-text and empty entries, skipping phonetic runs', () => {
    const xml =
      '<sst><si><t>Name</t></si><si><r><t>Hello </t></r><r><t xml:space="preserve">World</t></r></si>' +
      '<si><t/></si><si><t>Tom &amp; Jerry</t><rPh><t>ignored</t></rPh></si></sst>';
    expect(parseSharedStrings(xml)).toEqual(['Name', 'Hello World', '', 'Tom & Jerry']);
  });
});

describe('parseSheetXml', () => {
  const shared = ['Name', 'Qty'];

  it('reads shared strings, numbers, inline strings, booleans and formulas results', () => {
    const xml = sheetXml(
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="inlineStr"><is><t>Apple &amp; Co</t></is></c><c r="B2"><v>12.5</v></c><c r="C2" t="b"><v>1</v></c><c r="D2" t="str"><f>A2</f><v>calc</v></c></row>',
    );
    expect(parseSheetXml(xml, shared)).toEqual({
      rows: [
        ['Name', 'Qty', '', ''],
        ['Apple & Co', '12.5', 'TRUE', 'calc'],
      ],
      totalRows: 2,
      totalCols: 4,
    });
  });

  it('keeps sparse cells in their real positions', () => {
    const xml = sheetXml('<row r="3"><c r="C3"><v>9</v></c></row>');
    const result = parseSheetXml(xml, []);
    expect(result.rows).toEqual([['', '', ''], ['', '', ''], ['', '', '9']]);
  });

  it('ignores empty and self-closing cells', () => {
    const xml = sheetXml('<row r="1"><c r="A1" s="1"/><c r="B1"><v>1</v></c></row>');
    expect(parseSheetXml(xml, []).rows).toEqual([['', '1']]);
  });

  it('does not confuse <cols>/<col> with cells', () => {
    const xml = `<worksheet><cols><col min="1" max="1" width="10"/></cols><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData></worksheet>`;
    expect(parseSheetXml(xml, []).rows).toEqual([['1']]);
  });

  it('truncates to the limits but reports the real size', () => {
    const rows = Array.from(
      { length: 5 },
      (_, r) =>
        `<row r="${r + 1}">${['A', 'B', 'C', 'D'].map((c) => `<c r="${c}${r + 1}"><v>${r}</v></c>`).join('')}</row>`,
    ).join('');
    const result = parseSheetXml(sheetXml(rows), [], { maxRows: 2, maxCols: 3 });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toHaveLength(3);
    expect(result.totalRows).toBe(5);
    expect(result.totalCols).toBe(4);
  });

  it('falls back to document order when cells have no references', () => {
    const xml = sheetXml('<row><c><v>1</v></c><c><v>2</v></c></row><row><c><v>3</v></c></row>');
    expect(parseSheetXml(xml, []).rows).toEqual([['1', '2'], ['3', '']]);
  });
});

describe('readXlsxPreview', () => {
  it('reads multiple sheets from a real zipped workbook', async () => {
    const bytes = await buildWorkbook({
      shared: '<sst><si><t>Item</t></si><si><t>Price</t></si></sst>',
      sheets: [
        {
          name: 'Products',
          xml: sheetXml('<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Pen</t></is></c><c r="B2"><v>3</v></c></row>'),
        },
        { name: 'Notes', xml: sheetXml('<row r="1"><c r="A1" t="inlineStr"><is><t>Hello</t></is></c></row>') },
      ],
    });

    expect(detectDocumentKind(bytes)).toBe('xlsx');

    const sheets = await readXlsxPreview(bytes);
    expect(sheets.map((s) => s.name)).toEqual(['Products', 'Notes']);
    expect(sheets[0].rows).toEqual([['Item', 'Price'], ['Pen', '3']]);
    expect(sheets[1].rows).toEqual([['Hello']]);
  });

  it('works without a shared strings part', async () => {
    const bytes = await buildWorkbook({
      sheets: [{ name: 'S', xml: sheetXml('<row r="1"><c r="A1"><v>7</v></c></row>') }],
    });
    expect((await readXlsxPreview(bytes))[0].rows).toEqual([['7']]);
  });

  it('respects the sheet limit', async () => {
    const bytes = await buildWorkbook({
      sheets: [1, 2, 3].map((n) => ({ name: `S${n}`, xml: sheetXml(`<row r="1"><c r="A1"><v>${n}</v></c></row>`) })),
    });
    const sheets = await readXlsxPreview(bytes, { maxRows: 10, maxCols: 10, maxSheets: 2 });
    expect(sheets.map((s) => s.name)).toEqual(['S1', 'S2']);
  });

  it('rejects zips that are not workbooks', async () => {
    const zip = new JSZip();
    zip.file('hello.txt', 'hi');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(readXlsxPreview(bytes)).rejects.toThrow(/not a valid Excel workbook/);
  });

  it('rejects data that is not a zip at all', async () => {
    await expect(readXlsxPreview(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow();
  });
});
