/**
 * Shared English → Khmer terminology for DLTools.
 *
 * Use these terms in every Khmer string (UI messages, tool names, how-to content, FAQ, policy pages)
 * so the same idea is always written the same way. `avoid` lists variants that must not appear;
 * khGlossary.test.ts enforces them across src/.
 *
 * Typography rules (also enforced by the test):
 * 1. Put a space between Khmer text and Latin letters or digits: «បិទភ្ជាប់ SQL», not «បិទភ្ជាប់SQL».
 * 2. No space before the khan «។».
 * 3. Name an on-screen button with its Khmer label in «…» quotes: ចុច «បង្រួម».
 * 4. Keep technical tokens in Latin script: JSON, URL, JWT, token, header, body, method, regex.
 * 5. Spaces in Khmer separate phrases, not words; never split a compound such as «កម្មវិធីរុករក».
 */
export interface GlossaryTerm {
  en: string;
  kh: string;
  /** Variants that must not be used (misspellings, loanword transliterations, ambiguous terms). */
  avoid?: string[];
  note?: string;
}

export const KH_GLOSSARY: readonly GlossaryTerm[] = [
  { en: 'tool', kh: 'ឧបករណ៍', note: 'Means "tool". Do not use it for "device": that reads as "tool" too.' },
  { en: 'device (storage location)', kh: 'កម្មវិធីរុករកនេះ', note: 'Favourites, theme and recents live in this browser, so say "in this browser". For hardware say ទូរស័ព្ទ ឬកុំព្យូទ័រ.' },
  { en: 'browser', kh: 'កម្មវិធីរុករក', avoid: ['ឧបករណ៍រុករក', 'ប្រោសឺរ'] },
  { en: 'server', kh: 'ម៉ាស៊ីនមេ', avoid: ['សឺវើរ', 'ស៊ើវើ'] },
  { en: 'upload', kh: 'ផ្ទុកឡើង', avoid: ['អាប់ឡូត'] },
  { en: 'download', kh: 'ទាញយក', avoid: ['ដោនឡូត', 'ដោនឡូដ'] },
  { en: 'copy', kh: 'ចម្លង', avoid: ['កូពី', 'ខូពី'] },
  { en: 'paste', kh: 'បិទភ្ជាប់' },
  { en: 'clipboard', kh: 'ក្ដារតម្បៀតខ្ទាស់', avoid: ['ក្តារតម្បៀតខ្ទាស់'], note: 'Spelled with coeng DA (្ដ).' },
  { en: 'format (verb, code)', kh: 'រៀបចំ', note: 'Tool names: «រៀបចំ JSON». The generic Format button is «រៀបចំទ្រង់ទ្រាយ».' },
  { en: 'format (file or data format)', kh: 'ទ្រង់ទ្រាយ', note: 'e.g. ទ្រង់ទ្រាយ PEM, ទ្រង់ទ្រាយលទ្ធផល.' },
  { en: 'form (input form)', kh: 'ទម្រង់បំពេញ', note: 'Plain ទម្រង់ means shape/layout, e.g. complex formatting = ទម្រង់ស្មុគស្មាញ.' },
  { en: 'minify', kh: 'បង្រួម' },
  { en: 'compress (image, gzip)', kh: 'បង្ហាប់' },
  { en: 'encode', kh: 'អ៊ិនកូដ', avoid: ['អ៉ិនកូដ', 'អ៊ីនកូដ'] },
  { en: 'decode', kh: 'ឌិកូដ', avoid: ['ដេកូដ', 'ឌីកូដ'] },
  { en: 'validate', kh: 'ផ្ទៀងផ្ទាត់' },
  { en: 'generate', kh: 'បង្កើត' },
  { en: 'convert', kh: 'បម្លែង' },
  { en: 'compare / diff', kh: 'ប្រៀបធៀប' },
  { en: 'input', kh: 'ទិន្នន័យបញ្ចូល' },
  { en: 'output / result', kh: 'លទ្ធផល' },
  { en: 'favorites', kh: 'ចំណូលចិត្ត' },
  { en: 'saved data', kh: 'ទិន្នន័យដែលបានរក្សាទុក' },
  { en: 'sign in', kh: 'ចូលគណនី' },
  { en: 'sync', kh: 'ធ្វើសមកាលកម្ម' },
  { en: 'settings / preferences', kh: 'ការកំណត់' },
  { en: 'password', kh: 'ពាក្យសម្ងាត់' },
  { en: 'link', kh: 'តំណ' },
  { en: 'share', kh: 'ចែករំលែក' },
  { en: 'privacy', kh: 'ឯកជនភាព' },
  { en: 'category', kh: 'ប្រភេទ' },
  { en: 'filter', kh: 'តម្រង' },
  { en: 'search', kh: 'ស្វែងរក' },
  { en: 'breadcrumb', kh: 'ផ្លូវនាំទិស' },
  { en: 'certificate', kh: 'វិញ្ញាបនបត្រ' },
  { en: 'request (HTTP)', kh: 'សំណើ' },
];

/** All variants that must not appear in Khmer copy. */
export const KH_AVOID_TERMS: readonly string[] = KH_GLOSSARY.flatMap((term) => term.avoid ?? []);
