export const SITE_NAME = 'DL DevToolkit';

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

const PRODUCTION_URL = 'https://dltools.vercel.app';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  vercelUrl ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:4028')
).replace(/\/+$/, '');

export const SITE_DESCRIPTION =
  'Free browser-based developer tools: JSON, SQL, YAML and XML formatters, diff, KHQR/QR, JWT, UUID, hash, regex, Base64, PDF & Word converters and more. No install, runs in your browser.';
