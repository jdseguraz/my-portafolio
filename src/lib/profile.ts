/**
 * Profile constants — FR-128, ADR-47.
 * Single source of truth for non-translatable identity data.
 * No 'server-only', no 'use client' — importable from any tree.
 * Translatable text (localized name spelling, taglines) lives in messages/*.json.
 */

export const profile = {
  name: 'David Segura',
  email: 'jdsegurazabala@gmail.com',
  githubUrl: 'https://github.com/jdseguraz',
  linkedinUrl: 'https://www.linkedin.com/in/david-segura-zabala/',
  // twitterUrl: 'https://twitter.com/...' — add when needed
} as const;

/**
 * Canonical site URL — single source of truth for sitemap, robots, and metadataBase.
 * FR-182, NFR-42
 * Resolves from NEXT_PUBLIC_SITE_URL env var; falls back to production URL.
 * Never throws on unset env var.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jdseguraz.com';

export type Profile = typeof profile;
