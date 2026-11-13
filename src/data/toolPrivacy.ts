/**
 * How a tool handles the data a user enters.
 * - `local`: processed entirely in the browser; nothing is sent anywhere.
 * - `network`: the browser sends a request the user configured to a URL the user entered.
 * Server-side storage only ever happens through the explicit "Saved data" dialog.
 */
export type ToolPrivacyMode = 'local' | 'network';

const NETWORK_TOOLS = new Set<string>(['tool-api-tester']);

export function getToolPrivacyMode(toolId: string): ToolPrivacyMode {
  return NETWORK_TOOLS.has(toolId) ? 'network' : 'local';
}
