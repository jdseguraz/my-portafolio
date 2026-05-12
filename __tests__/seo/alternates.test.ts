/**
 * Tests for src/lib/seo/alternates.ts
 * ADR-68, ADR-69, NFR-43
 * Strict TDD — RED phase
 *
 * buildAlternates(canonicalPath: string, currentLocale: 'en' | 'es')
 * Pure function, no imports of next-intl, no async.
 *
 * x-default ALWAYS = /es/<path> (defaultLocale: 'es' per routing.ts)
 */
import { describe, it, expect } from 'vitest';
import { buildAlternates } from '../../src/lib/seo/alternates';

describe('buildAlternates — empty path (homepage)', () => {
  it('locale=en: canonical = /en, all locales present, x-default = /es', () => {
    const result = buildAlternates('', 'en');
    expect(result.canonical).toBe('/en');
    expect((result.languages as Record<string, string>)['en']).toBe('/en');
    expect((result.languages as Record<string, string>)['es']).toBe('/es');
    expect((result.languages as Record<string, string>)['x-default']).toBe('/es');
  });

  it('locale=es: canonical = /es, x-default still = /es', () => {
    const result = buildAlternates('', 'es');
    expect(result.canonical).toBe('/es');
    expect((result.languages as Record<string, string>)['en']).toBe('/en');
    expect((result.languages as Record<string, string>)['es']).toBe('/es');
    expect((result.languages as Record<string, string>)['x-default']).toBe('/es');
  });
});

describe('buildAlternates — project path', () => {
  it('locale=en: canonical = /en/projects/anime-app', () => {
    const result = buildAlternates('projects/anime-app', 'en');
    expect(result.canonical).toBe('/en/projects/anime-app');
    expect((result.languages as Record<string, string>)['en']).toBe('/en/projects/anime-app');
    expect((result.languages as Record<string, string>)['es']).toBe('/es/projects/anime-app');
    expect((result.languages as Record<string, string>)['x-default']).toBe('/es/projects/anime-app');
  });
});

describe('buildAlternates — defensive normalization', () => {
  it('leading slash stripped: /projects/foo → same as projects/foo', () => {
    const result = buildAlternates('/projects/foo', 'en');
    expect(result.canonical).toBe('/en/projects/foo');
    expect((result.languages as Record<string, string>)['es']).toBe('/es/projects/foo');
    expect((result.languages as Record<string, string>)['x-default']).toBe('/es/projects/foo');
  });

  it('trailing slash stripped: projects/foo/ → same as projects/foo', () => {
    const result = buildAlternates('projects/foo/', 'en');
    expect(result.canonical).toBe('/en/projects/foo');
    expect((result.languages as Record<string, string>)['es']).toBe('/es/projects/foo');
  });
});

describe('buildAlternates — x-default invariant', () => {
  it('x-default always = /es/<path> regardless of currentLocale', () => {
    const en = buildAlternates('projects/bar', 'en');
    const es = buildAlternates('projects/bar', 'es');
    expect((en.languages as Record<string, string>)['x-default']).toBe('/es/projects/bar');
    expect((es.languages as Record<string, string>)['x-default']).toBe('/es/projects/bar');
  });
});
