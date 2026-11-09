// Parsing helpers for the JSON formatter (extracted from JsonFormatterPanel.tsx).

/**
 * Recursively parses any string values inside objects/arrays that represent valid JSON strings.
 * This version prevents double-parsing by tracking which strings have already been parsed.
 */
export function deepParseJsonStrings(value: unknown, depth = 0, maxDepth = 15, parsedSet = new Set<string>()): unknown {
  if (depth >= maxDepth) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;

    // Check if we've already parsed this exact string to prevent infinite recursion
    if (parsedSet.has(trimmed)) return value;
    
    // Only attempt to parse if it looks like JSON
    const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                          (trimmed.startsWith('[') && trimmed.endsWith(']'));

    if (!looksLikeJson) return value;

    try {
      // Mark this string as being parsed
      parsedSet.add(trimmed);
      const parsed = JSON.parse(trimmed);
      // Recursively parse the result
      return deepParseJsonStrings(parsed, depth + 1, maxDepth, parsedSet);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepParseJsonStrings(item, depth + 1, maxDepth, parsedSet));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      // Don't re-parse strings that are already valid JSON objects
      if (typeof child === 'string' && 
          (child.trim().startsWith('{') || child.trim().startsWith('[')) &&
          parsedSet.has(child.trim())) {
        result[key] = child;
      } else {
        result[key] = deepParseJsonStrings(child, depth + 1, maxDepth, parsedSet);
      }
    }
    return result;
  }

  return value;
}

/**
 * Specifically handles the apiResponse format where responseObj contains nested JSON
 */
export function parseApiResponseWithNestedJson(input: string): unknown {
  try {
    const parsed = JSON.parse(input);
    
    // Helper to process an object and its children
    function processObject(obj: any): any {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => processObject(item));
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          // Only parse if it looks like a JSON object or array
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              // Parse the string once
              const parsedValue = JSON.parse(trimmed);
              // Recursively process the parsed value
              result[key] = processObject(parsedValue);
              continue;
            } catch {
              // If parsing fails, keep as string
              result[key] = value;
              continue;
            }
          }
        }
        // Recursively process nested objects
        result[key] = processObject(value);
      }
      return result;
    }
    
    // Process the entire parsed object
    return processObject(parsed);
  } catch {
    return null;
  }
}

export function unquoteJsonString(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

export function cleanJsonFragment(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed === '{' || trimmed === '}' || trimmed === '[' || trimmed === ']') {
    return trimmed;
  }

  const withoutTrailingComma = trimmed.replace(/,\s*$/, '');
  const unquoted = unquoteJsonString(withoutTrailingComma);

  if (unquoted !== withoutTrailingComma) {
    return cleanJsonFragment(unquoted);
  }

  try {
    return deepParseJsonStrings(JSON.parse(withoutTrailingComma));
  } catch {
    return withoutTrailingComma;
  }
}

function normalizeParsedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeParsedJson);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, child]) => {
      const normalizedKey = unquoteJsonString(key);
      acc[normalizedKey] = normalizeParsedJson(child);
      return acc;
    }, {} as Record<string, unknown>);
  }

  return cleanJsonFragment(value);
}

function reconstructJsonFromFragments(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reconstructJsonFromFragments);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, child]) => {
      acc[key] = reconstructJsonFromFragments(child);
      return acc;
    }, {} as Record<string, unknown>);
  }

  return value;
}

export function repairEscapedBase64Padding(input: string): string {
  return input.replace(
    /(?<=[A-Za-z0-9+/])(?:\\=){1,2}(?=\\")/g,
    (padding) => padding.replace(/\\=/g, '='),
  );
}

function hasJsonFragmentMarkers(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasJsonFragmentMarkers);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasJsonFragmentMarkers);
  }

  return typeof value === 'string' && ['{', '}', '[', ']'].includes(value.trim());
}

export function parseLineBasedJson(lines: string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current: any = root;
  const stack: any[] = [root];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // A line holding only closing brackets (e.g. "}" or "],") ends the current container(s).
    if (/^[}\]]+,?$/.test(line)) {
      for (const _ of line.replace(/,$/, '')) {
        if (stack.length > 1) stack.pop();
      }
      current = stack[stack.length - 1] ?? root;
      continue;
    }

    const match = line.match(/^(.+?)\s*[:=]\s*(.+)$/);
    if (!match) continue;

    const rawKey = match[1].trim();
    let rawVal = match[2].trim().replace(/,\s*$/, '');
    const key = unquoteJsonString(rawKey);
    const value = cleanJsonFragment(rawVal);

    if (typeof value === 'string' && (value === '{' || value === '[')) {
      const nextContainer = value === '{' ? {} : [];
      if (Array.isArray(current)) {
        current.push(nextContainer);
      } else {
        current[key] = nextContainer;
      }
      stack.push(current);
      current = nextContainer;
      continue;
    }

    if (typeof value === 'string' && (value === '}' || value === ']')) {
      stack.pop();
      current = stack[stack.length - 1] ?? root;
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
    } else {
      current[key] = value;
    }
  }

  return root;
}

export function parseJsonLike(input: string): unknown {
  const text = repairEscapedBase64Padding(input.trim());

  if (!text) {
    throw new Error('Input is empty');
  }

  // ---------------------------------------
  // 1. Try the specialized API response parser first
  // ---------------------------------------
  const apiResult = parseApiResponseWithNestedJson(text);
  if (apiResult !== null) {
    return apiResult;
  }

  // ---------------------------------------
  // 2. Try normal JSON with deep parsing
  // ---------------------------------------
  try {
    const parsed = JSON.parse(text);
    const deepParsed = deepParseJsonStrings(parsed);
    const normalized = normalizeParsedJson(deepParsed);
    if (hasJsonFragmentMarkers(normalized)) {
      return reconstructJsonFromFragments(normalized);
    }
    return normalized;
  } catch {}

  // ---------------------------------------
  // 3. Try a JSON string wrapping
  // ---------------------------------------
  try {
    const parsedString = JSON.parse(text);
    if (typeof parsedString === 'string') {
      return parseJsonLike(parsedString);
    }
  } catch {}

  // ---------------------------------------
  // 4. Parse key=value / key:value with nested fragments
  // ---------------------------------------
  const lines = text.split(/\r?\n/);
  const parsed = parseLineBasedJson(lines);

  if (Object.keys(parsed).length > 0) {
    return deepParseJsonStrings(parsed);
  }

  throw new Error('Unable to parse input');
}

export function looksLikeLegacyJsonInput(input: string): boolean {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.every((line) => /^[^:=]+?\s*[:=]\s*.+$/.test(line) || /^[{}\[\],]+$/.test(line));
  }
  const line = input.trim();
  return (
    /^[A-Za-z_$][\w$.-]*\s*=\s*.+$/.test(line) ||
    (/^[A-Za-z_$][\w$.-]*\s*:\s*(?!\/\/).+$/.test(line) && !line.includes('://'))
  );
}
