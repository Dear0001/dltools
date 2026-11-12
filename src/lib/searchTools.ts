import { CATEGORIES, TOOLS, type Tool } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, type Locale } from '@/i18n/LocaleProvider';

/**
 * Ranks tools for a free-text query in either language. Name matches beat tag
 * matches, which beat description matches, so "json" lists the JSON tools
 * before tools that merely mention JSON. Returns every tool for an empty query.
 */
export function searchTools(query: string, locale: Locale, tools: Tool[] = TOOLS): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = tools.map((tool) => {
    const names = [tool.name, getToolName(tool.id, tool.name, locale)].map((v) => v.toLowerCase());
    const descriptions = [tool.description, getToolDescription(tool.id, tool.description, locale)].map((v) => v.toLowerCase());
    const category = CATEGORIES.find((c) => c.id === tool.category);
    const categoryNames = category ? [category.label, getCategoryName(category.id, category.label, locale)].map((v) => v.toLowerCase()) : [];

    let score = 0;
    for (const term of terms) {
      let termScore = 0;
      if (names.some((n) => n.startsWith(term))) termScore = 100;
      else if (names.some((n) => n.includes(term))) termScore = 60;
      else if (tool.tags.some((tag) => tag === term)) termScore = 50;
      else if (tool.tags.some((tag) => tag.includes(term))) termScore = 35;
      else if (categoryNames.some((c) => c.includes(term))) termScore = 20;
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
