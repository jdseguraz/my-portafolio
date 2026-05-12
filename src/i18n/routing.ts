import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  // Spanish is the fallback when browser locale detection finds no match.
  defaultLocale: 'es',
  // Always prefix; `/` redirects to detected-or-default locale via middleware.
  localePrefix: 'always',
});
