export const THEME_STORAGE_KEY = 'devtoolkit-theme';

export const THEMES = ['alabaster-paper', 'sunrise', 'nordic-frost', 'dusk', 'midnight', 'deep-ocean'] as const;
export type ThemeId = (typeof THEMES)[number];

/** 'auto' follows the time-of-day schedule below instead of a fixed theme. */
export type ThemePreference = ThemeId | 'auto';

export const DEFAULT_THEME: ThemeId = 'alabaster-paper';

export const THEME_META: Record<ThemeId, { label: string; labelKh: string; dark: boolean; swatch: [string, string, string] }> = {
  'alabaster-paper': { label: 'Light', labelKh: 'ភ្លឺ', dark: false, swatch: ['#FDFBF7', '#FFFFFF', '#2563EB'] },
  sunrise: { label: 'Sunrise (warm light)', labelKh: 'ថ្ងៃរះ (ភ្លឺកក់ក្តៅ)', dark: false, swatch: ['#FFF6EE', '#FFFAF5', '#C2410C'] },
  'nordic-frost': { label: 'Nordic (cool light)', labelKh: 'ណរឌិក (ភ្លឺត្រជាក់)', dark: false, swatch: ['#ECEFF4', '#D8DEE9', '#4C6E9C'] },
  dusk: { label: 'Dusk (evening)', labelKh: 'ព្រលប់', dark: true, swatch: ['#1F1A2E', '#29233B', '#FB923C'] },
  midnight: { label: 'Dark', labelKh: 'ងងឹត', dark: true, swatch: ['#0F141B', '#161D27', '#60A5FA'] },
  'deep-ocean': { label: 'Deep Ocean (night)', labelKh: 'មហាសមុទ្រ (យប់)', dark: true, swatch: ['#0A1719', '#0F2124', '#2DD4BF'] },
};

export const AUTO_META = {
  label: 'Auto (time of day)',
  labelKh: 'ស្វ័យប្រវត្តិ (តាមម៉ោង)',
  hint: 'Changes through the day',
  hintKh: 'ប្តូរតាមម៉ោងក្នុងមួយថ្ងៃ',
  swatch: ['#FFF6EE', '#ECEFF4', '#1F1A2E'] as [string, string, string],
};

/** Order shown in the theme menu (after "Auto"): light themes, then dark ones. */
export const THEME_MENU_ORDER: ThemeId[] = ['alabaster-paper', 'sunrise', 'nordic-frost', 'dusk', 'midnight', 'deep-ocean'];

/**
 * Auto mode: the theme that starts at each local time. A slot lasts until the
 * next one starts; the first slot also covers the time just before midnight's end.
 * Must stay sorted by `start` (minutes since local midnight).
 */
export const AUTO_SCHEDULE: { start: number; theme: ThemeId }[] = [
  { start: 0, theme: 'deep-ocean' }, // 00:00 - 05:00
  { start: 5 * 60, theme: 'sunrise' }, // 05:00 - 08:00
  { start: 8 * 60, theme: 'alabaster-paper' }, // 08:00 - 16:00
  { start: 16 * 60, theme: 'nordic-frost' }, // 16:00 - 18:00
  { start: 18 * 60, theme: 'dusk' }, // 18:00 - 21:00
  { start: 21 * 60, theme: 'midnight' }, // 21:00 - 24:00
];

export function themeForDate(date: Date): ThemeId {
  const minutes = date.getHours() * 60 + date.getMinutes();
  let current = AUTO_SCHEDULE[0].theme;
  for (const slot of AUTO_SCHEDULE) if (slot.start <= minutes) current = slot.theme;
  return current;
}

/** Milliseconds until the next schedule boundary after `date`. */
export function msUntilNextSlot(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const next = AUTO_SCHEDULE.find((slot) => slot.start > minutes)?.start ?? 24 * 60;
  return Math.max(1000, ((next - minutes) * 60 - date.getSeconds()) * 1000 - date.getMilliseconds());
}

/** Maps values saved by earlier versions (light/dark/nord/monokai) onto the new themes. */
const LEGACY_THEMES: Record<string, ThemeId> = {
  'warm-paper': 'alabaster-paper',
  'solarized-light': 'nordic-frost',
  light: 'alabaster-paper',
  dark: 'midnight',
  nord: 'midnight',
  monokai: 'midnight',
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function normalizeTheme(value: unknown): ThemeId | null {
  if (isThemeId(value)) return value;
  if (typeof value === 'string' && value in LEGACY_THEMES) return LEGACY_THEMES[value];
  return null;
}

export function normalizePreference(value: unknown): ThemePreference | null {
  return value === 'auto' ? 'auto' : normalizeTheme(value);
}

/**
 * Runs before first paint (inlined in <head>) so the saved theme is applied
 * without a flash of the default one. With nothing saved, it follows the
 * operating system's light/dark preference.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var m=${JSON.stringify(LEGACY_THEMES)};var ok=${JSON.stringify(THEMES)};var dk=${JSON.stringify(THEMES.filter((id) => THEME_META[id].dark))};var sc=${JSON.stringify(AUTO_SCHEDULE)};if(t==='auto'){var d=new Date(),n=d.getHours()*60+d.getMinutes();t=sc[0].theme;for(var i=0;i<sc.length;i++)if(sc[i].start<=n)t=sc[i].theme;}else if(ok.indexOf(t)<0)t=m[t]||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'midnight':'alabaster-paper');var r=document.documentElement,isD=dk.indexOf(t)>=0;r.setAttribute('data-theme',t);r.classList.toggle('dark',isD);r.style.colorScheme=isD?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','alabaster-paper');}})();`;
