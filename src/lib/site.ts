export const SITE_NAME = 'DLTools';

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

const PRODUCTION_URL = 'https://dltools.vercel.app';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  vercelUrl ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:4028')
).replace(/\/+$/, '');

export const SITE_TITLE = 'DLTools — Free Online Developer Tools & Converters';

export const SITE_DESCRIPTION =
  'DLTools offers free online developer tools: JSON, SQL and YAML formatters, JWT decoder, KHQR and QR generator, diff checker, Base64 and PDF to Word converters.';
