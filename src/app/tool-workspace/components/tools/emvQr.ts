import crc16 from './crc16';

export interface EmvTlvTag {
  tag: string;
  length: number;
  value: string;
  label: string;
  /** Character offset of the tag id inside the parsed string. */
  offset?: number;
  children?: EmvTlvTag[];
}

const TAG_LABELS: Record<string, string> = {
  '00': 'Payload Format Indicator',
  '01': 'Point of Initiation Method',
  '15': 'UnionPay Merchant Account',
  '26': 'Merchant Account Information',
  '27': 'Merchant Account Information',
  '28': 'Merchant Account Information',
  '29': 'Individual Account (KHQR)',
  '30': 'Merchant Account (KHQR)',
  '40': 'Merchant Account (Dual Currency)',
  '52': 'Merchant Category Code',
  '53': 'Transaction Currency',
  '54': 'Transaction Amount',
  '55': 'Tip or Convenience Indicator',
  '56': 'Convenience Fee (Fixed)',
  '57': 'Convenience Fee (Percentage)',
  '58': 'Country Code',
  '59': 'Merchant Name',
  '60': 'Merchant City',
  '61': 'Postal Code',
  '62': 'Additional Data Field Template',
  '63': 'CRC',
  '64': 'Merchant Language Template',
  '99': 'KHQR Timestamp',
};

const CHILD_LABELS: Record<string, Record<string, string>> = {
  '29': { '00': 'Bakong Account ID', '01': 'Account Information', '02': 'Acquiring Bank' },
  '30': { '00': 'Bakong Account ID', '01': 'Merchant ID', '02': 'Acquiring Bank' },
  '40': { '00': 'Bakong Account ID', '01': 'Merchant ID', '02': 'Acquiring Bank' },
  '62': {
    '01': 'Bill Number',
    '02': 'Mobile Number',
    '03': 'Store Label',
    '04': 'Loyalty Number',
    '05': 'Reference Label',
    '06': 'Customer Label',
    '07': 'Terminal Label',
    '08': 'Purpose of Transaction',
    '09': 'Additional Consumer Data Request',
  },
  '64': { '00': 'Language Preference', '01': 'Merchant Name (Alt. Language)', '02': 'Merchant City (Alt. Language)' },
  '99': { '00': 'Created At', '01': 'Expires At' },
};

const NESTED_TLV_TAGS = new Set(['26', '27', '28', '29', '30', '40', '62', '64', '99']);

export interface EmvQrDetails {
  tags: EmvTlvTag[];
  isEmvQr: boolean;
  currencyCode: string | null;
  currencyName: string | null;
  hasDualCurrency: boolean | null;
  merchantAccountCount: number;
  crcValid: boolean | null;
}

function isMerchantAccountTemplate(tag: string): boolean {
  const tagNumber = Number(tag);
  return tagNumber >= 2 && tagNumber <= 51;
}

interface ParseResult {
  tags: EmvTlvTag[];
  /** Index where parsing stopped; equals data.length when everything was consumed. */
  consumed: number;
}

function parseLevel(data: string, parent: string | null, baseOffset: number): ParseResult {
  const tags: EmvTlvTag[] = [];
  let index = 0;

  while (index + 4 <= data.length) {
    const tag = data.slice(index, index + 2);
    const lengthText = data.slice(index + 2, index + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) break;
    const length = Number.parseInt(lengthText, 10);
    if (index + 4 + length > data.length) break;

    const value = data.slice(index + 4, index + 4 + length);
    const label = parent ? CHILD_LABELS[parent]?.[tag] ?? `Sub-tag ${tag}` : TAG_LABELS[tag] ?? `Tag ${tag}`;
    const nested = !parent && NESTED_TLV_TAGS.has(tag);
    tags.push({
      tag,
      length,
      value,
      label,
      offset: baseOffset + index,
      children: nested ? parseLevel(value, tag, baseOffset + index + 4).tags : undefined,
    });
    index += 4 + length;
  }

  return { tags, consumed: index };
}

export function parseEmvTlv(data: string): EmvTlvTag[] {
  return parseLevel(data, null, 0).tags;
}

export function currencyLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === '116') return 'KHR';
  if (code === '840') return 'USD';
  return `ISO 4217 ${code}`;
}

