/**
 * Tests for src/lib/projects/slug.ts
 * ADR-19, NFR-08
 *
 * Strict TDD: this file is written RED before the impl exists.
 */
import { describe, it, expect } from 'vitest';
import { slugify } from '../../src/lib/projects/slug';

describe('slugify', () => {
  it('"Hello World" → "hello-world"', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('"Aplicación Móvil" → "aplicacion-movil" (NFD + combining mark strip)', () => {
    expect(slugify('Aplicación Móvil')).toBe('aplicacion-movil');
  });

  it('"  Trailing-Dashes-  " → "trailing-dashes" (trim + collapse)', () => {
    expect(slugify('  Trailing-Dashes-  ')).toBe('trailing-dashes');
  });

  it('"Special!@#$%^&*Chars" → "special-chars"', () => {
    expect(slugify('Special!@#$%^&*Chars')).toBe('special-chars');
  });

  it('very long input → 80 char cap', () => {
    const longInput = 'a'.repeat(200);
    expect(slugify(longInput)).toHaveLength(80);
  });

  it('80 char input is not truncated', () => {
    const input = 'a'.repeat(80);
    expect(slugify(input)).toHaveLength(80);
  });

  it('81 char input is truncated to 80', () => {
    const input = 'a'.repeat(81);
    expect(slugify(input)).toHaveLength(80);
  });

  it('empty string → empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('emoji-only input → empty string (no latin chars remain)', () => {
    expect(slugify('🚀🎉🦊')).toBe('');
  });

  it('"éclair" → "eclair" (accent stripping)', () => {
    expect(slugify('éclair')).toBe('eclair');
  });

  it('multiple consecutive spaces → single dash', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('leading and trailing dashes are removed', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('"café au lait" → "cafe-au-lait"', () => {
    expect(slugify('café au lait')).toBe('cafe-au-lait');
  });
});
