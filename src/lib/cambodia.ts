/**
 * Cambodia's capital and 24 provinces, with the coordinates of each provincial
 * town. The free geocoder misses several of these (and all Khmer names), so
 * weather mode checks this list before asking it.
 */
export interface CambodiaPlace {
  name: string;
  khmer: string;
  /** Extra spellings / town names people type. */
  aliases?: string[];
  latitude: number;
  longitude: number;
}

export const CAMBODIA_PLACES: CambodiaPlace[] = [
  { name: 'Phnom Penh', khmer: 'ភ្នំពេញ', latitude: 11.56, longitude: 104.92 },
  { name: 'Banteay Meanchey', khmer: 'បន្ទាយមានជ័យ', aliases: ['Serei Saophoan', 'Sisophon'], latitude: 13.59, longitude: 102.98 },
  { name: 'Battambang', khmer: 'បាត់ដំបង', latitude: 13.1, longitude: 103.2 },
  { name: 'Kampong Cham', khmer: 'កំពង់ចាម', aliases: ['Kompong Cham'], latitude: 11.99, longitude: 105.46 },
  { name: 'Kampong Chhnang', khmer: 'កំពង់ឆ្នាំង', aliases: ['Kompong Chhnang'], latitude: 12.25, longitude: 104.67 },
  { name: 'Kampong Speu', khmer: 'កំពង់ស្ពឺ', aliases: ['Kompong Speu', 'Chbar Mon'], latitude: 11.45, longitude: 104.52 },
  { name: 'Kampong Thom', khmer: 'កំពង់ធំ', aliases: ['Kompong Thom', 'Stung Saen'], latitude: 12.71, longitude: 104.89 },
  { name: 'Kampot', khmer: 'កំពត', latitude: 10.61, longitude: 104.18 },
  { name: 'Kandal', khmer: 'កណ្តាល', aliases: ['Ta Khmau', 'Takhmau'], latitude: 11.48, longitude: 104.95 },
  { name: 'Kep', khmer: 'កែប', latitude: 10.48, longitude: 104.32 },
  { name: 'Koh Kong', khmer: 'កោះកុង', latitude: 11.62, longitude: 102.98 },
  { name: 'Kratié', khmer: 'ក្រចេះ', aliases: ['Kratie'], latitude: 12.49, longitude: 106.02 },
  { name: 'Mondulkiri', khmer: 'មណ្ឌលគិរី', aliases: ['Mondul Kiri', 'Senmonorom', 'Sen Monorom'], latitude: 12.46, longitude: 107.19 },
  { name: 'Oddar Meanchey', khmer: 'ឧត្តរមានជ័យ', aliases: ['Otdar Meanchey', 'Samraong'], latitude: 14.18, longitude: 103.52 },
  { name: 'Pailin', khmer: 'ប៉ៃលិន', latitude: 12.85, longitude: 102.61 },
  { name: 'Preah Vihear', khmer: 'ព្រះវិហារ', aliases: ['Tbaeng Meanchey'], latitude: 13.8, longitude: 104.98 },
  { name: 'Preah Sihanouk', khmer: 'ព្រះសីហនុ', aliases: ['Sihanoukville', 'Kampong Som'], latitude: 10.63, longitude: 103.5 },
  { name: 'Prey Veng', khmer: 'ព្រៃវែង', latitude: 11.49, longitude: 105.33 },
  { name: 'Pursat', khmer: 'ពោធិ៍សាត់', aliases: ['Pousat', 'Poursat'], latitude: 12.54, longitude: 103.92 },
  { name: 'Ratanakiri', khmer: 'រតនគិរី', aliases: ['Rattanakiri', 'Banlung'], latitude: 13.74, longitude: 106.99 },
  { name: 'Siem Reap', khmer: 'សៀមរាប', aliases: ['Siemreap'], latitude: 13.36, longitude: 103.86 },
  { name: 'Stung Treng', khmer: 'ស្ទឹងត្រែង', aliases: ['Steung Treng'], latitude: 13.53, longitude: 105.97 },
  { name: 'Svay Rieng', khmer: 'ស្វាយរៀង', latitude: 11.09, longitude: 105.8 },
  { name: 'Takeo', khmer: 'តាកែវ', aliases: ['Takev'], latitude: 10.99, longitude: 104.78 },
  { name: 'Tboung Khmum', khmer: 'ត្បូងឃ្មុំ', aliases: ['Tbong Khmum', 'Tboung Khmom', 'Suong'], latitude: 11.91, longitude: 105.65 },
];

/** Lowercase, drop accents, spaces, hyphens and the words province/city/krong/khet. */
function simplify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(province|city|krong|khet|capital)\b/g, '')
    .replace(/[\s\-_.,']/g, '');
}

export function findCambodiaPlace(query: string): CambodiaPlace | null {
  const q = simplify(query);
  if (q.length < 2) return null;
  const keys = (p: CambodiaPlace) => [p.name, p.khmer, ...(p.aliases ?? [])].map(simplify);
  return (
    CAMBODIA_PLACES.find((p) => keys(p).includes(q)) ??
    // Typing "siem" or "kampong c" should still find something sensible.
    CAMBODIA_PLACES.find((p) => keys(p).some((k) => k.startsWith(q))) ??
    null
  );
}
