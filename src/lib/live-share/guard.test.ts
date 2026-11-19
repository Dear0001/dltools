import { describe, expect, it } from 'vitest';
import { classifyTarget, shouldBlockInteraction as block } from './guard';

describe('viewer interaction guard', () => {
  it('lets viewers place a caret, select and navigate inside text fields', () => {
    expect(block({ interaction: 'click', target: 'text' })).toBe(false);
    expect(block({ interaction: 'mousedown', target: 'text' })).toBe(false);
    for (const key of ['ArrowDown', 'Home', 'PageUp', 'Tab', 'Shift']) expect(block({ interaction: 'keydown', target: 'text', key })).toBe(false);
    expect(block({ interaction: 'keydown', target: 'text', key: 'c', ctrlOrMeta: true })).toBe(false); // copy
    expect(block({ interaction: 'keydown', target: 'text', key: 'a', ctrlOrMeta: true })).toBe(false); // select all
  });

  it('blocks every way of editing a text field', () => {
    for (const key of ['a', 'Z', '1', ' ', 'Enter', 'Backspace', 'Delete']) expect(block({ interaction: 'keydown', target: 'text', key }), key).toBe(true);
    for (const key of ['x', 'v', 'z', 'y']) expect(block({ interaction: 'keydown', target: 'text', key, ctrlOrMeta: true }), `ctrl+${key}`).toBe(true);
    expect(block({ interaction: 'edit', target: 'text' })).toBe(true); // paste / cut / drop / beforeinput
  });

  it('blocks toggling buttons, selects, checkboxes and tabs by mouse and keyboard', () => {
    expect(block({ interaction: 'click', target: 'control' })).toBe(true);
    expect(block({ interaction: 'mousedown', target: 'control' })).toBe(true); // keeps <select> from opening
    for (const key of [' ', 'Enter', 'ArrowDown', 'ArrowLeft']) expect(block({ interaction: 'keydown', target: 'control', key }), key).toBe(true);
    expect(block({ interaction: 'keydown', target: 'control', key: 'Tab' })).toBe(false); // keyboard users can still move around
  });

  it('never blocks controls marked data-live-safe (copy, zoom, local help)', () => {
    expect(block({ interaction: 'click', target: 'control', safe: true })).toBe(false);
    expect(block({ interaction: 'keydown', target: 'control', key: 'Enter', safe: true })).toBe(false);
    expect(block({ interaction: 'edit', target: 'text', safe: true })).toBe(false);
  });

  it('classifies targets', () => {
    expect(classifyTarget('TEXTAREA', undefined)).toBe('text');
    expect(classifyTarget('input', 'text')).toBe('text');
    expect(classifyTarget('input', undefined)).toBe('text');
    expect(classifyTarget('input', 'checkbox')).toBe('control');
    expect(classifyTarget('input', 'radio')).toBe('control');
    expect(classifyTarget('select', undefined)).toBe('control');
    expect(classifyTarget('button', undefined)).toBe('control');
  });
});
