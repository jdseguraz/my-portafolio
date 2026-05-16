/**
 * URL slug generation from a human-readable string.
 * ADR-19: Pure module — no deps, no 'server-only'.
 * Used in both the admin client preview and the server-side SA for authoritative cleansing.
 */

/**
 * Converts a human-readable string into a URL-safe slug.
 *
 * Algorithm (ADR-19):
 *  1. NFD decompose — separates base chars from combining marks (accents).
 *  2. Strip combining marks (Unicode category Mn, range U+0300..U+036F).
 *  3. Lowercase.
 *  4. Replace non-alphanumeric sequences with a single dash.
 *  5. Trim leading/trailing dashes.
 *  6. Hard cap at 80 characters.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    // Strip combining diacritical marks (Unicode range U+0300–U+036F)
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
