/**
 * Tests for src/components/PublicHeader.tsx (Server Component)
 * FR-122, ADR-48, BDD Scenario 6
 * Strict TDD — RED phase: PublicHeader.tsx / Logo.tsx do not exist yet.
 *
 * Strategy:
 *  - Mock next-intl/server.getTranslations for header namespace.
 *  - Mock Logo, LocaleSwitcher, ThemeToggle so they render predictable test nodes.
 *  - Render PublicHeader and assert all three sub-components are present.
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
// Mock: Logo — render a div with aria-label exposed
// ---------------------------------------------------------------------------
vi.mock('../../src/components/Logo', () => ({
  default: ({ ariaLabel }: { ariaLabel: string }) => (
    <a data-testid="logo" aria-label={ariaLabel} href="/">
      JS
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: LocaleSwitcher — render a button-like element
// ---------------------------------------------------------------------------
vi.mock('../../src/components/locale-switcher', () => ({
  default: () => <button data-testid="locale-switcher">ES</button>,
}));

// ---------------------------------------------------------------------------
// Mock: ThemeToggle — simulate mounted guard bypassed
// ---------------------------------------------------------------------------
vi.mock('../../src/components/theme-toggle', () => ({
  default: () => <button data-testid="theme-toggle" aria-label="Toggle theme">🌙</button>,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getPublicHeader() {
  vi.resetModules();
  return await import('../../src/components/PublicHeader');
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetTranslations.mockResolvedValue((key: string) => {
    const map: Record<string, string> = {
      logoAlt: "Juan Segura's portfolio home",
    };
    return map[key] ?? key;
  });
});

describe('PublicHeader — server component', () => {
  it('renders the Logo element with aria-label from header.logoAlt translation', async () => {
    const { default: PublicHeader } = await getPublicHeader();
    const element = await PublicHeader();
    render(element as React.ReactElement);
    const logo = screen.getByTestId('logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('aria-label', "Juan Segura's portfolio home");
  });

  it('renders the LocaleSwitcher component', async () => {
    const { default: PublicHeader } = await getPublicHeader();
    const element = await PublicHeader();
    render(element as React.ReactElement);
    expect(screen.getByTestId('locale-switcher')).toBeInTheDocument();
  });

  it('renders the ThemeToggle component', async () => {
    const { default: PublicHeader } = await getPublicHeader();
    const element = await PublicHeader();
    render(element as React.ReactElement);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('calls getTranslations with the header namespace', async () => {
    const { default: PublicHeader } = await getPublicHeader();
    await PublicHeader();
    expect(mockGetTranslations).toHaveBeenCalledWith('header');
  });

  it('renders a <header> element as the root', async () => {
    const { default: PublicHeader } = await getPublicHeader();
    const element = await PublicHeader();
    const { container } = render(element as React.ReactElement);
    expect(container.querySelector('header')).toBeInTheDocument();
  });
});
