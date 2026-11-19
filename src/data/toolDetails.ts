/**
 * Tool-specific page content that is rendered into the server HTML of every /tools/[slug] page.
 * Everything here is written for one tool only: nothing is shared between entries, and
 * toolDetails.test.ts fails if two tools reuse the same description, example or error text.
 * Examples are illustrative; exact output layout can vary with the options a tool offers.
 */
export interface ToolExample {
  input: string;
  output: string;
  /** One line explaining what the example shows. */
  note: string;
}

export interface ToolError {
  problem: string;
  fix: string;
}

export interface ToolDetails {
  /** Unique <meta name="description"> / og:description for the tool page (110-160 characters). */
  metaDescription: string;
  /** What the tool can do, beyond the one-line summary. */
  features: string[];
  example: ToolExample;
  errors: ToolError[];
}

const D: Record<string, ToolDetails> = {
  'json-formatter': {
    metaDescription:
      'Format, minify and validate JSON online. Paste an API response, get readable indented output with syntax highlighting and the exact line of any syntax error.',
    features: [
      'Pretty-print with indentation or minify to a single line',
      'Syntax highlighting for keys, strings, numbers and booleans',
      'Validation that reports what is wrong and where',
      'Runs in your browser, so the JSON is not uploaded',
    ],
    example: {
      input: '{"name":"DLTools","tools":44,"free":true}',
      output: '{\n  "name": "DLTools",\n  "tools": 44,\n  "free": true\n}',
      note: 'A one-line payload becomes indented, readable JSON.',
    },
    errors: [
      { problem: 'Unexpected token } or , near the end', fix: 'Remove the trailing comma after the last item in an object or array. JSON does not allow it.' },
      { problem: 'Unexpected token \' at position 1', fix: 'JSON requires double quotes. Replace single-quoted keys and strings with double quotes.' },
    ],
  },
  'js-formatter': {
    metaDescription:
      'Format JavaScript and TypeScript with Prettier in your browser. Tune quotes, semicolons and indentation, then clean up minified or messy code in one click.',
    features: [
      'Prettier-based formatting for JavaScript and TypeScript',
      'Options for indentation, quote style and semicolons',
      'Handles minified bundles and copy-pasted snippets',
      'No install or editor plugin required',
    ],
    example: {
      input: 'const a=1;function f(x){return x*2}',
      output: 'const a = 1;\nfunction f(x) {\n  return x * 2;\n}',
      note: 'Spacing, semicolons and line breaks are normalised.',
    },
    errors: [
      { problem: 'Formatting fails with a syntax error', fix: 'Prettier needs valid code. Close any open bracket or string reported in the message and run it again.' },
      { problem: 'TypeScript syntax is rejected', fix: 'Choose the TypeScript parser option so type annotations and generics are understood.' },
    ],
  },
  'html-formatter': {
    metaDescription:
      'Beautify or minify HTML online. Set the indent size to turn compressed page source or email templates into clean, readable markup.',
    features: [
      'Beautify with a configurable indent size',
      'Minify to strip whitespace from small snippets',
      'Works on fragments as well as full documents',
      'Useful for reading page source and email templates',
    ],
    example: {
      input: '<ul><li>One</li><li>Two</li></ul>',
      output: '<ul>\n  <li>One</li>\n  <li>Two</li>\n</ul>',
      note: 'Nested elements are placed on their own indented lines.',
    },
    errors: [
      { problem: 'Output looks wrong after formatting', fix: 'Check for an unclosed tag in the input. The beautifier follows the tags it is given, so a missing </div> shifts everything below it.' },
      { problem: 'Inline text gains extra whitespace', fix: 'Use Minify for content where whitespace between inline elements matters, such as text inside a <pre>.' },
    ],
  },
  'css-formatter': {
    metaDescription:
      'Format CSS, SCSS and Less stylesheets with Prettier. Un-minify production CSS, fix indentation and tidy nested rules without installing anything.',
    features: [
      'Supports CSS, SCSS and Less syntax',
      'Nested rules and variables are preserved',
      'Un-minifies production stylesheets so they can be read',
      'Consistent indentation across a project',
    ],
    example: {
      input: 'a{color:red;margin:0}',
      output: 'a {\n  color: red;\n  margin: 0;\n}',
      note: 'Each declaration gets its own line with a space after the colon.',
    },
    errors: [
      { problem: 'Unknown word or unclosed block error', fix: 'Look for a missing } or ; just before the line named in the error.' },
      { problem: 'SCSS nesting fails in CSS mode', fix: 'Switch the language selector to SCSS or Less when the file uses nesting or $variables.' },
    ],
  },
  'sql-formatter': {
    metaDescription:
      'Format SQL for MySQL, PostgreSQL, SQLite, T-SQL and BigQuery. Turn long single-line queries and ORM output into readable, indented statements.',
    features: [
      'Dialect choice: MySQL, PostgreSQL, SQLite, T-SQL, BigQuery and more',
      'Keywords are uppercased and clauses are put on separate lines',
      'Handles joins, subqueries and long column lists',
      'Copy-ready output for code reviews and documentation',
    ],
    example: {
      input: 'select id,name from users where active=1 order by name',
      output: 'SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  active = 1\nORDER BY\n  name',
      note: 'Each clause starts on its own line.',
    },
    errors: [
      { problem: 'Syntax error near a function or operator', fix: 'Pick the dialect that matches your database. For example PostgreSQL :: casts and T-SQL [brackets] differ.' },
      { problem: 'Several statements are merged together', fix: 'End each statement with a semicolon so the formatter can separate them.' },
    ],
  },
  'xml-formatter': {
    metaDescription:
      'Pretty-print or minify XML and check it is well-formed. Uses the browser XML parser, so SOAP, RSS and config files are validated as they are formatted.',
    features: [
      'Pretty-print with indentation or minify',
      'Well-formedness check with an error message',
      'Uses the native browser XML parser',
      'Suited to SOAP responses, RSS feeds and config files',
    ],
    example: {
      input: '<root><item id="1">A</item></root>',
      output: '<root>\n  <item id="1">A</item>\n</root>',
      note: 'Child elements are indented under their parent.',
    },
    errors: [
      { problem: 'Opening and ending tag mismatch', fix: 'Every element must be closed in the reverse order it was opened. Fix the tag named in the message.' },
      { problem: 'Unescaped & or < inside text', fix: 'Write & as &amp; and < as &lt; in text content, or wrap the text in a CDATA section.' },
    ],
  },
  'yaml-formatter': {
    metaDescription:
      'Format and validate YAML for CI pipelines, Docker Compose and Kubernetes. Finds duplicate keys and bad indentation before they break a deploy.',
    features: [
      'Re-indents YAML to a consistent style',
      'Reports duplicate keys',
      'Flags indentation that changes the structure',
      'Good for CI/CD, Compose and Kubernetes manifests',
    ],
    example: {
      input: 'services:\n    web:\n        image: nginx',
      output: 'services:\n  web:\n    image: nginx',
      note: 'Four-space indentation is normalised to two spaces without changing the structure.',
    },
    errors: [
      { problem: 'Tabs used for indentation', fix: 'YAML does not allow tab characters for indentation. Replace them with spaces.' },
      { problem: 'Duplicated mapping key', fix: 'Two entries share the same key at the same level, and the later one silently wins in many parsers. Rename or merge them.' },
    ],
  },
  'markdown-formatter': {
    metaDescription:
      'Format Markdown with Prettier and see the rendered preview beside the source. Tidy READMEs, lists and tables before you publish.',
    features: [
      'Prettier formatting for Markdown',
      'Live rendered preview next to the editor',
      'Normalises list markers and table alignment',
      'Helpful for README files and documentation',
    ],
    example: {
      input: '*  item one\n*  item two',
      output: '- item one\n- item two',
      note: 'List markers and spacing are standardised.',
    },
    errors: [
      { problem: 'A table does not render', fix: 'Add the separator row (| --- | --- |) directly under the header row and keep the same number of columns.' },
      { problem: 'Numbered list restarts at 1', fix: 'Leave a blank line before the list and keep items at the same indentation level.' },
    ],
  },
  'json-diff': {
    metaDescription:
      'Compare two JSON payloads side by side and see added, removed and changed lines. Spot differences between API responses or config versions fast.',
    features: [
      'Side-by-side comparison of two JSON documents',
      'Line-level highlighting of additions, removals and changes',
      'Summary counts of what changed',
      'Both sides are pretty-printed first so formatting does not hide real changes',
    ],
    example: {
      input: 'Left:  {"id":1,"role":"user"}\nRight: {"id":1,"role":"admin","active":true}',
      output: '- "role": "user"\n+ "role": "admin"\n+ "active": true',
      note: 'One value changed and one key was added.',
    },
    errors: [
      { problem: 'One side will not compare', fix: 'Each side must be valid JSON. Run it through the JSON Formatter first to locate the syntax error.' },
      { problem: 'Everything is marked as changed', fix: 'Key order or indentation may differ. Format both sides the same way, then compare again.' },
    ],
  },
  'text-diff': {
    metaDescription:
      'A Git-style text diff in your browser. Paste two versions of a document, log or snippet and see added lines in green and removed lines in red.',
    features: [
      'Unified, Git-style view of any plain text',
      'Added lines in green, removed lines in red',
      'Added and removed line counts',
      'Nothing to install and no files to upload',
    ],
    example: {
      input: 'Old: apples\nbananas\nNew: apples\ncherries',
      output: '  apples\n- bananas\n+ cherries',
      note: 'The unchanged line stays neutral; the replaced line shows as a removal and an addition.',
    },
    errors: [
      { problem: 'Whole file shows as changed', fix: 'Line endings (Windows CRLF vs Unix LF) can differ between copies. Re-paste both texts from the same source.' },
      { problem: 'Small edits are hard to see', fix: 'The diff is line based. Put each sentence or item on its own line to see precise edits.' },
    ],
  },
  'xml-diff': {
    metaDescription:
      'Compare two XML documents after pretty-printing both, so formatting noise does not hide real changes. Added and removed lines are highlighted.',
    features: [
      'Normalises formatting before comparing',
      'Highlights added and removed lines',
      'Useful for SOAP messages, feeds and exported XML',
      'Shows where structure moved between releases',
    ],
    example: {
      input: 'Left:  <a><b>1</b></a>\nRight: <a><b>2</b><c/></a>',
      output: '  <a>\n-   <b>1</b>\n+   <b>2</b>\n+   <c/>\n  </a>',
      note: 'Formatting is aligned first, so only the value change and the new element are flagged.',
    },
    errors: [
      { problem: 'Nothing is highlighted but the files differ', fix: 'Attribute order or comments may be the difference. Compare the raw text with the Text Diff tool.' },
      { problem: 'Parse error on one side', fix: 'Each document needs a single root element and properly closed tags.' },
    ],
  },
  'java-diff': {
    metaDescription:
      'Side-by-side diff for Java, Kotlin or any source code. Paste two versions of a file to review a refactor without opening an IDE or Git client.',
    features: [
      'Two-pane comparison for source code',
      'Changed lines highlighted on each side',
      'Line-change summary',
      'Language agnostic: works for Java, Kotlin and other text-based code',
    ],
    example: {
      input: 'Old: int total = a + b;\nNew: long total = (long) a + b;',
      output: '- int total = a + b;\n+ long total = (long) a + b;',
      note: 'A type change on a single line.',
    },
    errors: [
      { problem: 'Indentation differences swamp the diff', fix: 'Convert tabs to spaces in both versions, or format both with the same style first.' },
      { problem: 'Very large files feel slow', fix: 'Compare one class or method at a time to keep the diff responsive.' },
    ],
  },
  'khqr-builder': {
    metaDescription:
      'Generate KHQR payment payloads and QR images for Cambodia using the EMVCo format with a CRC16 checksum. Static and dynamic (fixed amount) codes.',
    features: [
      'Static codes without an amount and dynamic codes with one',
      'EMVCo TLV payload with CRC16-CCITT checksum',
      'Currency selection and merchant fields',
      'Download or copy the payload and QR image',
    ],
    example: {
      input: 'Merchant: Demo Shop, City: Phnom Penh, Currency: USD, Amount: 1.50 (dynamic)',
      output: '000201010212 … 6304XXXX',
      note: 'Payloads start with 000201 (format indicator); 010212 marks a dynamic code, 010211 a static one, and the final four characters are the CRC.',
    },
    errors: [
      { problem: 'Banking app says the QR is invalid', fix: 'Check the account or merchant ID matches your bank record exactly, then confirm the payload with the KHQR Validator.' },
      { problem: 'Amount is ignored when scanned', fix: 'Amounts are only embedded in dynamic mode. Switch from static to dynamic and set the amount.' },
    ],
  },
  'khqr-validator': {
    metaDescription:
      'Decode and validate KHQR and EMV QR payloads. See every TLV field, verify the CRC-16 checksum and check currency and dual-currency status.',
    features: [
      'Breaks the payload into tag, length and value fields',
      'CRC-16 verification',
      'Currency and dual-currency detection',
      'Explains EMV tags for debugging and learning',
    ],
    example: {
      input: '00020101021229… 6304ABCD',
      output: 'Tag 00: Payload format 01\nTag 01: Initiation method 12 (dynamic)\n…\nTag 63: CRC ABCD → valid / mismatch',
      note: 'Each tag is listed with its decoded meaning and the checksum result.',
    },
    errors: [
      { problem: 'CRC mismatch', fix: 'The payload was edited after the checksum was created, or a character was lost when copying. Re-copy the full string or regenerate it.' },
      { problem: 'Length error on a tag', fix: 'A tag length does not match its value. Look for truncated text or a stray space at the start or end.' },
    ],
  },
  'qr-reader': {
    metaDescription:
      'Scan a QR code from an image or your camera and read its content. For EMV and KHQR codes it also shows tags, currency and CRC status.',
    features: [
      'Read QR codes from an uploaded image',
      'Camera scanning with your permission',
      'Shows the raw decoded text',
      'Parses EMV and KHQR payment codes into fields',
    ],
    example: {
      input: 'Screenshot of a QR code',
      output: 'https://dltools.vercel.app',
      note: 'The decoded text appears; payment codes also get a field-by-field breakdown.',
    },
    errors: [
      { problem: 'No QR code found in the image', fix: 'Crop closer to the code, use a higher-resolution image and make sure the full square with its quiet border is visible.' },
      { problem: 'Camera does not start', fix: 'Allow camera access for this site in the browser address bar, and close other apps that may be using the camera.' },
    ],
  },
  'base64-image': {
    metaDescription:
      'Convert images, PDFs and other files to Base64 and decode Base64 back to a file. Paste from the clipboard to build data URIs for HTML, CSS or JSON.',
    features: [
      'File to Base64 and Base64 to file',
      'Clipboard paste support',
      'Data URI output ready for HTML and CSS',
      'Works with images, PDFs and other binary files',
    ],
    example: {
      input: 'Text: Hello',
      output: 'SGVsbG8=',
      note: 'Base64 encoding of the five bytes "Hello". Image files produce a much longer string beginning with a type prefix such as data:image/png;base64,.',
    },
    errors: [
      { problem: 'Decoded file will not open', fix: 'The string may be missing characters or include whitespace. Paste the complete Base64 without line breaks and check the file type.' },
      { problem: 'Invalid character in Base64', fix: 'Standard Base64 uses A–Z, a–z, 0–9, + and /. Remove the data:…;base64, prefix when the tool expects raw Base64 only.' },
    ],
  },
  'base64-document': {
    metaDescription:
      'Turn a Base64 string or data URI into a downloadable PDF, Word (.docx) or Excel (.xlsx) file with automatic type detection and preview.',
    features: [
      'Detects PDF, Word and Excel from the decoded bytes',
      'Manual type choice if detection is wrong',
      'Preview before download where available',
      'Accepts raw Base64 or a full data URI',
    ],
    example: {
      input: 'JVBERi0xLjQK…',
      output: 'report.pdf (detected: PDF)',
      note: 'Base64 that starts with JVBERi0 is a PDF (%PDF-). Word and Excel files start with UEsDB because they are ZIP containers.',
    },
    errors: [
      { problem: 'Detected type is wrong for a Word or Excel file', fix: 'Both are ZIP-based and look alike at the start. Choose Word (.docx) or Excel (.xlsx) manually.' },
      { problem: 'Downloaded file is corrupt', fix: 'The Base64 was probably cut off. Copy the entire value from the API response, including any trailing = characters.' },
    ],
  },
  'image-compress': {
    metaDescription:
      'Resize and compress JPEG, PNG and WebP images in your browser. Choose size and quality to meet upload limits; the image never leaves your device.',
    features: [
      'Output as JPEG, PNG or WebP',
      'Adjustable quality and target dimensions',
      'Processed locally using the browser Canvas API',
      'Download the compressed file directly',
    ],
    example: {
      input: 'photo.jpg, 4000 × 3000, quality 85%, max width 1600 px',
      output: 'photo-compressed.jpg, 1600 × 1200',
      note: 'Reducing dimensions is usually the biggest saving; exact file size depends on the image.',
    },
    errors: [
      { problem: 'Compressed image is larger than the original', fix: 'Lower the quality or convert PNG photos to WebP or JPEG. PNG is lossless and often bigger for photos.' },
      { problem: 'Transparency turns black or white', fix: 'JPEG has no transparency. Choose PNG or WebP for images with transparent areas.' },
    ],
  },
  'svg-viewer': {
    metaDescription:
      'Preview SVG markup live and copy an optimised SVG or Base64 data URI. Check how an icon renders before using it in code.',
    features: [
      'Live preview of pasted SVG',
      'Optimised SVG output',
      'Base64 data URI for CSS backgrounds',
      'Quick check of icons from design tools',
    ],
    example: {
      input: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>',
      output: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i…',
      note: 'The preview shows a filled circle and the data URI is ready for a CSS url().',
    },
    errors: [
      { problem: 'Preview is blank', fix: 'The root <svg> tag needs xmlns="http://www.w3.org/2000/svg" and a width/height or viewBox.' },
      { problem: 'Icon is cut off', fix: 'Set a viewBox that covers the whole drawing, for example viewBox="0 0 24 24".' },
    ],
  },
  uuid: {
    metaDescription:
      'Generate version 4 UUIDs in bulk with the browser crypto API. Copy one value or the whole list for tests, fixtures and database seeds.',
    features: [
      'Bulk generation of UUID v4 values',
      'Uses crypto.randomUUID() from the browser',
      'Copy a single UUID or the full list',
      'No account and no server round trip',
    ],
    example: {
      input: 'Count: 2',
      output: '3b241101-e2bb-4255-8caf-4136c566a962\n9f1c2d7e-5a40-4b8e-a1c3-0d6e7f8a9b10',
      note: 'Each value has the 8-4-4-4-12 hex layout, with 4 as the version digit.',
    },
    errors: [
      { problem: 'Database rejects the UUID', fix: 'Check the column type. Some systems want it without hyphens or in uppercase, which you can adjust after copying.' },
      { problem: 'Need sortable IDs', fix: 'Version 4 UUIDs are random and not time-ordered. Use a time-ordered ID scheme if you need index locality.' },
    ],
  },
  hash: {
    metaDescription:
      'Compute MD5, SHA-1, SHA-256 and SHA-512 hashes for text or files in your browser. Verify downloads against published checksums.',
    features: [
      'MD5, SHA-1, SHA-256 and SHA-512',
      'Hash typed text or a chosen file',
      'Compare against a published checksum',
      'Computed locally; the input is not sent anywhere',
    ],
    example: {
      input: 'hello',
      output: 'MD5: 5d41402abc4b2a76b9719d911017c592\nSHA-256: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      note: 'The same input always gives the same hash; a single changed character changes it completely.',
    },
    errors: [
      { problem: 'Hash does not match the published value', fix: 'Check for a trailing newline or space in the text. For files, confirm the download finished and you used the same algorithm.' },
      { problem: 'Using a hash to store passwords', fix: 'Plain MD5 and SHA are fast and unsuitable for password storage. Use bcrypt, scrypt or Argon2 on the server.' },
    ],
  },
  'password-generator': {
    metaDescription:
      'Generate strong random passwords with custom length and character sets using the browser secure random generator. Copy instantly.',
    features: [
      'Length control',
      'Toggle uppercase, lowercase, numbers and symbols',
      'Uses the browser cryptographic random source',
      'One-click copy',
    ],
    example: {
      input: 'Length 20, uppercase + lowercase + numbers + symbols',
      output: 'k#9Vf!rT2m@Qz7Lw$eXb',
      note: 'A random example; each click produces a different password.',
    },
    errors: [
      { problem: 'Site rejects the generated password', fix: 'Some sites block certain symbols or cap the length. Turn symbols off or shorten the length to match their rules.' },
      { problem: 'Cannot remember the password', fix: 'Store it in a password manager. Random passwords are meant to be saved, not memorised.' },
    ],
  },
  'jwt-decoder': {
    metaDescription:
      'Decode a JSON Web Token to read its header, payload and signature, with expiry and claim checks. Handy for debugging login and API auth issues.',
    features: [
      'Decodes header and payload to readable JSON',
      'Shows expiry (exp) and other registered claims',
      'Displays the signature segment',
      'Decoding happens in your browser',
    ],
    example: {
      input: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUifQ', '…'].join('.'),
      output: 'Header:  {"alg":"HS256","typ":"JWT"}\nPayload: {"sub":"1234567890","name":"Jane"}',
      note: 'The three dot-separated parts are Base64URL-encoded: header, payload and signature.',
    },
    errors: [
      { problem: 'Token is reported as invalid', fix: 'A JWT has exactly three parts separated by dots. Remove the "Bearer " prefix and any surrounding quotes.' },
      { problem: 'Token shows as expired', fix: 'The exp claim is in the past. Request a new token; decoding does not verify the signature, so never treat decoded data as trusted.' },
    ],
  },
  'url-codec': {
    metaDescription:
      'Percent-encode or decode URL components with encodeURIComponent and decodeURIComponent. Safely handle spaces, ampersands and non-ASCII text in query strings.',
    features: [
      'Encode and decode in one tool',
      'Uses encodeURIComponent / decodeURIComponent semantics',
      'Handles Unicode characters',
      'Good for query parameters and callback URLs',
    ],
    example: {
      input: 'name=Dara & Co/100%',
      output: 'name%3DDara%20%26%20Co%2F100%25',
      note: 'Reserved characters such as =, & and / become percent codes.',
    },
    errors: [
      { problem: 'URIError: URI malformed when decoding', fix: 'The text contains a lone % that is not followed by two hex digits. Encode a literal percent sign as %25.' },
      { problem: 'Whole URL breaks after encoding', fix: 'Encode only the parameter values, not the full URL, or the :// and / separators are escaped too.' },
    ],
  },
  'regex-tester': {
    metaDescription:
      'Test regular expressions with live match highlighting, capture groups and flag controls. See what a pattern matches before you put it in code.',
    features: [
      'Real-time highlighting of matches',
      'Capture groups listed per match',
      'Flag toggles such as global, case-insensitive and multiline',
      'JavaScript regular expression syntax',
    ],
    example: {
      input: 'Pattern: (\\d{4})-(\\d{2})-(\\d{2})\nText: Released 2026-11-15',
      output: 'Match: 2026-11-15\nGroups: 2026, 11, 15',
      note: 'Three capture groups return the year, month and day.',
    },
    errors: [
      { problem: 'Only the first match is highlighted', fix: 'Turn on the g (global) flag to find every match in the text.' },
      { problem: 'Pattern works elsewhere but not here', fix: 'This tester uses JavaScript regex. Features like possessive quantifiers or some lookbehind forms differ between engines.' },
    ],
  },
  timestamp: {
    metaDescription:
      'Convert Unix timestamps to readable dates and dates back to epoch time across timezones. Decode log lines and database values quickly.',
    features: [
      'Unix seconds and milliseconds to date',
      'Date to Unix timestamp',
      'Timezone-aware display',
      'Helpful for logs, databases and API fields',
    ],
    example: {
      input: '1700000000',
      output: '2023-11-14T22:13:20Z (UTC)',
      note: 'The same instant is shown in the timezone you select.',
    },
    errors: [
      { problem: 'Date lands in the year 1970', fix: 'The value is probably in milliseconds, not seconds, or the other way round. Switch the unit.' },
      { problem: 'Time is off by several hours', fix: 'Check the timezone selector. Unix timestamps are always UTC; only the display changes.' },
    ],
  },
  'json-schema': {
    metaDescription:
      'Validate JSON against a JSON Schema (draft-07) and see every error with its location. Check API payloads and config files against a contract.',
    features: [
      'JSON Schema draft-07 validation',
      'Lists each error with the path to the failing value',
      'Validates required fields, types, enums and ranges',
      'Paste a schema and a document side by side',
    ],
    example: {
      input: 'Schema: {"type":"object","required":["age"],"properties":{"age":{"type":"integer","minimum":0}}}\nData: {"age":"12"}',
      output: '.age should be integer',
      note: 'The string "12" fails the integer type check.',
    },
    errors: [
      { problem: 'should have required property', fix: 'The data is missing a key listed in "required". Add the property or remove it from the schema.' },
      { problem: 'Schema itself is rejected', fix: 'Make sure the schema is valid JSON and uses draft-07 keywords. Newer draft keywords may not be recognised.' },
    ],
  },
  jsonpath: {
    metaDescription:
      'Query nested JSON with JSONPath: property and index access, wildcards, recursive search and simple filters. Results update as you type.',
    features: [
      'Dot and bracket property access',
      'Array indexes, wildcards and recursive descent',
      'Simple comparison filters',
      'Live list of matching values',
    ],
    example: {
      input: '$.store.book[?(@.price < 10)].title',
      output: '["Sayings of the Century", "Moby Dick"]',
      note: 'Returns the titles of books priced under 10 from a store document.',
    },
    errors: [
      { problem: 'No results returned', fix: 'Start the expression with $ and check key spelling; JSONPath keys are case-sensitive.' },
      { problem: 'Filter expression is not understood', fix: 'Only simple comparisons are supported. Break complex logic into separate queries.' },
    ],
  },
  'data-converter': {
    metaDescription:
      'Convert between JSON, YAML, CSV and XML in your browser. Move config or tabular data across formats without writing a script.',
    features: [
      'JSON, YAML, CSV and XML in both directions',
      'Runs locally in the browser',
      'Useful for config migrations and spreadsheet exports',
      'Copy or download the converted data',
    ],
    example: {
      input: '{"name":"Dara","skills":["js","sql"]}',
      output: 'name: Dara\nskills:\n  - js\n  - sql',
      note: 'JSON converted to YAML.',
    },
    errors: [
      { problem: 'CSV conversion fails for nested JSON', fix: 'CSV is flat. Convert an array of simple objects, or flatten nested values first.' },
      { problem: 'XML output has an unexpected root element', fix: 'XML needs exactly one root. Wrap arrays or multiple top-level keys in a single parent object.' },
    ],
  },
  'cron-builder': {
    metaDescription:
      'Explain a five-field cron expression in plain English and preview the next run times in UTC, so scheduled jobs run when you expect.',
    features: [
      'Plain-language description of a cron expression',
      'Preview of upcoming run times in UTC',
      'Five-field cron syntax',
      'Quick checks for ranges, steps and lists',
    ],
    example: {
      input: '0 9 * * 1-5',
      output: 'At 09:00, Monday through Friday',
      note: 'Fields are minute, hour, day of month, month and day of week.',
    },
    errors: [
      { problem: 'Job runs at the wrong hour', fix: 'Previews are in UTC. Convert to your server or local timezone, for example Cambodia is UTC+7.' },
      { problem: 'Expression has six fields', fix: 'Some schedulers add a seconds field. Remove it, because this tool expects the standard five-field format.' },
    ],
  },
  'conversion-calculator': {
    metaDescription:
      'Convert a date and time between IANA timezones, or convert length, weight, temperature and data size. Handy for planning across regions.',
    features: [
      'Timezone conversion using IANA zone names',
      'Length, weight and temperature units',
      'Data size units',
      'Instant results as you type',
    ],
    example: {
      input: '09:00 in Asia/Phnom_Penh',
      output: '02:00 UTC',
      note: 'Cambodia is UTC+7 with no daylight saving. Unit example: 1 km ≈ 0.621 mi.',
    },
    errors: [
      { problem: 'Result is an hour off for a US or EU zone', fix: 'Daylight saving changes the offset by date. Pick the exact date, not just the time.' },
      { problem: 'Data size looks too small or large', fix: 'Check whether you mean decimal (KB = 1000 bytes) or binary (KiB = 1024 bytes) units.' },
    ],
  },
  'text-toolkit': {
    metaDescription:
      'Count words and characters, change letter case, compare two lists and generate Lorem Ipsum text, all in one small text toolkit.',
    features: [
      'Word, character and line counts',
      'Change case: upper, lower and title',
      'Compare two lists',
      'Lorem Ipsum generator',
    ],
    example: {
      input: 'hello world',
      output: 'Words: 2, Characters: 11\nTitle Case: Hello World\nUPPER: HELLO WORLD',
      note: 'Several results from a single input.',
    },
    errors: [
      { problem: 'Character count differs from another editor', fix: 'Trailing spaces, line breaks and emoji are counted differently by different tools. Trim the text if the exact number matters.' },
      { problem: 'List comparison shows false differences', fix: 'Check for extra spaces or different letter case at the start or end of the lines.' },
    ],
  },
  'encoding-toolkit': {
    metaDescription:
      'Encode or decode HTML entities, UTF-8 hex and gzip data in your browser. Inspect escaped markup or compressed payloads.',
    features: [
      'HTML entity encode and decode',
      'UTF-8 to hex and back',
      'Gzip compress and decompress',
      'Runs locally',
    ],
    example: {
      input: '<p>Hi</p>',
      output: '&lt;p&gt;Hi&lt;/p&gt;',
      note: 'HTML entities. In hex mode, "Hi" becomes 48 69.',
    },
    errors: [
      { problem: 'Gzip decode fails', fix: 'The input must be valid gzip data in the expected text form, such as Base64 or hex. Check that nothing was truncated.' },
      { problem: 'Hex decode shows garbled characters', fix: 'Use whole bytes (two hex digits each) and make sure the original text was UTF-8 encoded.' },
    ],
  },
  'api-tester': {
    metaDescription:
      'Send HTTP requests from your browser and inspect status, headers and body. A lightweight way to try an endpoint, subject to CORS.',
    features: [
      'Choose method, URL, headers and body',
      'Shows response status, headers and body',
      'Warnings for credentials in headers and plain HTTP URLs',
      'No separate client to install',
    ],
    example: {
      input: 'GET https://api.example.com/users/1',
      output: '200 OK\ncontent-type: application/json\n{"id":1,"name":"Dara"}',
      note: 'Illustrative request and response.',
    },
    errors: [
      { problem: 'Failed to fetch / CORS error', fix: 'Browsers only show responses from servers that allow cross-origin requests. Ask the API owner to enable CORS, or test from a server-side client like cURL.' },
      { problem: 'Mixed content blocked', fix: 'An HTTP URL cannot be called from an HTTPS page. Use an HTTPS endpoint.' },
    ],
  },
  'ip-cidr': {
    metaDescription:
      'Calculate IPv4 CIDR details: network address, broadcast address, subnet mask and usable host range. Plan subnets without a spreadsheet.',
    features: [
      'Network and broadcast addresses',
      'Subnet mask and usable host range',
      'Host counts for each prefix length',
      'IPv4 address inspection',
    ],
    example: {
      input: '192.168.10.0/24',
      output: 'Network: 192.168.10.0\nBroadcast: 192.168.10.255\nUsable: 192.168.10.1 – 192.168.10.254 (254 hosts)',
      note: 'A /24 has 256 addresses, two of which are reserved.',
    },
    errors: [
      { problem: 'Invalid address or prefix', fix: 'Each IPv4 octet must be 0–255 and the prefix 0–32, written like 10.0.0.0/16.' },
      { problem: 'Host address is not the network address', fix: 'An address such as 192.168.10.37/24 belongs to network 192.168.10.0. The tool shows the network it falls in.' },
    ],
  },
  'certificate-inspector': {
    metaDescription:
      'Inspect a PEM-encoded X.509 certificate: subject, issuer, validity dates, signature algorithm and subject alternative names.',
    features: [
      'Subject and issuer details',
      'Validity start and end dates',
      'Signature algorithm',
      'Subject alternative names (SANs)',
    ],
    example: {
      input: '-----BEGIN CERTIFICATE-----\nMIIF…\n-----END CERTIFICATE-----',
      output: 'Subject: CN=example.com\nIssuer: …\nValid: 2026-01-01 → 2026-04-01\nSANs: example.com, www.example.com',
      note: 'Illustrative output for a pasted certificate.',
    },
    errors: [
      { problem: 'Could not parse certificate', fix: 'Paste the full PEM including the BEGIN and END CERTIFICATE lines. A private key or CSR is a different format.' },
      { problem: 'Hostname not listed', fix: 'Browsers check the SAN list, not only the common name. Reissue the certificate with the missing hostname.' },
    ],
  },
  'json-to-ts': {
    metaDescription:
      'Generate TypeScript, Go, Python, Pydantic, Rust or Zod types from a sample JSON object. Stop hand-writing models from API responses.',
    features: [
      'TypeScript, Go, Python, Pydantic, Rust, Zod and Dart output',
      'Nested objects become named types',
      'Arrays are typed from their items',
      'Paste a sample response and copy the result',
    ],
    example: {
      input: '{"id":1,"name":"Dara","tags":["a","b"]}',
      output: 'interface Root {\n  id: number;\n  name: string;\n  tags: string[];\n}',
      note: 'TypeScript output. Other languages follow their own conventions.',
    },
    errors: [
      { problem: 'A field is typed as null or any', fix: 'The sample contained null or an empty array. Use a sample with real values so the type can be inferred.' },
      { problem: 'Optional fields are required in the output', fix: 'Types come from one sample. Mark fields as optional by hand if some responses omit them.' },
    ],
  },
  'json-to-java': {
    metaDescription:
      'Generate Java POJO classes, Kotlin data classes or C# models from JSON. Paste a sample payload and get ready-to-use model code.',
    features: [
      'Java POJOs, Kotlin data classes and C# classes',
      'Nested objects become separate Java, Kotlin or C# classes',
      'Lists mapped to the language collection type',
      'Copy-ready code',
    ],
    example: {
      input: '{"id":1,"name":"Dara"}',
      output: 'public class Root {\n  private int id;\n  private String name;\n  // getters and setters\n}',
      note: 'Java output; Kotlin gives a data class and C# a class with properties.',
    },
    errors: [
      { problem: 'Class name is generic (Root)', fix: 'Rename the root class after copying to match your domain model.' },
      { problem: 'Numbers are typed as int but need long or double', fix: 'Samples with small numbers infer int. Edit the type, or include a realistic large or decimal value in the sample.' },
    ],
  },
  'json-to-dart': {
    metaDescription:
      'Generate Dart model classes from a JSON object for Flutter apps. Paste an API response and copy the class with its fields.',
    features: [
      'Dart classes with typed fields',
      'Each nested object gets its own Dart class',
      'Lists typed from their items',
      'Aimed at Flutter and Dart API clients',
    ],
    example: {
      input: '{"id":1,"title":"Hello"}',
      output: 'class Post {\n  final int id;\n  final String title;\n  Post({required this.id, required this.title});\n}',
      note: 'Illustrative Dart output.',
    },
    errors: [
      { problem: 'Null safety errors in Flutter', fix: 'Fields missing from some responses should be nullable (String?). Adjust the types after generating.' },
      { problem: 'Snake_case keys give odd field names', fix: 'Rename fields to camelCase and map them in fromJson if your style guide requires it.' },
    ],
  },
  'curl-generator': {
    metaDescription:
      'Build cURL commands from a form: method, URL, headers, body and authentication. Copy a correct command to run or share.',
    features: [
      'Method, URL, headers and body fields',
      'Authentication options',
      'Properly quoted command output',
      'Copy the command straight into a terminal',
    ],
    example: {
      input: 'POST https://api.example.com/users, header Content-Type: application/json, body {"name":"Dara"}',
      output: "curl -X POST 'https://api.example.com/users' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\":\"Dara\"}'",
      note: 'A multi-line command that can be pasted into a terminal.',
    },
    errors: [
      { problem: 'Server returns 415 Unsupported Media Type', fix: 'Add a Content-Type header that matches the body, such as application/json.' },
      { problem: 'Quotes break in Windows cmd', fix: 'The command uses Unix-style single quotes. In Windows cmd, use double quotes or run it in PowerShell, Git Bash or WSL.' },
    ],
  },
  'sql-builder': {
    metaDescription:
      'Visually build SELECT, INSERT, UPDATE and DELETE statements and export formatted SQL, without memorising every clause.',
    features: [
      'SELECT, INSERT, UPDATE and DELETE builders',
      'Add columns, conditions and ordering through the form',
      'Formatted SQL output',
      'Copy into your client or code',
    ],
    example: {
      input: 'Table users, columns id and name, where active = 1, order by name',
      output: 'SELECT id, name\nFROM users\nWHERE active = 1\nORDER BY name;',
      note: 'The builder assembles the clauses in valid order.',
    },
    errors: [
      { problem: 'UPDATE or DELETE affects every row', fix: 'Always add a WHERE condition. Without one the statement applies to the whole table.' },
      { problem: 'Column or table name rejected by the database', fix: 'Quote names that are reserved words or contain spaces, using the quoting style of your database.' },
    ],
  },
  'pdf-word-converter': {
    metaDescription:
      'Convert selectable-text PDFs to Word and Word documents to PDF locally in your browser. Best for text-based files, not scanned pages.',
    features: [
      'PDF text to Word (.docx)',
      'Word to PDF',
      'Converted in your browser',
      'Download the result directly',
    ],
    example: {
      input: 'contract.pdf (selectable text)',
      output: 'contract.docx',
      note: 'The text content is carried over; complex layouts may need touching up in Word.',
    },
    errors: [
      { problem: 'Output Word file is empty', fix: 'The PDF is probably a scan, which is an image with no selectable text. Use an OCR tool first.' },
      { problem: 'Layout does not match the original', fix: 'Conversion keeps text rather than exact design. Check tables and columns after converting.' },
    ],
  },
  'image-to-pdf': {
    metaDescription:
      'Convert an image to a downloadable PDF in your browser. Turn photos, scans and screenshots into a PDF for upload forms that only accept PDF.',
    features: [
      'JPEG and PNG images to PDF',
      'Created locally in the browser',
      'Instant download',
      'No account needed',
    ],
    example: {
      input: 'receipt.jpg',
      output: 'receipt.pdf',
      note: 'The image becomes a single-page PDF.',
    },
    errors: [
      { problem: 'Image will not load', fix: 'Use a common format such as JPG or PNG. Convert HEIC photos to JPG first.' },
      { problem: 'PDF is too large to upload', fix: 'Reduce the image size first with the Image Resizer & Compressor, then convert it.' },
    ],
  },
  'image-to-word': {
    metaDescription:
      'Place one or more images into a Word (.docx) document, one after another, and download it. Quick way to assemble screenshots into a report.',
    features: [
      'One or several images per document',
      'Images are added in order',
      'Downloads a .docx file',
      'Built in your browser',
    ],
    example: {
      input: 'step1.png, step2.png, step3.png',
      output: 'steps.docx with three images in sequence',
      note: 'Useful for how-to guides and bug reports.',
    },
    errors: [
      { problem: 'Images appear in the wrong order', fix: 'Add them in the order you want them to appear, or remove and re-add the out-of-order image.' },
      { problem: 'Word file is very large', fix: 'Compress the images before adding them, because the originals are embedded at full size.' },
    ],
  },
};

export function getToolDetails(slug: string): ToolDetails | undefined {
  return D[slug];
}
