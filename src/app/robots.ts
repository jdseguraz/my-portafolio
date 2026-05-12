/**
 * Typed robots handler.
 * FR-175, FR-176, ADR-66
 *
 * Replaces public/robots.txt (deleted in task 5.20).
 * siteUrl resolves from NEXT_PUBLIC_SITE_URL env var with 'https://jdseguraz.com' fallback.
 */
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jdseguraz.com';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/admin' }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
