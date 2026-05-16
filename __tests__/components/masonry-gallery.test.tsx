/**
 * Tests for src/components/MasonryGallery.tsx (server) and
 * src/components/MasonryGalleryAnimated.tsx (client).
 * FR-111, FR-112, FR-113, FR-114, ADR-42, BDD Scenarios 1, 11
 * Strict TDD — RED phase: components do not exist yet.
 *
 * Strategy:
 *  - Mock ProjectCard as a simple div emitting the project slug.
 *  - Mock MasonryGalleryAnimated as a pass-through that renders columns as data-testid sections.
 *  - Use real distributeToColumns to precompute expected column shapes.
 *  - Assert 3 responsive layout blocks, correct card distribution, and priority flag.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { distributeToColumns } from '../../src/lib/gallery/distribute-columns';
import type { Database } from '../../src/lib/supabase/database.types';

type Project = Database['public']['Tables']['projects']['Row'];

// ---------------------------------------------------------------------------
// Mock: next-intl/server — MasonryGallery now reads gallery.liveLink translation
// ---------------------------------------------------------------------------
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  setRequestLocale: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: ProjectCard — renders a div with data-slug and data-priority attributes
// ---------------------------------------------------------------------------
vi.mock('../../src/components/ProjectCard', () => ({
  default: async ({
    project,
    isPriority,
  }: {
    project: Project;
    locale: string;
    isPriority?: boolean;
  }) => (
    <div
      data-testid={`project-card-${project.slug}`}
      data-slug={project.slug}
      data-priority={isPriority ? 'true' : 'false'}
    >
      {project.title_en}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: MasonryGalleryAnimated — render all three layout blocks with data-testid
// ---------------------------------------------------------------------------
vi.mock('../../src/components/MasonryGalleryAnimated', () => ({
  default: ({
    columns,
    locale,
  }: {
    columns: { one: Project[][]; two: Project[][]; three: Project[][] };
    locale: string;
  }) => (
    <div data-testid="masonry-animated" data-locale={locale}>
      {/* 1-column block */}
      <div data-testid="layout-1col" className="flex flex-col gap-6 sm:hidden">
        {columns.one[0]?.map((p) => (
          <div key={p.id} data-slug={p.slug} data-priority="false">
            {p.title_en}
          </div>
        ))}
      </div>
      {/* 2-column block */}
      <div data-testid="layout-2col" className="hidden sm:flex lg:hidden gap-6">
        {columns.two.map((col, ci) => (
          <div key={ci} data-testid={`col-2-${ci}`}>
            {col.map((p) => (
              <div key={p.id} data-slug={p.slug}>
                {p.title_en}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* 3-column block */}
      <div data-testid="layout-3col" className="hidden lg:flex gap-6">
        {columns.three.map((col, ci) => (
          <div key={ci} data-testid={`col-3-${ci}`}>
            {col.map((p, pi) => (
              <div
                key={p.id}
                data-slug={p.slug}
                data-priority={ci === 0 && pi === 0 ? 'true' : 'false'}
              >
                {p.title_en}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Test fixtures — 5 mock projects
// ---------------------------------------------------------------------------
function makeProject(n: number): Project {
  return {
    id: `proj-${n}`,
    slug: `project-${n}`,
    title_en: `Project ${n}`,
    title_es: `Proyecto ${n}`,
    subtitle_en: '',
    subtitle_es: '',
    description_en: '',
    description_es: '',
    cover_image_url: `https://example.com/img${n}.jpg`,
    tags: [`tag-${n}`],
    published: true,
    display_order: n,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    gallery_images: [],
  };
}

const mockProjects = [1, 2, 3, 4, 5].map(makeProject);

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getMasonryGallery() {
  vi.resetModules();
  return await import('../../src/components/MasonryGallery');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MasonryGallery — layout distribution', () => {
  it('renders THREE responsive layout blocks', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: mockProjects, locale: 'en' });
    render(element as React.ReactElement);
    expect(screen.getByTestId('layout-1col')).toBeInTheDocument();
    expect(screen.getByTestId('layout-2col')).toBeInTheDocument();
    expect(screen.getByTestId('layout-3col')).toBeInTheDocument();
  });

  it('1-col block contains all 5 projects', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: mockProjects, locale: 'en' });
    render(element as React.ReactElement);
    const block = screen.getByTestId('layout-1col');
    mockProjects.forEach((p) => {
      expect(block).toHaveTextContent(p.title_en);
    });
  });

  it('2-col block: col-0 has 3 projects, col-1 has 2 projects', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: mockProjects, locale: 'en' });
    render(element as React.ReactElement);

    const [col0, col1] = distributeToColumns(mockProjects, 2);
    const col2Block0 = screen.getByTestId('col-2-0');
    const col2Block1 = screen.getByTestId('col-2-1');

    expect(col0).toHaveLength(3);
    expect(col1).toHaveLength(2);

    col0.forEach((p) => expect(col2Block0).toHaveTextContent(p.title_en));
    col1.forEach((p) => expect(col2Block1).toHaveTextContent(p.title_en));
  });

  it('3-col block: col-0 has 2, col-1 has 2, col-2 has 1', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: mockProjects, locale: 'en' });
    render(element as React.ReactElement);

    const [col0, col1, col2] = distributeToColumns(mockProjects, 3);

    const col3Block0 = screen.getByTestId('col-3-0');
    const col3Block1 = screen.getByTestId('col-3-1');
    const col3Block2 = screen.getByTestId('col-3-2');

    expect(col0).toHaveLength(2);
    expect(col1).toHaveLength(2);
    expect(col2).toHaveLength(1);

    col0.forEach((p) => expect(col3Block0).toHaveTextContent(p.title_en));
    col1.forEach((p) => expect(col3Block1).toHaveTextContent(p.title_en));
    col2.forEach((p) => expect(col3Block2).toHaveTextContent(p.title_en));
  });

  it('all 5 unique project titles appear in the 3-col block', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: mockProjects, locale: 'en' });
    render(element as React.ReactElement);
    const block3 = screen.getByTestId('layout-3col');
    mockProjects.forEach((p) => {
      expect(block3).toHaveTextContent(p.title_en);
    });
  });

  it('first card in 3-col col-0 has data-priority=true', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: mockProjects, locale: 'en' });
    render(element as React.ReactElement);

    const col3Block0 = screen.getByTestId('col-3-0');
    const firstCard = col3Block0.querySelector('[data-priority="true"]');
    expect(firstCard).toBeInTheDocument();
  });
});

describe('MasonryGallery — empty state', () => {
  it('returns null when projects array is empty', async () => {
    const { default: MasonryGallery } = await getMasonryGallery();
    const element = await MasonryGallery({ projects: [], locale: 'en' });
    expect(element).toBeNull();
  });
});
