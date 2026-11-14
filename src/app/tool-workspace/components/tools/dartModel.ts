/**
 * Generates Dart model classes with `fromJson` / `toJson` from a JSON object.
 * Field names follow Dart's lowerCamelCase convention; the original JSON keys are kept in the mapping.
 */

type JsonObject = Record<string, unknown>;

const DART_RESERVED = new Set([
  'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'covariant',
  'default', 'deferred', 'do', 'dynamic', 'else', 'enum', 'export', 'extends', 'extension', 'external', 'factory',
  'false', 'final', 'finally', 'for', 'function', 'get', 'hide', 'if', 'implements', 'import', 'in', 'interface', 'is',
  'late', 'library', 'mixin', 'new', 'null', 'on', 'operator', 'part', 'required', 'rethrow', 'return', 'set', 'show',
  'static', 'super', 'switch', 'sync', 'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield',
]);

const isObject = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function dartClassName(name: string): string {
  const value = name.replace(/[^a-zA-Z0-9]+(.)/g, (_m, char: string) => char.toUpperCase()).replace(/^[a-z]/, (char) => char.toUpperCase()) || 'Model';
  return /^[A-Za-z_]/.test(value) ? value : `Model${value}`;
}

export function dartFieldName(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const value = words.map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase())).join('') || 'field';
  const valid = /^\d/.test(value) ? `field${value}` : value;
  return DART_RESERVED.has(valid) ? `${valid}Value` : valid;
}

const dartString = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')}'`;

interface FieldPlan {
  key: string;
  name: string;
  type: string;
  fromJson: (access: string) => string;
  toJson: (name: string) => string;
}

function plan(value: unknown, key: string): Omit<FieldPlan, 'key' | 'name'> {
  if (value === null || value === undefined) return { type: 'dynamic', fromJson: (a) => a, toJson: (n) => n };
  if (typeof value === 'string') return { type: 'String', fromJson: (a) => `${a} as String`, toJson: (n) => n };
  if (typeof value === 'boolean') return { type: 'bool', fromJson: (a) => `${a} as bool`, toJson: (n) => n };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { type: 'int', fromJson: (a) => `(${a} as num).toInt()`, toJson: (n) => n }
      : { type: 'double', fromJson: (a) => `(${a} as num).toDouble()`, toJson: (n) => n };
  }
  if (Array.isArray(value)) {
    const sample = value.find((item) => item !== null && item !== undefined);
    if (sample === undefined) return { type: 'List<dynamic>', fromJson: (a) => `${a} as List<dynamic>`, toJson: (n) => n };
    const item = plan(sample, `${key}Item`);
    const nested = isObject(sample) || Array.isArray(sample);
    return {
      type: `List<${item.type}>`,
      fromJson: (a) => `(${a} as List<dynamic>).map((e) => ${item.fromJson('e')}).toList()`,
      toJson: (n) => (nested ? `${n}.map((e) => ${item.toJson('e')}).toList()` : n),
    };
  }
  if (isObject(value)) {
    const className = dartClassName(key);
    return { type: className, fromJson: (a) => `${className}.fromJson(${a} as Map<String, dynamic>)`, toJson: (n) => `${n}.toJson()` };
  }
  return { type: 'dynamic', fromJson: (a) => a, toJson: (n) => n };
}

export function generateDartModels(value: unknown, rootName: string): string {
  if (!isObject(value)) throw new Error('The root JSON value must be an object.');

  // Nested objects become their own classes; array items are named "<Key>Item".
  const classes = new Map<string, JsonObject>();
  const collect = (name: string, object: JsonObject) => {
    const className = dartClassName(name);
    if (classes.has(className)) return;
    classes.set(className, object);
    for (const [key, field] of Object.entries(object)) {
      if (isObject(field)) collect(key, field);
      if (Array.isArray(field)) {
        const nested = field.find(isObject);
        if (nested) collect(`${key}Item`, nested);
      }
    }
  };
  collect(rootName, value);

  const render = (className: string, object: JsonObject) => {
    const used = new Set<string>();
    const fields: FieldPlan[] = Object.entries(object).map(([key, field]) => {
      let name = dartFieldName(key);
      while (used.has(name)) name = `${name}_`;
      used.add(name);
      return { key, name, ...plan(field, key) };
    });
    if (!fields.length) {
      return `class ${className} {\n  const ${className}();\n\n  factory ${className}.fromJson(Map<String, dynamic> json) => const ${className}();\n\n  Map<String, dynamic> toJson() => {};\n}`;
    }
    return [
      `class ${className} {`,
      ...fields.map((f) => `  final ${f.type} ${f.name};`),
      '',
      `  const ${className}({`,
      ...fields.map((f) => `    required this.${f.name},`),
      '  });',
      '',
      `  factory ${className}.fromJson(Map<String, dynamic> json) => ${className}(`,
      ...fields.map((f) => `        ${f.name}: ${f.fromJson(`json[${dartString(f.key)}]`)},`),
      '      );',
      '',
      '  Map<String, dynamic> toJson() => {',
      ...fields.map((f) => `        ${dartString(f.key)}: ${f.toJson(f.name)},`),
      '      };',
      '}',
    ].join('\n');
  };

  return Array.from(classes.entries()).reverse().map(([className, object]) => render(className, object)).join('\n\n');
}
