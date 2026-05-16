/**
 * Tests for src/lib/i18n/fallback.ts
 * FR-75, FR-76, NFR-08, ADR-18
 */
import { describe, it, expect } from 'vitest';
import { getLocalizedField } from '../../src/lib/i18n/fallback';

describe('getLocalizedField', () => {
  it('returns the primary locale value when it is non-empty', () => {
    expect(getLocalizedField({ title_en: 'X', title_es: 'Y' }, 'title', 'en')).toBe('X');
  });

  it('falls back to the other locale when primary is empty', () => {
    expect(getLocalizedField({ title_en: '', title_es: 'Y' }, 'title', 'en')).toBe('Y');
  });

  it('returns empty string when both locales are empty', () => {
    expect(getLocalizedField({ title_en: '', title_es: '' }, 'title', 'en')).toBe('');
  });

  it('returns the es value when locale is "es"', () => {
    expect(getLocalizedField({ title_en: 'X', title_es: 'Y' }, 'title', 'es')).toBe('Y');
  });

  it('falls back to en when es is empty', () => {
    expect(getLocalizedField({ title_en: 'X', title_es: '' }, 'title', 'es')).toBe('X');
  });

  it('returns empty string when the keys do not exist on the row', () => {
    expect(getLocalizedField({}, 'title', 'en')).toBe('');
  });

  it('treats non-string values as missing and falls back', () => {
    // E.g., a Supabase row where the column is null
    expect(getLocalizedField({ title_en: null, title_es: 'fallback' }, 'title', 'en')).toBe(
      'fallback',
    );
  });

  it('works with arbitrary base keys (subtitle, description)', () => {
    expect(
      getLocalizedField({ subtitle_en: 'A', subtitle_es: 'B' }, 'subtitle', 'en'),
    ).toBe('A');
    expect(
      getLocalizedField({ description_en: '', description_es: 'D' }, 'description', 'en'),
    ).toBe('D');
  });

  it('does not throw on any valid input', () => {
    expect(() => getLocalizedField({ title_en: '', title_es: '' }, 'title', 'en')).not.toThrow();
    expect(() => getLocalizedField({}, 'title', 'es')).not.toThrow();
  });
});
