import { CATEGORIES, TOOLS, type Tool } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, type Locale } from '@/i18n/LocaleProvider';

/** Lower-cases and strips zero-width characters, which Khmer text often contains between words. */
export function normalizeSearchText(value: string): string {
  return value.replace(/[​-‍﻿]/g, '').toLowerCase().trim();
}

interface SearchIndexEntry {
  names: string[];
  descriptions: string[];
  categories: string[];
}

/** English and Khmer text for every tool, so either language finds a tool whatever the UI language is. */
const INDEX = new Map<string, SearchIndexEntry>(
  TOOLS.map((tool) => {
    const category = CATEGORIES.find((c) => c.id === tool.category);
    const both = (en: string, kh: string) => [...new Set([en, kh].map(normalizeSearchText))];
    return [
      tool.id,
      {
        names: both(tool.name, getToolName(tool.id, tool.name, 'kh')),
        descriptions: both(tool.description, getToolDescription(tool.id, tool.description, 'kh')),
        categories: category ? both(category.label, getCategoryName(category.id, category.label, 'kh')) : [],
      },
    ];
  }),
);

/**
 * Ranks tools for a free-text query in English or Khmer. Name matches beat tag
 * matches, which beat category and description matches, so "json" lists the
 * JSON tools before tools that merely mention JSON. Every term must match.
 * Returns every tool for an empty query. `locale` is kept for API stability;
 * results do not depend on it.
 */
export function searchTools(query: string, _locale?: Locale, tools: Tool[] = TOOLS): Tool[] {
  const q = normalizeSearchText(query);
  if (!q) return tools;
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = tools.map((tool) => {
    const entry = INDEX.get(tool.id);
    if (!entry) return { tool, score: 0 };
    const { names, descriptions, categories } = entry;

    let score = 0;
    for (const term of terms) {
      let termScore = 0;
      if (names.some((n) => n.startsWith(term))) termScore = 100;
      else if (names.some((n) => n.includes(term))) termScore = 60;
      else if (tool.tags.some((tag) => tag === term)) termScore = 50;
      else if (tool.tags.some((tag) => tag.includes(term))) termScore = 35;
      else if (categories.some((c) => c.includes(term))) termScore = 20;
      else if (descriptions.some((d) => d.includes(term))) termScore = 10;
      if (termScore === 0) return { tool, score: 0 };
      score += termScore;
    }
    if (tool.popular) score += 3;
    return { tool, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .map((entry) => entry.tool);
}
