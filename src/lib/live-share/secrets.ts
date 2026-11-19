/**
 * Best-effort credential detector. Live Share must not synchronize passwords, API
 * keys or tokens by default, so the host client withholds any field that matches
 * and the server rejects it too (defense in depth). This is a heuristic, not a
 * guarantee — the privacy notice still tells hosts to share only what they are
 * comfortable showing.
 */
const PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['openai-style-key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  // Wi-Fi QR payloads (WIFI:S:<ssid>;T:WPA;P:<password>;;) carry the network password.
  ['wifi-password', /\bWIFI:(?:(?:\\.|[^;\\])*;)*?P:(?:\\.|[^;\\])+/i],
  ['auth-header', /\bauthorization\s*[:=]\s*["']?(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/i],
  [
    'credential-assignment',
    /["']?\b(?:password|passwd|pwd|secret|client[_-]?secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|refresh[_-]?token|private[_-]?key)\b["']?\s*[:=]\s*["']?[^\s"',;}]{6,}/i,
  ],
];

/** Returns the name of the first credential pattern found, or null. */
export function detectSecret(text: string): string | null {
  if (!text) return null;
  for (const [name, pattern] of PATTERNS) if (pattern.test(text)) return name;
  return null;
}