export function getEmvQrDetails(data: string): EmvQrDetails {
  const tags = parseEmvTlv(data);
  const isEmvQr = tags.some((tag) => tag.tag === '00' && tag.value === '01');
  const currencyCode = tags.find((tag) => tag.tag === '53')?.value ?? null;
  const merchantAccountCount = tags.filter((tag) => isMerchantAccountTemplate(tag.tag)).length;
  const hasDualCurrency = isEmvQr ? tags.some((tag) => tag.tag === '40') : null;
  const currencyName = currencyLabel(currencyCode);
  let crcValid: boolean | null = null;
  const lastTag = tags[tags.length - 1];
  if (lastTag?.tag === '63' && lastTag.length === 4) {
    const crcIndex = data.length - 8;
    crcValid = lastTag.value.toUpperCase() === crc16(data.slice(0, crcIndex + 4));
  }

  return { tags, isEmvQr, currencyCode, currencyName, hasDualCurrency, merchantAccountCount, crcValid };
}

/* ------------------------------------------------------------------ */
/* KHQR analysis: extracted fields + validation checks                 */
/* ------------------------------------------------------------------ */

export type CheckLevel = 'pass' | 'warn' | 'fail';

export interface KhqrCheck {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
}

export interface KhqrFields {
  accountType: 'Individual' | 'Merchant' | 'Other' | null;
  accountId: string | null;
  merchantId: string | null;
  accountInformation: string | null;
  acquiringBank: string | null;
  merchantName: string | null;
  merchantCity: string | null;
  merchantNameAlt: string | null;
  merchantCityAlt: string | null;
  mcc: string | null;
  countryCode: string | null;
  currencyCode: string | null;
  currency: string | null;
  amount: string | null;
  billNumber: string | null;
  mobileNumber: string | null;
  storeLabel: string | null;
  terminalLabel: string | null;
  purpose: string | null;
  createdAt: Date | null;
  expiresAt: Date | null;
  postalCode: string | null;
  crc: string | null;
  expectedCrc: string | null;
}

export type KhqrVerdict = 'khqr' | 'emv' | 'invalid' | 'not-emv';

export interface KhqrAnalysis {
  data: string;
  tags: EmvTlvTag[];
  fields: KhqrFields;
  checks: KhqrCheck[];
  verdict: KhqrVerdict;
  crcValid: boolean | null;
  trailing: string;
  counts: Record<CheckLevel, number>;
}

function child(tag: EmvTlvTag | undefined, sub: string): string | null {
  return tag?.children?.find((c) => c.tag === sub)?.value ?? null;
}

function parseTimestamp(value: string | null): Date | null {
  if (!value || !/^\d{10,13}$/.test(value)) return null;
  const ms = value.length === 13 ? Number(value) : Number(value) * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

const INVISIBLE = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u034f\\u061c\\u115f-\\u1160\\u17b4-\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\u3164\\ufeff\\uffa0]');

/** Returns `data` with tag 63 recalculated (appended when missing). */
export function withCorrectCrc(raw: string): string {
  const data = raw.trim();
  const { tags } = parseLevel(data, null, 0);
  const crcTag = tags.find((t) => t.tag === '63');
  const body = crcTag && crcTag.offset !== undefined ? data.slice(0, crcTag.offset) : data;
  const payload = `${body}6304`;
  return `${payload}${crc16(payload)}`;
}

