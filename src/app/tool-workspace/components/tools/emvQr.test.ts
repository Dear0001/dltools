import { describe, expect, it } from 'vitest';
import crc16 from './crc16';
import { analyzeKhqr, withCorrectCrc } from './emvQr';

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`;
const sign = (parts: string[]) => {
  const payload = `${parts.join('')}6304`;
  return `${payload}${crc16(payload)}`;
};

const dynamic = sign([
  tlv('00', '01'),
  tlv('01', '12'),
  tlv('30', tlv('00', 'coffee@aclb') + tlv('01', '1234567') + tlv('02', 'ACLEDA Bank')),
  tlv('52', '5814'),
  tlv('53', '116'),
  tlv('54', '15000'),
  tlv('58', 'KH'),
  tlv('59', 'Coffee Corner'),
  tlv('60', 'Phnom Penh'),
  tlv('62', tlv('01', 'INV-1024')),
  tlv('99', tlv('00', '1767225600000') + tlv('01', '4102444800000')),
]);

describe('analyzeKhqr', () => {
  it('accepts a well-formed dynamic merchant KHQR and extracts fields', () => {
    const a = analyzeKhqr(dynamic, new Date('2026-01-01'));
    expect(a.verdict).toBe('khqr');
    expect(a.counts.fail).toBe(0);
    expect(a.fields).toMatchObject({
      accountType: 'Merchant',
      accountId: 'coffee@aclb',
      merchantId: '1234567',
      acquiringBank: 'ACLEDA Bank',
      amount: '15000',
      currency: 'KHR',
      billNumber: 'INV-1024',
    });
    expect(a.fields.expiresAt?.getUTCFullYear()).toBe(2100);
    expect(a.tags.find((t) => t.tag === '30')?.children?.[0].label).toBe('Bakong Account ID');
  });

  it('flags a CRC mismatch and withCorrectCrc repairs it', () => {
    const broken = `${dynamic.slice(0, -4)}0000`;
    const a = analyzeKhqr(broken);
    expect(a.verdict).toBe('invalid');
    expect(a.checks.find((c) => c.id === 'crc')?.level).toBe('fail');
    expect(analyzeKhqr(withCorrectCrc(broken)).verdict).toBe('khqr');
  });

  it('appends a CRC when tag 63 is missing', () => {
    const noCrc = dynamic.slice(0, -8);
    expect(analyzeKhqr(noCrc).checks.find((c) => c.id === 'crc')?.level).toBe('fail');
    expect(withCorrectCrc(noCrc)).toBe(dynamic);
  });

  it('reports trailing unparsable data and expiry', () => {
    const a = analyzeKhqr(`${dynamic}XYZ`, new Date('2200-01-01'));
    expect(a.trailing).toBe('XYZ');
    expect(a.checks.find((c) => c.id === 'structure')?.level).toBe('fail');
    expect(a.checks.find((c) => c.id === 'expiry')?.level).toBe('warn');
  });

  it('treats plain text as not EMV', () => {
    expect(analyzeKhqr('https://example.com').verdict).toBe('not-emv');
  });
});
