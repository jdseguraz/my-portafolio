/**
 * Publish-readiness validation for projects.
 * ADR-20: Pure module — no deps, no 'server-only'.
 * Used in both the admin UI preview (client) and Server Actions (server).
 */

/** Input shape used for publish validation. Only the fields we validate are required here. */
export interface ProjectInput {
  title_en?: string;
  title_es?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  description_en?: string;
  description_es?: string;
  slug?: string;
  cover_image_url?: string | null;
  [key: string]: unknown;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

/**
 * Validates a project for publication.
 * Required fields when published=true (ADR-20):
 *   - title_en, title_es
 *   - subtitle_en, subtitle_es
 *   - description_en, description_es
 *   - slug
 *   - cover_image_url (FR-95, fase 2: cover image is now required to publish)
 */
/**
 * Normalizes an optional http(s) URL string from form input.
 * Empty/whitespace → null (field omitted).
 * Otherwise must parse as an http: or https: URL — returns { ok: false } when not.
 * Shared by live_url and repo_url admin inputs.
 */
export type NormalizeUrlResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

export function normalizeHttpUrl(raw: string | null | undefined): NormalizeUrlResult {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return { ok: true, value: null };
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'Must start with http:// or https://' };
    }
    return { ok: true, value: u.toString() };
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
}

export function validateForPublish(p: ProjectInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!p.title_en?.trim()) errors.title_en = 'Required to publish';
  if (!p.title_es?.trim()) errors.title_es = 'Required to publish';
  if (!p.subtitle_en?.trim()) errors.subtitle_en = 'Required to publish';
  if (!p.subtitle_es?.trim()) errors.subtitle_es = 'Required to publish';
  if (!p.description_en?.trim()) errors.description_en = 'Required to publish';
  if (!p.description_es?.trim()) errors.description_es = 'Required to publish';
  if (!p.slug?.trim()) errors.slug = 'Required';
  // FR-95: cover_image_url is required to publish (added in fase 2)
  if (!p.cover_image_url?.trim()) {
    errors.cover_image_url = 'Cover image required to publish';
  }

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
