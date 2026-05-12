/**
 * Tests for src/app/[locale]/projects/[slug]/page.tsx — Fase 4 expansion.
 * FR-132–FR-164, ADR-53, ADR-54, ADR-60, ADR-61
 * Strict TDD — RED phase: page.tsx not yet rewritten.
 *
 * Strategy:
 *  - Mock @/lib/supabase/server.createClient with chainable mock (same shape as detail-stub).
 *  - Mock next/navigation.notFound to throw sentinel 'NEXT_NOT_FOUND'.
 *  - Mock next/image as <img> preserving src, alt, priority as data-attr.
 *  - Mock @/i18n/navigation Link as plain <a>.
 *  - Mock next-intl/server getTranslations for both nav.backToGallery + gallery.heading.
 *  - Mock @/lib/profile → { name: 'Juan Segura' }.
 *  - Mock motion/react (ProjectDetailMotion uses it).
 *  - DO NOT mock react-markdown — real render for Markdown assertion tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

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
// Mock: next-intl/server — getTranslations with no namespace supports dot-keys
// ---------------------------------------------------------------------------
const mockGetTranslations = vi.fn();

vi.mock('next-intl/server', () => ({
  getTranslations: (ns?: string) => mockGetTranslations(ns),
  setRequestLocale: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @/i18n/navigation — Link renders as plain <a>
// ---------------------------------------------------------------------------
vi.mock('../../src/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
    'data-testid': testId,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'data-testid'?: string;
  }) => (
    <a href={href} className={className} data-testid={testId}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: next/image — renders as <img>, priority preserved as data-priority
// ---------------------------------------------------------------------------
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    priority,
    width,
    height,
    className,
    style,
    sizes,
  }: {
    src: string;
    alt: string;
    priority?: boolean;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
    sizes?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      data-priority={priority ? 'true' : undefined}
      width={width}
      height={height}
      className={className}
      style={style}
      data-sizes={sizes}
    />
  ),
}));

// ---------------------------------------------------------------------------
// Mock: motion/react — ProjectDetailMotion uses this
// ---------------------------------------------------------------------------
const mockUseReducedMotion = vi.fn().mockReturnValue(false);

vi.mock('motion/react', () => ({
  motion: {
    section: ({
      children,
      className,
      initial: _i,
      animate: _a,
      whileInView: _w,
      viewport: _v,
      transition: _t,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      initial?: unknown;
      animate?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
      transition?: unknown;
      [key: string]: unknown;
    }) => (
      <section className={className} {...rest}>
        {children}
      </section>
    ),
    div: ({ children, className, ...rest }: { children?: React.ReactNode; className?: string; [key: string]: unknown }) => (
      <div className={className} {...rest}>{children}</div>
    ),
    article: ({ children, className, ...rest }: { children?: React.ReactNode; className?: string; [key: string]: unknown }) => (
      <article className={className} {...rest}>{children}</article>
    ),
  },
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/server with chainable builder
// ---------------------------------------------------------------------------
const mockMaybeSingle = vi.fn();
const mockEqPublished = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqSlug = vi.fn(() => ({ eq: mockEqPublished }));
const mockSelect = vi.fn(() => ({ eq: mockEqSlug }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockCreateClient = vi.fn(() => Promise.resolve({ from: mockFrom }));

vi.mock('../../src/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/i18n/fallback — real logic simulation
// ---------------------------------------------------------------------------
vi.mock('../../src/lib/i18n/fallback', () => ({
  getLocalizedField: (row: Record<string, unknown>, base: string, locale: string): string => {
    const primary = row[`${base}_${locale}`];
    if (typeof primary === 'string' && primary !== '') return primary;
    // Fallback to the other locale
    const other = locale === 'en' ? row[`${base}_es`] : row[`${base}_en`];
    if (typeof other === 'string') return other;
    return '';
  },
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/profile
// ---------------------------------------------------------------------------
vi.mock('../../src/lib/profile', () => ({
  profile: { name: 'Juan Segura' },
}));

// ---------------------------------------------------------------------------
// Import page AFTER mocks
// ---------------------------------------------------------------------------
async function getPage() {
  vi.resetModules();
  return await import('../../src/app/(public)/[locale]/projects/[slug]/page');
}

// ---------------------------------------------------------------------------
// Translation map helper
// ---------------------------------------------------------------------------
function makeT(locale: string = 'en') {
  const map: Record<string, string> = {
    // No-namespace dot notation
    'nav.backToGallery': locale === 'es' ? 'Volver a la galería' : 'Back to gallery',
    'gallery.heading': locale === 'es' ? 'Galería del proyecto' : 'Project gallery',
    // Namespaced calls: getTranslations('nav') → t('backToGallery')
    'backToGallery': locale === 'es' ? 'Volver a la galería' : 'Back to gallery',
    // Namespaced calls: getTranslations('gallery') → t('heading')
    'heading': locale === 'es' ? 'Galería del proyecto' : 'Project gallery',
  };
  return (key: string) => map[key] ?? key;
}

// ---------------------------------------------------------------------------
// Sample project data
// ---------------------------------------------------------------------------
const baseProject = {
  id: 'proj-1',
  slug: 'test-project',
  title_en: 'My Project',
  title_es: 'Mi Proyecto',
  subtitle_en: 'A great subtitle',
  subtitle_es: 'Un gran subtítulo',
  description_en: '# Heading\n\n**bold**\n\n[link](https://example.com)\n\n```ts\nconst x = 1;\n```',
  description_es: '## ES heading',
  cover_image_url: 'https://example.com/cover.jpg',
  tags: ['React', 'TypeScript'],
  gallery_images: [
    'https://cdn.example.com/img1.jpg',
    'https://cdn.example.com/img2.jpg',
  ],
  published: true,
  display_order: 1,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

// ---------------------------------------------------------------------------
// beforeEach: default mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockUseReducedMotion.mockReturnValue(false);
  // Default: project found with baseProject data
  mockMaybeSingle.mockResolvedValue({ data: { ...baseProject }, error: null });
  // Default: translations via no-namespace call
  mockGetTranslations.mockResolvedValue(makeT('en'));
});

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe('detail-page — Markdown rich render (Scenario 1 & 2)', () => {
  it('renders h1 from markdown heading', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    expect(document.querySelector('h1')).toBeTruthy();
    // The page title h1 is inside ProjectDetailMotion; Markdown h1 will render too
    // We verify Markdown h1 is present (from "# Heading" in description_en)
    const headings = document.querySelectorAll('h1');
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts.some((t) => t?.includes('Heading'))).toBe(true);
  });

  it('renders <strong> from markdown bold', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    expect(document.querySelector('strong')).toBeTruthy();
    expect(document.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders <a href> from markdown link', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const links = document.querySelectorAll('a[href="https://example.com"]');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders <code> element with hljs class from fenced code block', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const codeEls = document.querySelectorAll('code');
    expect(codeEls.length).toBeGreaterThan(0);
    const hljsCode = Array.from(codeEls).find((el) =>
      el.className.includes('hljs') || el.className.includes('language-ts')
    );
    expect(hljsCode).toBeTruthy();
  });

  it('renders <code> element with language-ts class from fenced code block', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const codeEls = document.querySelectorAll('code');
    const langCode = Array.from(codeEls).find((el) =>
      el.className.includes('language-ts') || el.className.includes('language-typescript')
    );
    expect(langCode).toBeTruthy();
  });
});

describe('detail-page — Locale fallback for description (Scenario 3 / FR-150)', () => {
  it('renders description_es content when description_en is empty and locale=en', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { ...baseProject, description_en: '', description_es: '## ES heading' },
      error: null,
    });
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const h2Els = document.querySelectorAll('h2');
    const esHeading = Array.from(h2Els).find((h) => h.textContent?.includes('ES heading'));
    expect(esHeading).toBeTruthy();
  });
});

describe('detail-page — Gallery non-empty (Scenario 4)', () => {
  it('renders gallery heading when gallery_images has items', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    expect(screen.getByText('Project gallery')).toBeInTheDocument();
  });

  it('renders correct number of gallery images', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    // Images with src matching gallery URLs (not cover)
    const img1 = document.querySelector('img[src="https://cdn.example.com/img1.jpg"]');
    const img2 = document.querySelector('img[src="https://cdn.example.com/img2.jpg"]');
    expect(img1).toBeTruthy();
    expect(img2).toBeTruthy();
  });
});

describe('detail-page — Gallery empty array (Scenario 5)', () => {
  it('does not render gallery heading when gallery_images is empty array', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { ...baseProject, gallery_images: [] },
      error: null,
    });
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    expect(screen.queryByText('Project gallery')).not.toBeInTheDocument();
  });

  it('does not render gallery images when gallery_images is empty array', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { ...baseProject, gallery_images: [] },
      error: null,
    });
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const galleryImg = document.querySelector('img[src="https://cdn.example.com/img1.jpg"]');
    expect(galleryImg).toBeFalsy();
  });
});

describe('detail-page — Gallery null (Scenario 6)', () => {
  it('does not render gallery heading when gallery_images is null', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { ...baseProject, gallery_images: null },
      error: null,
    });
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    expect(screen.queryByText('Project gallery')).not.toBeInTheDocument();
  });
});

describe('detail-page — First image priority (Scenario 7)', () => {
  it('first gallery image has priority attribute', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const img1 = document.querySelector('img[src="https://cdn.example.com/img1.jpg"]');
    expect(img1?.getAttribute('data-priority')).toBe('true');
  });

  it('second gallery image does not have priority attribute', async () => {
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    const img2 = document.querySelector('img[src="https://cdn.example.com/img2.jpg"]');
    expect(img2?.getAttribute('data-priority')).not.toBe('true');
  });
});

describe('detail-page — notFound on missing slug (Scenario 8)', () => {
  it('calls notFound() when project is null', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { default: Page } = await getPage();
    await expect(
      Page({ params: Promise.resolve({ locale: 'en', slug: 'does-not-exist' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });
});

describe('detail-page — notFound on unpublished (Scenario 9)', () => {
  it('calls notFound() when published=false (filtered by query)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { default: Page } = await getPage();
    await expect(
      Page({ params: Promise.resolve({ locale: 'en', slug: 'draft-project' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });
});

describe('detail-page — XSS defense (Scenario 13 / FR-149)', () => {
  it('does not render a <script> element when description contains script tag', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        ...baseProject,
        description_en: "<script>alert('xss')</script> Normal text",
        description_es: '',
      },
      error: null,
    });
    const { default: Page } = await getPage();
    const element = await Page({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    render(element as React.ReactElement);
    expect(document.querySelector('script')).toBeFalsy();
    // 'Normal text' may be part of a larger text node — use regex matcher
    expect(screen.getByText(/Normal text/)).toBeInTheDocument();
  });
});

describe('detail-page — generateMetadata (Scenario 10 / ADR-60)', () => {
  it('returns title and description for published project', async () => {
    const { generateMetadata } = await getPage();
    expect(generateMetadata).toBeDefined();
    const result = await generateMetadata!({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    expect(result).toMatchObject({
      title: 'My Project — Juan Segura',
      description: 'A great subtitle',
    });
  });

  it('returns {} for missing project', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { generateMetadata } = await getPage();
    const result = await generateMetadata!({
      params: Promise.resolve({ locale: 'en', slug: 'does-not-exist' }),
    });
    expect(result).toEqual({});
  });

  it('truncates description to exactly 160 chars for long subtitles', async () => {
    const longSubtitle = 'A'.repeat(200);
    mockMaybeSingle.mockResolvedValue({
      data: {
        ...baseProject,
        subtitle_en: longSubtitle,
        subtitle_es: '',
      },
      error: null,
    });
    const { generateMetadata } = await getPage();
    const result = await generateMetadata!({
      params: Promise.resolve({ locale: 'en', slug: 'test-project' }),
    });
    expect((result as { description?: string }).description?.length).toBe(160);
  });

  it('returns ES localized title when locale=es', async () => {
    const { generateMetadata } = await getPage();
    const result = await generateMetadata!({
      params: Promise.resolve({ locale: 'es', slug: 'test-project' }),
    });
    expect((result as { title?: string }).title).toMatch(/^Mi Proyecto/);
  });
});
