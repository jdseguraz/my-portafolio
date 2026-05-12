/**
 * Tests for src/components/Hero.tsx (Server Component wrapper)
 * FR-108, FR-109, ADR-46, BDD Scenario 10
 * Strict TDD — RED phase: Hero.tsx does not exist yet.
 *
 * Strategy:
 *  - Mock next-intl/server.getTranslations to return test strings.
 *  - Mock src/lib/profile.ts constants.
 *  - Mock HeroMotion so we can assert received props without motion complexity.
 *  - Render Hero and assert correct props are passed through.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock: next-intl/server
// ---------------------------------------------------------------------------
const mockGetTranslations = vi.fn();

vi.mock('next-intl/server', () => ({
  getTranslations: (ns: string) => mockGetTranslations(ns),
  setRequestLocale: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: src/lib/profile.ts
// ---------------------------------------------------------------------------
vi.mock('../../src/lib/profile', () => ({
  profile: {
    name: 'Mock Name',
    email: 'mock@example.com',
    githubUrl: 'https://github.com/mockuser',
    linkedinUrl: 'https://linkedin.com/in/mockuser',
  },
}));

// ---------------------------------------------------------------------------
// Mock: HeroMotion — render as plain div that exposes received props
// ---------------------------------------------------------------------------
vi.mock('../../src/components/HeroMotion', () => ({
  default: (props: {
    title: string;
    tagline: string;
    name: string;
    email: string;
    githubUrl: string;
    linkedinUrl: string;
  }) => (
    <div data-testid="hero-motion">
      <span data-testid="prop-title">{props.title}</span>
      <span data-testid="prop-tagline">{props.tagline}</span>
      <span data-testid="prop-name">{props.name}</span>
      <a href={props.githubUrl} data-testid="prop-github">{props.githubUrl}</a>
      <a href={props.linkedinUrl} data-testid="prop-linkedin">{props.linkedinUrl}</a>
      <a href={`mailto:${props.email}`} data-testid="prop-email">{props.email}</a>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getComponent() {
  vi.resetModules();
  return await import('../../src/components/Hero');
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default translation mock: returns a function that maps keys to test values
  mockGetTranslations.mockResolvedValue((key: string) => {
    const map: Record<string, string> = {
      title: 'Hero Title EN',
      tagline: 'Hero Tagline EN',
    };
    return map[key] ?? key;
  });
});

describe('Hero — server component wrapper', () => {
  it('renders HeroMotion with translated title', async () => {
    const { default: Hero } = await getComponent();
    const heroElement = await Hero();
    render(heroElement as React.ReactElement);
    expect(screen.getByTestId('prop-title')).toHaveTextContent('Hero Title EN');
  });

  it('renders HeroMotion with translated tagline', async () => {
    const { default: Hero } = await getComponent();
    const heroElement = await Hero();
    render(heroElement as React.ReactElement);
    expect(screen.getByTestId('prop-tagline')).toHaveTextContent('Hero Tagline EN');
  });

  it('passes profile.name to HeroMotion', async () => {
    const { default: Hero } = await getComponent();
    const heroElement = await Hero();
    render(heroElement as React.ReactElement);
    expect(screen.getByTestId('prop-name')).toHaveTextContent('Mock Name');
  });

  it('passes profile.githubUrl as href to HeroMotion', async () => {
    const { default: Hero } = await getComponent();
    const heroElement = await Hero();
    render(heroElement as React.ReactElement);
    expect(screen.getByTestId('prop-github')).toHaveAttribute('href', 'https://github.com/mockuser');
  });

  it('passes profile.linkedinUrl as href to HeroMotion', async () => {
    const { default: Hero } = await getComponent();
    const heroElement = await Hero();
    render(heroElement as React.ReactElement);
    expect(screen.getByTestId('prop-linkedin')).toHaveAttribute('href', 'https://linkedin.com/in/mockuser');
  });

  it('passes profile.email as mailto href to HeroMotion', async () => {
    const { default: Hero } = await getComponent();
    const heroElement = await Hero();
    render(heroElement as React.ReactElement);
    expect(screen.getByTestId('prop-email')).toHaveAttribute('href', 'mailto:mock@example.com');
  });

  it('calls getTranslations with hero namespace', async () => {
    const { default: Hero } = await getComponent();
    await Hero();
    expect(mockGetTranslations).toHaveBeenCalledWith('hero');
  });
});
