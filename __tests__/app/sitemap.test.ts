/**
 * Tests for src/app/sitemap.ts
 * FR-172, FR-173, FR-174, ADR-65, NFR-39
 * Strict TDD — RED phase
 *
 * Verifies:
 *  - 6 total entries (2 homepage + 2 × 2 projects)
 *  - Homepage entries have correct URLs with siteUrl
 *  - Project entries have correct URLs per locale
 *  - All project entries have alternates.languages.en AND .es
 *  - Project entries use updated_at when present
 *  - NEXT_PUBLIC_SITE_URL fallback = 'https://jdseguraz.com'
 *  - export const revalidate = 3600
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock getAllPublishedProjects
// ---------------------------------------------------------------------------
const mockGetAllPublishedProjects = vi.fn();

vi.mock('../../src/lib/projects/fetch', () => ({
  getAllPublishedProjects: () => mockGetAllPublishedProjects(),
}));

const mockProjects = [
  {
    id: '1',
    slug: 'anime-app',
    updated_at: '2024-06-01',
    published: true,
  },
  {
    id: '2',
    slug: 'portfolio',
    updated_at: '2024-07-15',
    published: true,
  },
];

// ---------------------------------------------------------------------------
// Import sitemap AFTER mocks
// ---------------------------------------------------------------------------
async function getSitemap() {
  vi.resetModules();
  return await import('../../src/app/sitemap');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAllPublishedProjects.mockResolvedValue(mockProjects);
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('sitemap — entry count', () => {
  it('returns 6 entries for 2 projects (2 homepage + 2x2 per-locale)', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    expect(entries).toHaveLength(6);
  });
});

describe('sitemap — homepage entries', () => {
  it('includes /en homepage entry when NEXT_PUBLIC_SITE_URL is set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const enEntry = entries.find((e) => e.url === 'https://example.com/en');
    expect(enEntry).toBeDefined();
  });

  it('includes /es homepage entry when NEXT_PUBLIC_SITE_URL is set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const esEntry = entries.find((e) => e.url === 'https://example.com/es');
    expect(esEntry).toBeDefined();
  });

  it('uses fallback siteUrl when NEXT_PUBLIC_SITE_URL is unset', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const enEntry = entries.find((e) => e.url === 'https://jdseguraz.com/en');
    expect(enEntry).toBeDefined();
  });
});

describe('sitemap — project entries', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jdseguraz.com';
  });

  it('includes EN entry for each project', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const enEntry = entries.find((e) =>
      e.url === 'https://jdseguraz.com/en/projects/anime-app'
    );
    expect(enEntry).toBeDefined();
  });

  it('includes ES entry for each project', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const esEntry = entries.find((e) =>
      e.url === 'https://jdseguraz.com/es/projects/anime-app'
    );
    expect(esEntry).toBeDefined();
  });

  it('project entry has alternates.languages.en', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const enEntry = entries.find((e) =>
      e.url === 'https://jdseguraz.com/en/projects/anime-app'
    );
    expect(
      (enEntry?.alternates?.languages as Record<string, string>)?.['en']
    ).toBe('https://jdseguraz.com/en/projects/anime-app');
  });

  it('project entry has alternates.languages.es', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const enEntry = entries.find((e) =>
      e.url === 'https://jdseguraz.com/en/projects/anime-app'
    );
    expect(
      (enEntry?.alternates?.languages as Record<string, string>)?.['es']
    ).toBe('https://jdseguraz.com/es/projects/anime-app');
  });

  it('project entry uses updated_at as lastModified when present', async () => {
    const { default: sitemap } = await getSitemap();
    const entries = await sitemap();
    const enEntry = entries.find((e) =>
      e.url === 'https://jdseguraz.com/en/projects/anime-app'
    );
    expect(enEntry?.lastModified).toBeDefined();
  });
});

describe('sitemap — revalidate export', () => {
  it('exports revalidate = 3600', async () => {
    const mod = await getSitemap();
    expect((mod as unknown as { revalidate?: number }).revalidate).toBe(3600);
  });
});
