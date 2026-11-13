import { TOOLS } from './tools';

/**
 * How a tool handles the data a user enters. This is the single source of truth for
 * every privacy statement on the site (tool header, homepage, footer, FAQ, About, Privacy).
 * - `local`: processed entirely in the browser; tool input is not sent to any server.
 *   This includes PDF/Word/image conversion, which runs on pdf.js, mammoth, docx and jsPDF in the page.
 * - `network`: the browser sends a request the user configured to a URL the user entered.
 * Separately, tool data reaches our server only when a signed-in user saves it with the
 * "Saved data" dialog.
 */
export type ToolPrivacyMode = 'local' | 'network';

export const NETWORK_TOOL_IDS: readonly string[] = ['tool-api-tester'];

export function getToolPrivacyMode(toolId: string): ToolPrivacyMode {
  return NETWORK_TOOL_IDS.includes(toolId) ? 'network' : 'local';
}

/** Counts used in site-wide copy, e.g. "43 of 44 tools process your input only in your browser". */
export const PRIVACY_COUNTS = {
  total: TOOLS.length,
  local: TOOLS.filter((tool) => getToolPrivacyMode(tool.id) === 'local').length,
} as const;
