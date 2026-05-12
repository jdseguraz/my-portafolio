/**
 * Profile constants — FR-128, ADR-47.
 * Single source of truth for non-translatable identity data.
 * No 'server-only', no 'use client' — importable from any tree.
 * Translatable text (localized name spelling, taglines) lives in messages/*.json.
 */

export const profile = {
  name: 'Juan Segura',
  email: 'juan.segura@brickelltravel.com',
  githubUrl: 'https://github.com/juanseguravasco',
  linkedinUrl: 'https://www.linkedin.com/in/juanseguravasco',
  // twitterUrl: 'https://twitter.com/...' — add when needed
} as const;

export type Profile = typeof profile;
