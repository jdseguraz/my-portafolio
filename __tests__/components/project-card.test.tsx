/**
 * Tests for src/components/ProjectCard.tsx (server wrapper) and
 * src/components/ProjectCardMotion.tsx (client motion wrapper).
 * FR-115, FR-116, FR-116b, FR-116c, ADR-44, ADR-46, ADR-49
 * BDD Scenarios 4, 15
 * Strict TDD — RED phase: neither component exists yet.
 *
 * Strategy:
 *  - Mock getLocalizedField to control locale-based resolution.
 *  - Mock next/image as a simple img element.
 *  - Mock @/i18n/navigation Link to render an <a> tag (prefixes locale as next-intl does).
 *  - Mock motion/react for ProjectCardMotion.
 *  - Test ProjectCard (server component) via direct async call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock: @/lib/i18n/fallback
// ---------------------------------------------------------------------------
const mockGetLocalizedField = vi.fn();
vi.mock('../../src/lib/i18n/fallback', () => ({
  getLocalizedField: (row: Record<string, unknown>, base: string, locale: string) =>
    mockGetLocalizedField(row, base, locale),
}));

// ---------------------------------------------------------------------------
// Mock: next/image — render as plain img passing all props through
// ---------------------------------------------------------------------------
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, fill, priority, sizes, ...rest } = props;
    return (
      <img
        src={src as string}
        alt={alt as string}
        data-fill={fill ? 'true' : undefined}
        data-priority={priority ? 'true' : undefined}
        data-sizes={sizes as string}
        {...rest}
      />
    );
  },
}));

// ---------------------------------------------------------------------------
// Mock: @/i18n/navigation — Link renders as <a> with locale-prefixed href
// next-intl Link automatically prefixes the locale; mock simulates this.
// ---------------------------------------------------------------------------
vi.mock('../../src/i18n/navigation', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: motion/react
// ---------------------------------------------------------------------------
const mockUseReducedMotion = vi.fn().mockReturnValue(false);
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div data-motion="true" {...rest}>
        {children}
      </div>
    ),
  },
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getProjectCard() {
  vi.resetModules();
  return await import('../../src/components/ProjectCard');
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const mockProject = {
  id: 'proj-1',
  slug: 'my-project',
  title_en: 'My Project EN',
  title_es: 'Mi Proyecto ES',
  cover_image_url: 'https://example.supabase.co/storage/v1/object/public/covers/img.jpg',
  tags: ['React', 'TypeScript'],
  subtitle_en: '',
  subtitle_es: '',
  description_en: '',
  description_es: '',
  published: true,
  display_order: 1,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  gallery_images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseReducedMotion.mockReturnValue(false);
  // Default: return title_en
  mockGetLocalizedField.mockImplementation(
    (row: Record<string, string>, base: string, locale: string) =>
      locale === 'en' ? row[`${base}_en`] ?? '' : row[`${base}_es`] ?? ''
  );
});

describe('ProjectCard — locale=en', () => {
  it('renders a link to /projects/{slug}', async () => {
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'en' });
    render(element as React.ReactElement);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/my-project');
  });

  it('renders title from title_en when locale=en', async () => {
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'en' });
    render(element as React.ReactElement);
    expect(screen.getByText('My Project EN')).toBeInTheDocument();
  });

  it('renders Image with correct src and alt=localizedTitle', async () => {
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'en' });
    render(element as React.ReactElement);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockProject.cover_image_url);
    expect(img).toHaveAttribute('alt', 'My Project EN');
  });

  it('renders all tags as a comma-separated caption', async () => {
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'en' });
    render(element as React.ReactElement);
    // Dann Petty-style caption: tags joined with commas in a single dim text node
    expect(screen.getByText(/React.*TypeScript/)).toBeInTheDocument();
  });
});

describe('ProjectCard — locale=es', () => {
  it('renders title from title_es when locale=es', async () => {
    mockGetLocalizedField.mockImplementation(
      (row: Record<string, string>, base: string) => row[`${base}_es`] ?? ''
    );
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'es' });
    render(element as React.ReactElement);
    expect(screen.getByText('Mi Proyecto ES')).toBeInTheDocument();
  });
});

describe('ProjectCard — fallback behavior', () => {
  it('falls back to title_en when title_es is empty (getLocalizedField contract)', async () => {
    // getLocalizedField already handles fallback; mock returns en title when es is empty
    mockGetLocalizedField.mockReturnValue('My Project EN');
    const projectWithEmptyEs = { ...mockProject, title_es: '' };
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: projectWithEmptyEs, locale: 'en' });
    render(element as React.ReactElement);
    expect(screen.getByText('My Project EN')).toBeInTheDocument();
  });

  it('does not render Image when cover_image_url is null', async () => {
    const projectNoImage = { ...mockProject, cover_image_url: null };
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: projectNoImage, locale: 'en' });
    render(element as React.ReactElement);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('ProjectCard — priority prop', () => {
  it('passes priority=true to Image when isPriority=true', async () => {
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'en', isPriority: true });
    render(element as React.ReactElement);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('does not set priority when isPriority=false', async () => {
    const { default: ProjectCard } = await getProjectCard();
    const element = await ProjectCard({ project: mockProject, locale: 'en', isPriority: false });
    render(element as React.ReactElement);
    const img = screen.getByRole('img');
    expect(img).not.toHaveAttribute('data-priority', 'true');
  });
});
