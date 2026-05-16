/**
 * Locale fallback utility for bilingual field values.
 * FR-75, FR-76, ADR-18
 *
 * Pure function — no deps, no 'server-only'.
 * Used by both the admin list page and the public site (fase 3+).
 */

/**
 * Returns `row[base_<locale>]` if non-empty, otherwise falls back to the other locale.
 *
 * @param row     Object whose keys include `${base}_en` and `${base}_es` (e.g. a Supabase row).
 * @param base    Field base name (e.g. `'title'` resolves `row.title_en` / `row.title_es`).
 * @param locale  Preferred locale.
 * @returns       The primary locale value if non-empty; else the fallback locale value; else `''`.
 */
export function getLocalizedField(
  row: Record<string, unknown>,
  base: string,
  locale: 'en' | 'es',
): string {
  const primaryKey = `${base}_${locale}`;
  const fallbackLocale = locale === 'en' ? 'es' : 'en';
  const fallbackKey = `${base}_${fallbackLocale}`;

  const primary = row[primaryKey];
  if (typeof primary === 'string' && primary) return primary;

  const fallback = row[fallbackKey];
  return typeof fallback === 'string' ? fallback : '';
}
