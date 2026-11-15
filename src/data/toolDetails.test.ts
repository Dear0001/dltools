import { describe, expect, it } from 'vitest';
import { TOOLS, getToolSlug } from './tools';
import { getToolDetails } from './toolDetails';

describe('tool SEO details', () => {
  const all = TOOLS.map((t) => [getToolSlug(t), getToolDetails(getToolSlug(t))] as const);

  it.each(all)('%s has complete, bounded details', (_slug, d) => {
    expect(d, 'details').toBeDefined();
    expect(d!.metaDescription.length).toBeGreaterThanOrEqual(100);
    expect(d!.metaDescription.length).toBeLessThanOrEqual(165);
    expect(d!.features.length).toBeGreaterThanOrEqual(3);
    expect(d!.errors.length).toBeGreaterThanOrEqual(2);
    expect(d!.example.input.length).toBeGreaterThan(0);
    expect(d!.example.output.length).toBeGreaterThan(0);
  });

  it('never repeats a description, example or error across tools', () => {
    const seen = (pick: (d: NonNullable<ReturnType<typeof getToolDetails>>) => string[]) => {
      const values = all.flatMap(([, d]) => pick(d!));
      return values.length - new Set(values).size;
    };
    expect(seen((d) => [d.metaDescription])).toBe(0);
    expect(seen((d) => [d.example.input + d.example.output])).toBe(0);
    expect(seen((d) => d.errors.map((e) => e.problem))).toBe(0);
    expect(seen((d) => d.features)).toBe(0);
  });
});
