/**
 * src/lib/storage/upload.ts
 * Pure file validation and storage path utilities.
 * FR-83, FR-84, FR-85 — ADR-32, ADR-33.
 *
 * NO 'server-only' import — this module is shared between:
 *  - Client components (accept attribute list, pre-submit size check)
 *  - Server Actions (validation before Storage call)
 *  - Vitest (unit tests, no mocking needed)
 */

// ── Constants ──────────────────────────────────────────────────────────────

/**
 * Maximum allowed file size in bytes (5 MiB).
 * Must match `file_size_limit` on the `project-images` bucket
 * in supabase/migrations/0002_storage_constraints_and_rls.sql.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5_242_880

/**
 * Canonical MIME allowlist (FR-83, ADR-32).
 * Used for: bucket constraint, SA validation, client <input accept>, and mimeToExt mapping.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

// ── Types ──────────────────────────────────────────────────────────────────

export type ValidationResult = { ok: true } | { ok: false; error: string };

// ── validateFile ───────────────────────────────────────────────────────────

/**
 * Validate a file by size and MIME type.
 * Returns { ok: true } if valid, { ok: false, error } otherwise.
 * This is Layer 2 of the three-layer validation (ADR-30).
 */
export function validateFile(size: number, mime: string): ValidationResult {
  if (size === 0) {
    return { ok: false, error: 'Empty file' };
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: 'File too large' };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, error: 'MIME not allowed' };
  }
  return { ok: true };
}

// ── mimeToExt ──────────────────────────────────────────────────────────────

/**
 * Map a MIME type to its canonical file extension.
 * Returns null for unknown / disallowed MIME types (caller must handle).
 * Extension is derived server-side from MIME — never from the filename (ADR-32).
 */
export function mimeToExt(mime: string): 'jpg' | 'png' | 'webp' | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

// ── Path builders ──────────────────────────────────────────────────────────

/**
 * Build the bucket-relative storage path for a project cover image.
 * Example: buildCoverPath('abc', 'jpg') → 'abc/cover.jpg'
 * The path is relative to the `project-images` bucket root.
 * FR-85, ADR-34.
 */
export function buildCoverPath(projectId: string, ext: string): string {
  return `${projectId}/cover.${ext}`;
}

/**
 * Build a bucket-relative storage path for a gallery image.
 * Uses crypto.randomUUID() (ADR-33) to generate a unique filename on each call.
 * Example: buildGalleryPath('abc', 'webp') → 'abc/gallery/<uuid>.webp'
 * The path is relative to the `project-images` bucket root.
 * FR-85, ADR-33.
 */
export function buildGalleryPath(projectId: string, ext: string): string {
  return `${projectId}/gallery/${crypto.randomUUID()}.${ext}`;
}

// ── parseCoverExtFromUrl ────────────────────────────────────────────────────

/**
 * Extract the file extension from a public Supabase Storage cover URL.
 * Used by doCoverUpload (upload-internals.ts) to detect old-ext cleanup (ADR-34).
 *
 * Matches the `/cover.{ext}` segment in the URL path.
 * Returns 'jpg' | 'png' | 'webp' if found, null otherwise.
 *
 * Example:
 *   parseCoverExtFromUrl('https://x.supabase.co/.../project-images/abc/cover.png') → 'png'
 *   parseCoverExtFromUrl('https://x.supabase.co/.../gallery/uuid.png') → null
 */
export function parseCoverExtFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/cover\.(jpg|png|webp)(?:[?#]|$)/);
  return match ? match[1] : null;
}