export function analyzeKhqr(raw: string, now: Date = new Date()): KhqrAnalysis {
  const data = raw.trim();
  const { tags, consumed } = parseLevel(data, null, 0);
  const trailing = data.slice(consumed);
  const byTag = (id: string) => tags.find((t) => t.tag === id);
  const checks: KhqrCheck[] = [];
  const add = (id: string, level: CheckLevel, title: string, detail: string) => checks.push({ id, level, title, detail });

  const individual = byTag('29');
  const merchant = byTag('30');
  const account = individual ?? merchant;
  const otherAccount = tags.find((t) => isMerchantAccountTemplate(t.tag) && t.tag !== '29' && t.tag !== '30');
  const language = byTag('64');
  const extra = byTag('62');
  const stamp = byTag('99');
  const crcTag = byTag('63');
  const currencyCode = byTag('53')?.value ?? null;
  const initiation = byTag('01')?.value;

  let crcValid: boolean | null = null;
  let expectedCrc: string | null = null;
  if (crcTag && crcTag.offset !== undefined) {
    expectedCrc = crc16(data.slice(0, crcTag.offset + 4));
    crcValid = crcTag.length === 4 && crcTag.value.toUpperCase() === expectedCrc;
  }

  const fields: KhqrFields = {
    accountType: individual ? 'Individual' : merchant ? 'Merchant' : otherAccount ? 'Other' : null,
    accountId: child(account, '00'),
    merchantId: merchant ? child(merchant, '01') : null,
    accountInformation: individual ? child(individual, '01') : null,
    acquiringBank: child(account, '02'),
    merchantName: byTag('59')?.value ?? null,
    merchantCity: byTag('60')?.value ?? null,
    merchantNameAlt: child(language, '01'),
    merchantCityAlt: child(language, '02'),
    mcc: byTag('52')?.value ?? null,
    countryCode: byTag('58')?.value ?? null,
    currencyCode,
    currency: currencyLabel(currencyCode),
    amount: byTag('54')?.value ?? null,
    billNumber: child(extra, '01'),
    mobileNumber: child(extra, '02'),
    storeLabel: child(extra, '03'),
    terminalLabel: child(extra, '07'),
    purpose: child(extra, '08'),
    createdAt: parseTimestamp(child(stamp, '00')),
    expiresAt: parseTimestamp(child(stamp, '01')),
    postalCode: byTag('61')?.value ?? null,
    crc: crcTag?.value.toUpperCase() ?? null,
    expectedCrc,
  };

  const format = byTag('00');
  if (!tags.length) {
    add('structure', 'fail', 'TLV structure', 'No EMVCo tag-length-value structure was found.');
  } else if (trailing) {
    add('structure', 'fail', 'TLV structure', `Parsing stopped at character ${consumed + 1}; ${trailing.length} characters could not be read (bad length or truncated data).`);
  } else {
    add('structure', 'pass', 'TLV structure', `All ${data.length} characters parsed into ${tags.length} tags.`);
  }

  if (!format) add('format', 'fail', 'Payload format (00)', 'Tag 00 is missing — every EMV QR must start with 000201.');
  else if (format.value !== '01') add('format', 'fail', 'Payload format (00)', `Expected "01", found "${format.value}".`);
  else if (tags[0] !== format) add('format', 'warn', 'Payload format (00)', 'Tag 00 should be the first tag.');
  else add('format', 'pass', 'Payload format (00)', 'Starts with 000201.');

  const isEmv = Boolean(format && format.value === '01');

  if (initiation && initiation !== '11' && initiation !== '12') add('initiation', 'fail', 'Point of initiation (01)', `Expected 11 or 12, found "${initiation}".`);

  if (account) {
    const id = fields.accountId;
    if (!id) add('account', 'fail', `Bakong account (${account.tag})`, 'Sub-tag 00 (Bakong account ID) is missing.');
    else if (id.length > 32) add('account', 'fail', `Bakong account (${account.tag})`, `Account ID is ${id.length} chars; the limit is 32.`);
    else if (!id.includes('@')) add('account', 'warn', `Bakong account (${account.tag})`, `"${id}" does not look like a Bakong ID (name@bank).`);
    else add('account', 'pass', `Bakong account (${account.tag})`, `${fields.accountType} account ${id}.`);
    if (merchant && !fields.merchantId) add('merchant-id', 'warn', 'Merchant ID (30.01)', 'Merchant accounts normally include a merchant ID.');
  } else if (otherAccount) {
    add('account', 'warn', 'KHQR account (29/30)', `No Bakong account tag; found tag ${otherAccount.tag} instead. This is EMV but not KHQR.`);
  } else {
    add('account', 'fail', 'Merchant account', 'No merchant account template (tags 02–51) found.');
  }

  const mcc = fields.mcc;
  if (!mcc) add('mcc', 'fail', 'Merchant category (52)', 'Tag 52 is missing.');
  else if (!/^\d{4}$/.test(mcc)) add('mcc', 'fail', 'Merchant category (52)', `MCC must be 4 digits, found "${mcc}".`);
  else add('mcc', 'pass', 'Merchant category (52)', `MCC ${mcc}.`);

  if (!currencyCode) add('currency', 'fail', 'Currency (53)', 'Tag 53 is missing.');
  else if (currencyCode !== '116' && currencyCode !== '840') add('currency', 'warn', 'Currency (53)', `KHQR supports KHR (116) and USD (840); found ${currencyCode}.`);
  else add('currency', 'pass', 'Currency (53)', `${fields.currency} (${currencyCode}).`);

  const amount = fields.amount;
  if (amount !== null) {
    if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) add('amount', 'fail', 'Amount (54)', `"${amount}" is not a positive number.`);
    else if (currencyCode === '116' && amount.includes('.') && Number(amount.split('.')[1]) !== 0) add('amount', 'warn', 'Amount (54)', 'KHR amounts should be whole riel.');
    else if (currencyCode === '840' && (amount.split('.')[1]?.length ?? 0) > 2) add('amount', 'warn', 'Amount (54)', 'USD amounts should have at most 2 decimals.');
    else add('amount', 'pass', 'Amount (54)', `${amount} ${fields.currency ?? ''}`.trim());
  }

  const country = fields.countryCode;
  if (!country) add('country', 'fail', 'Country (58)', 'Tag 58 is missing.');
  else if (country !== 'KH') add('country', 'warn', 'Country (58)', `KHQR uses KH; found "${country}".`);
  else add('country', 'pass', 'Country (58)', 'Cambodia (KH).');

  const name = fields.merchantName;
  if (!name) add('name', 'fail', 'Merchant name (59)', 'Tag 59 is missing.');
  else if (INVISIBLE.test(name)) add('name', 'warn', 'Merchant name (59)', 'Contains invisible / control characters (highlighted below).');
  else if (name.length > 25) add('name', 'warn', 'Merchant name (59)', `${name.length} chars; the EMV limit is 25.`);
  else add('name', 'pass', 'Merchant name (59)', name);

  if (!fields.merchantCity) add('city', 'fail', 'Merchant city (60)', 'Tag 60 is missing.');
  else if (fields.merchantCity.length > 15) add('city', 'warn', 'Merchant city (60)', `${fields.merchantCity.length} chars; the EMV limit is 15.`);
  else add('city', 'pass', 'Merchant city (60)', fields.merchantCity);

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const t of tags) (seen.has(t.tag) ? duplicates : seen).add(t.tag);
  if (duplicates.size) add('duplicates', 'fail', 'Duplicate tags', `Repeated: ${[...duplicates].join(', ')}.`);

  const order = tags.filter((t) => t.tag !== '63').map((t) => Number(t.tag));
  if (order.some((n, i) => i > 0 && n < order[i - 1])) add('order', 'warn', 'Tag order', 'Tags are not in ascending order (most wallets still accept this).');

  if (fields.expiresAt) {
    if (fields.expiresAt.getTime() < now.getTime()) add('expiry', 'warn', 'Expiry (99.01)', `Expired ${fields.expiresAt.toLocaleString()}.`);
    else add('expiry', 'pass', 'Expiry (99.01)', `Valid until ${fields.expiresAt.toLocaleString()}.`);
  }

  if (!crcTag) add('crc', 'fail', 'CRC-16 (63)', 'Tag 63 is missing.');
  else if (tags[tags.length - 1] !== crcTag || trailing) add('crc', 'fail', 'CRC-16 (63)', 'Tag 63 must be the last tag.');
  else if (!crcValid) add('crc', 'fail', 'CRC-16 (63)', `Found ${fields.crc}, expected ${expectedCrc}.`);
  else add('crc', 'pass', 'CRC-16 (63)', `${fields.crc} matches.`);

  const counts: Record<CheckLevel, number> = { pass: 0, warn: 0, fail: 0 };
  for (const c of checks) counts[c.level] += 1;

  let verdict: KhqrVerdict;
  if (!isEmv) verdict = 'not-emv';
  else if (counts.fail > 0) verdict = 'invalid';
  else if (account) verdict = 'khqr';
  else verdict = 'emv';

  return { data, tags, fields, checks, verdict, crcValid, trailing, counts };
}

/** Display amount: whole riel for KHR (116), 2 decimals otherwise; `empty` when there is no amount. */
export function formatAmount({ amount, currencyCode }: Pick<KhqrFields, 'amount' | 'currencyCode'>, empty = 'Payer enters amount'): string {
  if (!amount) return empty;
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  const digits = currencyCode === '116' ? 0 : 2;
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 4) });
}

/** Plain-object export for "Copy JSON". */
export function analysisToJson(analysis: KhqrAnalysis) {
  const strip = (tags: EmvTlvTag[]): unknown[] =>
    tags.map((t) => ({ tag: t.tag, name: t.label, length: t.length, value: t.value, ...(t.children?.length ? { children: strip(t.children) } : {}) }));
  const fields = Object.fromEntries(
    Object.entries(analysis.fields)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
  return {
    verdict: analysis.verdict,
    fields,
    checks: analysis.checks.map(({ level, title, detail }) => ({ level, title, detail })),
    tags: strip(analysis.tags),
    raw: analysis.data,
  };
}
