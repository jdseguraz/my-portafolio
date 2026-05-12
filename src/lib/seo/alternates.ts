/**
 * buildAlternates — pure SEO helper.
 * ADR-68, ADR-69, FR-178.
 *
 * Returns canonical + hreflang alternates for a given page path + current locale.
 * Pure function: no async, no next-intl imports, no side effects.
 * Safe to import from any Server Component or generateMetadata call.
 *
 * x-default ALWAYS = /es/<path> per defaultLocale: 'es' in src/i18n/routing.ts (NFR-43).
 */
import type { Metadata } from 'next';

export function buildAlternates(
  canonicalPath: string,
  currentLocale: 'en' | 'es',
): NonNullable<Metadata['alternates']> {
  // Strip leading and trailing slashes defensively
  const path = canonicalPath.replace(/^\/+|\/+$/g, '');

  if (path === '') {
    return {
      canonical: `/${currentLocale}`,
      languages: {
        en: '/en',
        es: '/es',
        'x-default': '/es',
      },
    };
  }

  return {
    canonical: `/${currentLocale}/${path}`,
    languages: {
      en: `/en/${path}`,
      es: `/es/${path}`,
      'x-default': `/es/${path}`,
    },
  };
}
