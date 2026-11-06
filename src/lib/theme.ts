export const THEME_STORAGE_KEY = 'devtoolkit-theme';

export const THEMES = ['alabaster-paper', 'nordic-frost', 'midnight'] as const;
export type ThemeId = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = 'alabaster-paper';

export const THEME_META: Record<ThemeId, { label: string; labelKh: string; dark: boolean; swatch: [string, string, string] }> = {
  'alabaster-paper': { label: 'Alabaster Paper', labelKh: 'ក្រដាសស្រាល', dark: false, swatch: ['#F7F6F2', '#FAF7F2', '#3F5FE0'] },
  'nordic-frost': { label: 'Nordic Frost', labelKh: 'ទឹកកកនរឌិក', dark: false, swatch: ['#ECEFF4', '#D8DEE9', '#5E81AC'] },
  midnight: { label: 'Midnight Charcoal', labelKh: 'ខ្មៅអ័រ​ធ្យូង', dark: true, swatch: ['#1E1E2E', '#282839', '#89B4FA'] },
};

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
 * without a flash of the default one.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var m={'warm-paper':'alabaster-paper','solarized-light':'nordic-frost',light:'alabaster-paper',dark:'midnight',nord:'midnight',monokai:'midnight'};var ok=['alabaster-paper','nordic-frost','midnight'];if(ok.indexOf(t)<0)t=m[t]||'alabaster-paper';var r=document.documentElement;r.setAttribute('data-theme',t);r.classList.toggle('dark',t==='midnight');r.style.colorScheme=t==='midnight'?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','alabaster-paper');}})();`;
