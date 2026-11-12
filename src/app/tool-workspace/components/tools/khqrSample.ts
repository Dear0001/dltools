import crc16 from './crc16';

export function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

export function withCrc(parts: string[]): string {
  const payload = `${parts.join('')}6304`;
  return `${payload}${crc16(payload)}`;
}

/** A valid example KHQR payload (individual account, 12.50 USD) used by the KHQR tools' Sample buttons. */
export const KHQR_SAMPLE = withCrc([
  tlv('00', '01'),
  tlv('01', '12'),
  tlv('29', tlv('00', 'devtoolkit@aclb') + tlv('01', '000123456789') + tlv('02', 'ACLEDA Bank')),
  tlv('52', '5999'),
  tlv('53', '840'),
  tlv('54', '12.50'),
  tlv('58', 'KH'),
  tlv('59', 'DevToolkit Store'),
  tlv('60', 'Phnom Penh'),
  tlv('99', tlv('00', '1767225600000') + tlv('01', '4102444800000')),
]);
