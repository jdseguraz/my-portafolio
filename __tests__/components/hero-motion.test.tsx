/**
 * Tests for src/components/HeroMotion.tsx
 * ADR-41, ADR-46, ADR-49, BDD Scenario 10
 * Strict TDD — RED phase: HeroMotion does not exist yet.
 *
 * Strategy:
 *  - Mock motion/react so motion.div renders as a plain <div>, passing through props.
 *  - Mock useReducedMotion to return false (normal) then true (reduced motion).
 *  - Assert children are rendered in both cases.
 *  - Assert motion.div receives expected initial/animate props based on reducedMotion state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock motion/react — render motion.div as plain div, expose props via data-*
// ---------------------------------------------------------------------------
const mockUseReducedMotion = vi.fn().mockReturnValue(false);

vi.mock('motion/react', () => ({
  motion: {
    div: vi.fn(({ children, initial, animate, transition, ...rest }: {
      children?: React.ReactNode;
      initial?: Record<string, unknown>;
      animate?: Record<string, unknown>;
      transition?: Record<string, unknown>;
      [key: string]: unknown;
    }) => (
      <div
        data-testid={(rest as { 'data-testid'?: string })['data-testid'] ?? 'motion-div'}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        {...rest}
      >
        {children}
      </div>
    )),
  },
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Mock lucide-react icons
// ---------------------------------------------------------------------------
vi.mock('lucide-react', () => ({
  Github: ({ 'aria-label': label }: { 'aria-label'?: string }) => <svg aria-label={label} data-testid="icon-github" />,
  Linkedin: ({ 'aria-label': label }: { 'aria-label'?: string }) => <svg aria-label={label} data-testid="icon-linkedin" />,
  Mail: ({ 'aria-label': label }: { 'aria-label'?: string }) => <svg aria-label={label} data-testid="icon-mail" />,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getComponent() {
  vi.resetModules();
  return await import('../../src/components/HeroMotion');
}

const defaultProps = {
  title: 'Test Title',
  tagline: 'Test Tagline',
  name: 'Test Name',
  email: 'test@example.com',
  githubUrl: 'https://github.com/test',
  linkedinUrl: 'https://linkedin.com/in/test',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseReducedMotion.mockReturnValue(false);
});

describe('HeroMotion — normal motion (useReducedMotion = false)', () => {
  it('renders title text', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders tagline text', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    expect(screen.getByText('Test Tagline')).toBeInTheDocument();
  });

  it('renders GitHub link with correct href', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/test');
  });

  it('renders LinkedIn link with correct href', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    const linkedinLink = screen.getByRole('link', { name: /linkedin/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com/in/test');
  });

  it('renders email mailto link', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    const mailLink = screen.getByRole('link', { name: /email|mail|contact/i });
    expect(mailLink).toHaveAttribute('href', 'mailto:test@example.com');
  });

  it('motion.div wrapper has animated initial props (opacity 0, y offset)', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    // First motion.div should have animated initial (opacity: 0)
    const motionDivs = document.querySelectorAll('[data-initial]');
    expect(motionDivs.length).toBeGreaterThan(0);
    const firstInitial = JSON.parse(motionDivs[0].getAttribute('data-initial') ?? '{}');
    expect(firstInitial.opacity).toBe(0);
  });
});

describe('HeroMotion — reduced motion (useReducedMotion = true)', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(true);
  });

  it('still renders title text when reduced motion is active', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('still renders tagline text when reduced motion is active', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    expect(screen.getByText('Test Tagline')).toBeInTheDocument();
  });

  it('still renders social links when reduced motion is active', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();
  });

  it('motion.div wrapper has static initial props (opacity 1) when reduced', async () => {
    const { default: HeroMotion } = await getComponent();
    render(<HeroMotion {...defaultProps} />);
    const motionDivs = document.querySelectorAll('[data-initial]');
    expect(motionDivs.length).toBeGreaterThan(0);
    const firstInitial = JSON.parse(motionDivs[0].getAttribute('data-initial') ?? '{}');
    // When reduced, initial should be fully visible (opacity 1)
    expect(firstInitial.opacity).toBe(1);
  });
});
