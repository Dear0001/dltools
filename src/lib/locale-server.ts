import { cookies, headers } from 'next/headers';
import type { Locale } from '@/i18n/LocaleProvider';

export const LOCALE_COOKIE = 'devtoolkit-locale';

/**
 * The language the server renders in: the visitor's saved choice, then a Khmer Accept-Language
 * header, otherwise English. Crawlers send neither, so they get English that matches the
 * English titles, descriptions and structured data instead of a Khmer body under English metadata.
 */
export async function getRequestLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (saved === 'en' || saved === 'kh') return saved;
  const accept = (await headers()).get('accept-language') ?? '';
  const first = accept.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('km') ? 'kh' : 'en';
}
