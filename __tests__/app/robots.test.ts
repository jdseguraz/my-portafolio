/**
 * Tests for src/app/robots.ts
 * FR-175, FR-176, ADR-66, NFR-42
 * Strict TDD — RED phase
 *
 * Verifies:
 *  - rules: [{ userAgent: '*', allow: '/', disallow: '/admin' }]
 *  - sitemap ends in '/sitemap.xml' and uses siteUrl
 *  - fallback when NEXT_PUBLIC_SITE_URL unset = 'https://jdseguraz.com'
 */
import { describe, it, expect, afterEach } from 'vitest';

async function getRobots() {
  // Reset modules so env vars are re-read on each import
  const mod = await import('../../src/app/robots');
  return mod;
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe('robots — rules', () => {
  it('contains a rule for all user agents', async () => {
    const { default: robots } = await getRobots();
    const result = robots();
    expect(result.rules).toBeDefined();
    const rulesArray = Array.isArray(result.rules) ? result.rules : [result.rules];
    const rule = rulesArray[0] as { userAgent: string; allow?: string; disallow?: string };
    expect(rule.userAgent).toBe('*');
  });

  it('allows /', async () => {
    const { default: robots } = await getRobots();
    const result = robots();
    const rulesArray = Array.isArray(result.rules) ? result.rules : [result.rules];
    const rule = rulesArray[0] as { userAgent: string; allow?: string; disallow?: string };
    expect(rule.allow).toBe('/');
  });

  it('disallows /admin', async () => {
    const { default: robots } = await getRobots();
    const result = robots();
    const rulesArray = Array.isArray(result.rules) ? result.rules : [result.rules];
    const rule = rulesArray[0] as { userAgent: string; allow?: string; disallow?: string };
    expect(rule.disallow).toBe('/admin');
  });
});

describe('robots — sitemap URL', () => {
  it('sitemap ends in /sitemap.xml', async () => {
    const { default: robots } = await getRobots();
    const result = robots();
    const sitemapUrl = Array.isArray(result.sitemap) ? result.sitemap[0] : result.sitemap;
    expect(sitemapUrl).toMatch(/\/sitemap\.xml$/);
  });

  it('sitemap uses NEXT_PUBLIC_SITE_URL when set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom.example.com';
    const { default: robots } = await getRobots();
    const result = robots();
    const sitemapUrl = Array.isArray(result.sitemap) ? result.sitemap[0] : result.sitemap;
    expect(sitemapUrl).toBe('https://custom.example.com/sitemap.xml');
  });

  it('sitemap uses fallback https://jdseguraz.com when env var unset', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { default: robots } = await getRobots();
    const result = robots();
    const sitemapUrl = Array.isArray(result.sitemap) ? result.sitemap[0] : result.sitemap;
    expect(sitemapUrl).toBe('https://jdseguraz.com/sitemap.xml');
  });
});
