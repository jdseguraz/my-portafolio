/**
 * Tests for src/app/[locale]/projects/[slug]/page.tsx (Server Component stub)
 * FR-118, FR-119, FR-120, ADR-50, BDD Scenarios 12, 13, 14
 * Strict TDD — RED phase: page.tsx does not exist yet.
 *
 * Strategy:
 *  - Mock @/lib/supabase/server.createClient with a chainable mock.
 *  - Mock next/navigation.notFound to throw a sentinel error.
 *  - Mock next-intl/server for translations.
 *  - Mock @/i18n/navigation Link component.
 *  - Three test cases: published, missing, and unpublished (same as missing).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Sentinel error for notFound()
// ---------------------------------------------------------------------------
class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Mock: next/navigation
// ---------------------------------------------------------------------------
const mockNotFound = vi.fn(() => { throw new NotFoundError(); });

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}));

// ---------------------------------------------------------------------------
// Mock: next-intl/server
// ---------------------------------------------------------------------------
const mockGetTranslations = vi.fn();

vi.mock('next-intl/server', () => ({
  getTranslations: (ns: string) => mockGetTranslations(ns),
  setRequestLocale: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @/i18n/navigation — Link renders as plain <a>
// ---------------------------------------------------------------------------
vi.mock('../../src/i18n/navigation', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid="nav-link">{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/server with chainable builder
// ---------------------------------------------------------------------------
const mockMaybeSingle = vi.fn();
const mockEqPublished = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqSlug = vi.fn(() => ({ eq: mockEqPublished }));
const mockSelectAll = vi.fn(() => ({ eq: mockEqSlug }));
const mockFrom = vi.fn(() => ({ select: mockSelectAll }));
const mockCreateClient = vi.fn(() => Promise.resolve({ from: mockFrom }));

vi.mock('../../src/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/i18n/fallback
// ---------------------------------------------------------------------------
vi.mock('../../src/lib/i18n/fallback', () => ({
  getLocalizedField: (row: Record<string, unknown>, base: string, locale: string) => {
    const key = `${base}_${locale}`;
    return typeof row[key] === 'string' ? row[key] : '';
  },
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getPage() {
  vi.resetModules();
  return await import('../../src/app/(public)/[locale]/projects/[slug]/page');
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const publishedProject = {
  id: 'proj-1',
  slug: 'test-project',
  title_en: 'Test Project EN',
  title_es: 'Test Project ES',
  subtitle_en: 'Subtitle EN',
  subtitle_es: 'Subtitle ES',
  cover_image_url: 'https://example.com/cover.jpg',
  tags: ['React', 'TypeScript'],
  published: true,
  display_order: 1,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  description_en: '',
  description_es: '',
  gallery_images: [],
};

beforeEach(() => {
  vi.clearAllMocks();

  mockGetTranslations.mockResolvedValue((key: string) => {
    const map: Record<string, string> = {
      backToGallery: 'Back to gallery',
    };
    return map[key] ?? key;
  });
});

describe('ProjectDetailStub — /[locale]/projects/[slug]', () => {
  describe('BDD Scenario 12 — published slug renders correctly', () => {
    beforeEach(() => {
      mockMaybeSingle.mockResolvedValue({ data: publishedProject, error: null });
    });

    it('renders the localized title (EN)', async () => {
      const { default: Page } = await getPage();
      const element = await Page({ params: Promise.resolve({ locale: 'en', slug: 'test-project' }) });
      render(element as React.ReactElement);
      expect(screen.getByText('Test Project EN')).toBeInTheDocument();
    });

    it('renders the localized subtitle (EN)', async () => {
      const { default: Page } = await getPage();
      const element = await Page({ params: Promise.resolve({ locale: 'en', slug: 'test-project' }) });
      render(element as React.ReactElement);
      expect(screen.getByText('Subtitle EN')).toBeInTheDocument();
    });

    it('renders tag chips', async () => {
      const { default: Page } = await getPage();
      const element = await Page({ params: Promise.resolve({ locale: 'en', slug: 'test-project' }) });
      render(element as React.ReactElement);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('renders back-to-gallery link with locale-aware href "/"', async () => {
      const { default: Page } = await getPage();
      const element = await Page({ params: Promise.resolve({ locale: 'en', slug: 'test-project' }) });
      render(element as React.ReactElement);
      const link = screen.getByTestId('nav-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/');
    });

    it('renders the back-to-gallery translation text', async () => {
      const { default: Page } = await getPage();
      const element = await Page({ params: Promise.resolve({ locale: 'en', slug: 'test-project' }) });
      render(element as React.ReactElement);
      expect(screen.getByText(/Back to gallery/)).toBeInTheDocument();
    });

    it('calls getTranslations with the nav namespace', async () => {
      const { default: Page } = await getPage();
      await Page({ params: Promise.resolve({ locale: 'en', slug: 'test-project' }) });
      expect(mockGetTranslations).toHaveBeenCalledWith('nav');
    });
  });

  describe('BDD Scenario 14 — missing slug triggers notFound', () => {
    beforeEach(() => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    });

    it('calls notFound() when project data is null', async () => {
      const { default: Page } = await getPage();
      await expect(
        Page({ params: Promise.resolve({ locale: 'en', slug: 'does-not-exist' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalledOnce();
    });
  });

  describe('BDD Scenario 13 — unpublished slug filtered by query triggers notFound', () => {
    beforeEach(() => {
      // .eq('published', true) means unpublished rows return null from maybeSingle
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    });

    it('calls notFound() when published=false row is not returned (filtered by query)', async () => {
      const { default: Page } = await getPage();
      await expect(
        Page({ params: Promise.resolve({ locale: 'en', slug: 'draft-project' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalledOnce();
    });
  });
});
