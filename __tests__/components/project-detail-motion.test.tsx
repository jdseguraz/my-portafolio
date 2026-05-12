/**
 * Tests for src/components/ProjectDetailMotion.tsx
 * FR-140–FR-155, FR-164, ADR-59, ADR-61
 * Strict TDD — RED phase: component does not exist yet.
 *
 * Strategy:
 *  - Mock motion/react so motion.section renders as plain <section>.
 *  - Mock useReducedMotion to control reduced-motion state.
 *  - Mock next/image as plain <img> preserving priority as data-attr.
 *  - Mock @/i18n/navigation Link as plain <a>.
 *  - Assert structural rendering: 3 sections, 2 sections, descriptionNode, priority, tags.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock motion/react — motion.section renders as plain <section>
// ---------------------------------------------------------------------------
const mockUseReducedMotion = vi.fn().mockReturnValue(false);

vi.mock('motion/react', () => ({
  motion: {
    section: ({
      children,
      initial: _initial,
      animate: _animate,
      whileInView: _whileInView,
      viewport: _viewport,
      transition: _transition,
      className,
      ...rest
    }: {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
      transition?: unknown;
      className?: string;
      [key: string]: unknown;
    }) => (
      <section className={className} {...rest}>
        {children}
      </section>
    ),
    div: ({
      children,
      className,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
    article: ({
      children,
      className,
      ...rest
    }: {
      children?: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => (
      <article className={className} {...rest}>
        {children}
      </article>
    ),
  },
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Mock next/image — renders as <img>, priority preserved as data-priority
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
// Mock @/i18n/navigation — Link renders as plain <a>
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
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getComponent() {
  vi.resetModules();
  return await import('../../src/components/ProjectDetailMotion');
}

// ---------------------------------------------------------------------------
// Default test props
// ---------------------------------------------------------------------------
const defaultProps = {
  title: 'My Project',
  subtitle: 'A great subtitle',
  tags: ['React', 'TypeScript'],
  descriptionNode: <div data-testid="desc-stub">Description content</div>,
  galleryUrls: [
    'https://cdn.example.com/img1.jpg',
    'https://cdn.example.com/img2.jpg',
  ],
  backLinkLabel: 'Back to gallery',
  galleryHeading: 'Project gallery',
  // locale and slug removed — W-01 resolution (ADR-75, FR-191)
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseReducedMotion.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectDetailMotion — gallery present (galleryUrls non-empty)', () => {
  it('renders three sections: header, description, gallery', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const sections = document.querySelectorAll('section');
    expect(sections).toHaveLength(3);
  });

  it('renders header section with title', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Project');
  });

  it('renders gallery heading in the third section', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Project gallery');
  });
});

describe('ProjectDetailMotion — gallery absent (galleryUrls = [])', () => {
  it('renders only two sections (header + description) when galleryUrls is empty', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} galleryUrls={[]} />);
    const sections = document.querySelectorAll('section');
    expect(sections).toHaveLength(2);
  });

  it('does not render gallery heading when galleryUrls is empty', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} galleryUrls={[]} />);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });
});

describe('ProjectDetailMotion — gallery absent (galleryUrls = undefined)', () => {
  it('renders only two sections when galleryUrls is undefined (defensive path)', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    // Component API should be robust; cast to satisfy TS for this defensive test
    render(
      <ProjectDetailMotion
        {...defaultProps}
        galleryUrls={undefined as unknown as string[]}
      />
    );
    const sections = document.querySelectorAll('section');
    expect(sections).toHaveLength(2);
  });
});

describe('ProjectDetailMotion — reduced motion', () => {
  it('still renders all three sections when useReducedMotion returns true', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const sections = document.querySelectorAll('section');
    expect(sections).toHaveLength(3);
  });

  it('still renders children content when reduced motion is active', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    expect(screen.getByTestId('desc-stub')).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });
});

describe('ProjectDetailMotion — gallery image priority', () => {
  it('first gallery image has priority attribute set', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('data-priority', 'true');
  });

  it('second gallery image does NOT have priority attribute', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const images = screen.getAllByRole('img');
    expect(images[1]).not.toHaveAttribute('data-priority', 'true');
  });
});

describe('ProjectDetailMotion — descriptionNode prop', () => {
  it('renders descriptionNode content in the description section', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    expect(screen.getByTestId('desc-stub')).toBeInTheDocument();
    expect(screen.getByText('Description content')).toBeInTheDocument();
  });
});

describe('ProjectDetailMotion — back link', () => {
  it('renders back link in the header section', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const link = screen.getByTestId('nav-link');
    expect(link).toBeInTheDocument();
  });

  it('back link text contains the backLinkLabel', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const link = screen.getByTestId('nav-link');
    expect(link).toHaveTextContent('Back to gallery');
  });

  it('back link has an href attribute', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    const link = screen.getByTestId('nav-link');
    expect(link).toHaveAttribute('href');
  });
});

describe('ProjectDetailMotion — tags', () => {
  it('renders tag chips when tags array is non-empty', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('does not render any tag chips when tags is empty', async () => {
    const { default: ProjectDetailMotion } = await getComponent();
    render(<ProjectDetailMotion {...defaultProps} tags={[]} />);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('TypeScript')).not.toBeInTheDocument();
  });
});
