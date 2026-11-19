/** Server-only credential helpers (Node `crypto`). */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** 31 symbols with I, L, O, 0 and 1 removed so a code read aloud or off a screen is unambiguous. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

/** 8 symbols × log2(31) ≈ 39.6 bits, drawn with an unbiased CSPRNG (`randomInt`). */
export function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** 128-bit random identifier, unguessable and URL-safe. */
export function generateId(): string {
  return randomBytes(16).toString('base64url');
}

/** 256-bit bearer secret for reconnecting a host or viewer. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored only as hashes so a memory dump or log line cannot replay them. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, expectedHash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
