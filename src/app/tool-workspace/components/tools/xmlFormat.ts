/** Pretty-prints XML by putting each tag on its own line. Shared by the XML Formatter and XML Diff. */
export function formatXml(xml: string, indent: number): string {
  const INDENT = ' '.repeat(indent);
  let formatted = '';
  let depth = 0;
  const tokens = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n');
  for (const token of tokens) {
    const stripped = token.trim();
    if (!stripped) continue;
    if (stripped.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      formatted += INDENT.repeat(depth) + stripped + '\n';
    } else if (stripped.startsWith('<') && !stripped.startsWith('<?') && !stripped.startsWith('<!') && !stripped.endsWith('/>') && !stripped.includes('</')) {
      formatted += INDENT.repeat(depth) + stripped + '\n';
      depth++;
    } else {
      formatted += INDENT.repeat(depth) + stripped + '\n';
    }
  }
  return formatted.trim();
}

/** Collapses whitespace between tags so two documents that differ only in layout format identically. */
export function normalizeXml(xml: string, indent = 2): string {
  return formatXml(xml.replace(/>\s+</g, '><').trim(), indent);
}
