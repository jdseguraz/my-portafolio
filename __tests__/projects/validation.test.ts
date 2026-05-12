/**
 * Tests for src/lib/projects/validation.ts
 * FR-70, FR-71, FR-72, FR-73, FR-74, NFR-08, ADR-20
 *
 * Strict TDD: this file is written RED before the impl exists.
 */
import { describe, it, expect } from 'vitest';
import { validateForPublish } from '../../src/lib/projects/validation';

/** A complete valid project input (with cover for FR-95) */
const VALID_PROJECT = {
  title_en: 'My Project',
  title_es: 'Mi Proyecto',
  subtitle_en: 'A great project',
  subtitle_es: 'Un gran proyecto',
  description_en: 'Description in English',
  description_es: 'Descripción en español',
  slug: 'my-project',
  cover_image_url: 'https://example.com/cover.webp',
  tags: [],
  display_order: 0,
  published: true,
};

describe('validateForPublish', () => {
  it('returns { ok: true } when all required fields are filled', () => {
    expect(validateForPublish(VALID_PROJECT)).toEqual({ ok: true });
  });

  it('returns { ok: false } with error on missing title_en', () => {
    const result = validateForPublish({ ...VALID_PROJECT, title_en: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title_en).toBe('Required to publish');
    }
  });

  it('returns { ok: false } with error on missing title_es', () => {
    const result = validateForPublish({ ...VALID_PROJECT, title_es: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title_es).toBe('Required to publish');
    }
  });

  it('returns { ok: false } with error on missing subtitle_en', () => {
    const result = validateForPublish({ ...VALID_PROJECT, subtitle_en: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.subtitle_en).toBe('Required to publish');
    }
  });

  it('returns { ok: false } with error on missing subtitle_es', () => {
    const result = validateForPublish({ ...VALID_PROJECT, subtitle_es: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.subtitle_es).toBe('Required to publish');
    }
  });

  it('returns { ok: false } with error on missing description_en', () => {
    const result = validateForPublish({ ...VALID_PROJECT, description_en: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.description_en).toBe('Required to publish');
    }
  });

  it('returns { ok: false } with error on missing description_es', () => {
    const result = validateForPublish({ ...VALID_PROJECT, description_es: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.description_es).toBe('Required to publish');
    }
  });

  it('returns { ok: false } with error on missing slug', () => {
    const result = validateForPublish({ ...VALID_PROJECT, slug: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.slug).toBe('Required');
    }
  });

  it('cover_image_url being empty BLOCKS publishing (FR-95, fase 2)', () => {
    const result = validateForPublish({ ...VALID_PROJECT, cover_image_url: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.cover_image_url).toBe('Cover image required to publish');
    }
  });

  it('cover_image_url being null BLOCKS publishing', () => {
    const result = validateForPublish({ ...VALID_PROJECT, cover_image_url: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.cover_image_url).toBe('Cover image required to publish');
    }
  });

  it('whitespace-only cover_image_url BLOCKS publishing', () => {
    const result = validateForPublish({ ...VALID_PROJECT, cover_image_url: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.cover_image_url).toBe('Cover image required to publish');
    }
  });

  it('valid cover_image_url does NOT block publishing', () => {
    const result = validateForPublish({
      ...VALID_PROJECT,
      cover_image_url: 'https://example.com/cover.webp',
    });
    expect(result.ok).toBe(true);
  });

  it('whitespace-only fields are treated as empty (title_en)', () => {
    const result = validateForPublish({ ...VALID_PROJECT, title_en: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title_en).toBe('Required to publish');
    }
  });

  it('whitespace-only fields are treated as empty (slug)', () => {
    const result = validateForPublish({ ...VALID_PROJECT, slug: '  ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.slug).toBe('Required');
    }
  });

  it('returns all errors when several fields are missing', () => {
    const result = validateForPublish({
      ...VALID_PROJECT,
      title_en: '',
      title_es: '',
      description_en: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title_en).toBeDefined();
      expect(result.errors.title_es).toBeDefined();
      expect(result.errors.description_en).toBeDefined();
    }
  });
});
