export const SITE_NAME = 'DL DevToolkit';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028'
).replace(/\/+$/, '');

export const SITE_DESCRIPTION =
  'Free browser-based developer tools: JSON, SQL, YAML and XML formatters, diff, KHQR/QR, JWT, UUID, hash, regex, Base64, PDF & Word converters and more. No install, runs in your browser.';
