import { describe, expect, it } from 'vitest';
import { analyzeKhqr, formatTimestamp } from './emvQr';

const PAYLOAD =
  '00020101021230780016ftcckhppxxx@ftcc0120MCTMAIN16645073887650230Foreign Trade Bank of Cambodia52046050530311654031105802KH5916FTB Merchant POS6007Private62520113951806659200703121111222233330715Coffee Smile 069934001317921206749700113179213867496963045B40';

describe('KHQR timestamps', () => {
  it('formats 13-digit epoch milliseconds as readable text', () => {
    const text = formatTimestamp('1792120674970');
    expect(text).toBeTruthy();
    expect(text).not.toMatch(/1792120674970/);
    expect(text).toMatch(/2026/);
  });

  it('formats 10-digit epoch seconds and rejects non-timestamps', () => {
    expect(formatTimestamp('1792120674')).toBeTruthy();
    expect(formatTimestamp('abc')).toBeNull();
    expect(formatTimestamp(null)).toBeNull();
  });

  it('parses created and expiry timestamps from tag 99 of the sample payload', () => {
    const { fields } = analyzeKhqr(PAYLOAD);
    expect(fields.createdAt?.getTime()).toBe(1792120674970);
    expect(fields.expiresAt?.getTime()).toBe(1792138674969);
  });
});
