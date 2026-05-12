/**
 * Tests for src/lib/storage/upload.ts
 * FR-83, FR-84, FR-85, ADR-32, ADR-33, NFR-18
 *
 * RED: This file is committed BEFORE the implementation module exists.
 * Run `npm run test:run -- upload-validation` — expect FAIL.
 */

import { describe, it, expect } from 'vitest';
import {
  validateFile,
  mimeToExt,
  buildCoverPath,
  buildGalleryPath,
  parseCoverExtFromUrl,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '@/lib/storage/upload';

// ── Constants ──────────────────────────────────────────────────────────────

describe('MAX_FILE_SIZE_BYTES', () => {
  it('equals 5_242_880 (5 MiB)', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(5_242_880);
  });
});

describe('ALLOWED_MIME_TYPES', () => {
  it('contains exactly jpeg, png, webp', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
    expect(ALLOWED_MIME_TYPES).toHaveLength(3);
  });
});

// ── validateFile ───────────────────────────────────────────────────────────

describe('validateFile', () => {
  it('accepts a file at exactly 5 242 880 bytes (boundary ok)', () => {
    expect(validateFile(5_242_880, 'image/jpeg')).toEqual({ ok: true });
  });

  it('rejects a file at 5 242 881 bytes with "File too large"', () => {
    const result = validateFile(5_242_881, 'image/jpeg');
    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/too large/i);
  });

  it('rejects an empty file (size 0) with "Empty file"', () => {
    const result = validateFile(0, 'image/jpeg');
    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/empty/i);
  });

  it('accepts image/jpeg', () => {
    expect(validateFile(1000, 'image/jpeg')).toEqual({ ok: true });
  });

  it('accepts image/png', () => {
    expect(validateFile(1000, 'image/png')).toEqual({ ok: true });
  });

  it('accepts image/webp', () => {
    expect(validateFile(1000, 'image/webp')).toEqual({ ok: true });
  });

  it('rejects image/gif', () => {
    const result = validateFile(1000, 'image/gif');
    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/not allowed|unsupported/i);
  });

  it('rejects image/svg+xml', () => {
    const result = validateFile(1000, 'image/svg+xml');
    expect(result).toMatchObject({ ok: false });
  });
});

// ── mimeToExt ──────────────────────────────────────────────────────────────

describe('mimeToExt', () => {
  it('maps image/jpeg → "jpg"', () => {
    expect(mimeToExt('image/jpeg')).toBe('jpg');
  });

  it('maps image/png → "png"', () => {
    expect(mimeToExt('image/png')).toBe('png');
  });

  it('maps image/webp → "webp"', () => {
    expect(mimeToExt('image/webp')).toBe('webp');
  });

  it('returns null for image/gif (not in allowlist)', () => {
    expect(mimeToExt('image/gif')).toBeNull();
  });

  it('returns null for unknown MIME', () => {
    expect(mimeToExt('application/pdf')).toBeNull();
  });
});

// ── buildCoverPath ─────────────────────────────────────────────────────────

describe('buildCoverPath', () => {
  it('returns "{projectId}/cover.{ext}"', () => {
    expect(buildCoverPath('abc', 'jpg')).toBe('abc/cover.jpg');
  });

  it('works with webp extension', () => {
    expect(buildCoverPath('proj-123', 'webp')).toBe('proj-123/cover.webp');
  });
});

// ── buildGalleryPath ───────────────────────────────────────────────────────

describe('buildGalleryPath', () => {
  it('matches "{projectId}/gallery/{uuid}.{ext}"', () => {
    const result = buildGalleryPath('abc', 'webp');
    expect(result).toMatch(
      /^abc\/gallery\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/,
    );
  });

  it('generates a different UUID on each call', () => {
    const a = buildGalleryPath('abc', 'jpg');
    const b = buildGalleryPath('abc', 'jpg');
    expect(a).not.toBe(b);
  });
});

// ── parseCoverExtFromUrl ────────────────────────────────────────────────────

describe('parseCoverExtFromUrl', () => {
  it('extracts extension from a full public Supabase URL', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/project-images/abc/cover.png';
    expect(parseCoverExtFromUrl(url)).toBe('png');
  });

  it('extracts jpg extension', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/project-images/abc/cover.jpg';
    expect(parseCoverExtFromUrl(url)).toBe('jpg');
  });

  it('extracts webp extension', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/project-images/abc/cover.webp';
    expect(parseCoverExtFromUrl(url)).toBe('webp');
  });

  it('returns null for URLs with no /cover.{ext} segment', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/project-images/abc/gallery/uuid.png';
    expect(parseCoverExtFromUrl(url)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCoverExtFromUrl('')).toBeNull();
  });
});
