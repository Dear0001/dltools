export const THEME_STORAGE_KEY = 'devtoolkit-theme';

export const THEMES = ['alabaster-paper', 'nordic-frost', 'midnight'] as const;
export type ThemeId = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = 'alabaster-paper';

export const THEME_META: Record<ThemeId, { label: string; labelKh: string; dark: boolean; swatch: [string, string, string] }> = {
  'alabaster-paper': { label: 'Light', labelKh: 'ភ្លឺ', dark: false, swatch: ['#FDFBF7', '#FFFFFF', '#2563EB'] },
  midnight: { label: 'Dark', labelKh: 'ងងឹត', dark: true, swatch: ['#0F141B', '#161D27', '#60A5FA'] },
  'nordic-frost': { label: 'Nordic (cool light)', labelKh: 'ណរឌិក (ភ្លឺត្រជាក់)', dark: false, swatch: ['#ECEFF4', '#D8DEE9', '#4C6E9C'] },
};

/** Order shown in the theme menu: the two main modes first. */
export const THEME_MENU_ORDER: ThemeId[] = ['alabaster-paper', 'midnight', 'nordic-frost'];

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

/**
 * Runs before first paint (inlined in <head>) so the saved theme is applied
 * without a flash of the default one. With nothing saved, it follows the
 * operating system's light/dark preference.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var m={'warm-paper':'alabaster-paper','solarized-light':'nordic-frost',light:'alabaster-paper',dark:'midnight',nord:'midnight',monokai:'midnight'};var ok=['alabaster-paper','nordic-frost','midnight'];if(ok.indexOf(t)<0)t=m[t]||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'midnight':'alabaster-paper');var r=document.documentElement;r.setAttribute('data-theme',t);r.classList.toggle('dark',t==='midnight');r.style.colorScheme=t==='midnight'?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','alabaster-paper');}})();`;
