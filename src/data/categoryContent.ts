import type { ToolCategory } from './tools';

/** Category page copy. Each entry is written for its own category and is not reused anywhere else. */
export const CATEGORY_CONTENT: Record<ToolCategory, { title: string; description: string; intro: string; whenToUse: string }> = {
  formatters: {
    title: 'Code & Markup Formatters',
    description: 'Free online formatters for JSON, JavaScript, TypeScript, HTML, CSS, SQL, XML, YAML and Markdown. Beautify, minify and validate in your browser.',
    intro: 'These formatters take compressed, copied or inconsistent code and return clean, indented output. Most use Prettier or a native parser, so what you see is close to what a project formatter would produce.',
    whenToUse: 'Reach for a formatter when you are reading a minified bundle, reviewing an API response, checking a config file before a commit, or making a snippet consistent for documentation.',
  },
  data: {
    title: 'JSON & Data Tools',
    description: 'Validate JSON against a schema, query it with JSONPath and convert between JSON, YAML, CSV and XML, all in your browser.',
    intro: 'Tools for working with structured data once it is already valid: query nested values, check a document against a JSON Schema, and move data between common formats.',
    whenToUse: 'Use these when an API contract has to be enforced, when you need one value from a large payload, or when a spreadsheet export has to become JSON or YAML.',
  },
  diff: {
    title: 'Diff & Compare Tools',
    description: 'Compare two JSON, XML, text or source code versions online and see added and removed lines highlighted.',
    intro: 'Each diff tool compares two versions and highlights additions and removals. The JSON and XML versions format both sides first, so differences in whitespace do not hide real changes.',
    whenToUse: 'Use them to compare responses between environments, review a config change, or check what a refactor altered without opening a Git client.',
  },
  generators: {
    title: 'Generators',
    description: 'Generate TypeScript, Java, Kotlin, C# and Dart models from JSON, build cURL commands and construct SQL queries visually.',
    intro: 'Generators turn a small input into code or commands you would otherwise type by hand: model classes from a JSON sample, a cURL request from a form, or a SQL statement from a query builder.',
    whenToUse: 'Use them when starting an API client, documenting a request for a teammate, or drafting a query without remembering every clause.',
  },
  security: {
    title: 'Encoding & Security Tools',
    description: 'Decode JWTs, hash text and files, generate UUIDs and passwords, encode URLs and inspect X.509 certificates in your browser.',
    intro: 'Tools for inspecting and producing the values that appear in authentication and integrity workflows: tokens, hashes, identifiers, passwords, encodings and certificates.',
    whenToUse: 'Use them to debug a login token, verify a download checksum, create test identifiers, or check when a certificate expires. Decoding a token does not verify its signature.',
  },
  utilities: {
    title: 'Developer Utilities',
    description: 'Regex tester, Unix timestamp converter, cron expression explainer, IPv4 CIDR calculator, timezone and unit converter, and an HTTP request tester.',
    intro: 'Small, frequently needed helpers: test a pattern, read an epoch value, understand a schedule, calculate a subnet, convert units and zones, or send a quick HTTP request.',
    whenToUse: 'Use them during debugging and planning, where the answer is a quick calculation rather than a project change.',
  },
  qr: {
    title: 'QR & KHQR Tools',
    description: 'Build, scan and validate QR codes and Cambodian KHQR payment payloads, including EMV TLV fields and CRC-16 checks.',
    intro: 'KHQR is Cambodia’s QR payment standard based on EMVCo. These tools generate payloads, decode them field by field and verify the CRC so integration problems can be located.',
    whenToUse: 'Use them when a payment QR will not scan in a banking app, when integrating a KHQR flow, or when you want to see what a QR code actually contains.',
  },
  image: {
    title: 'Image & Base64 Tools',
    description: 'Compress and resize images, convert files to and from Base64 and preview or optimise SVG, processed locally in your browser.',
    intro: 'These tools handle images and binary data without uploading them: shrink a photo, embed an asset as a data URI, decode a Base64 attachment or check an SVG icon.',
    whenToUse: 'Use them to meet upload limits, embed small assets in HTML or CSS, or recover a file returned as Base64 by an API.',
  },
  documents: {
    title: 'PDF & Word Converters',
    description: 'Convert PDF and Word files, turn images into PDF or Word, and decode Base64 into PDF, Word or Excel files.',
    intro: 'Document converters for common office formats. Text-based PDFs convert to Word, images become PDF or Word documents, and Base64 strings decode back to real files.',
    whenToUse: 'Use them when a form accepts only PDF, when a report arrives as Base64 from an API, or when screenshots need to be packaged into one document.',
  },
};
