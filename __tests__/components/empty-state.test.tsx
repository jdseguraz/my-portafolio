/**
 * Tests for src/components/EmptyState.tsx (Server Component)
 * FR-117b, ADR-51, BDD Scenario 2
 * Strict TDD — RED phase: EmptyState does not exist yet.
 *
 * Strategy:
 *  - Mock next-intl/server.getTranslations to return a test translation function.
 *  - Render EmptyState and assert the localized empty message is present.
 *  - No CTA, no animation — presence of text only.
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
// Import component AFTER mocks
// ---------------------------------------------------------------------------
async function getEmptyState() {
  vi.resetModules();
  return await import('../../src/components/EmptyState');
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default mock: getTranslations('gallery') returns a t() function
  mockGetTranslations.mockResolvedValue((key: string) => {
    const map: Record<string, string> = {
      empty: 'No projects yet — check back soon.',
    };
    return map[key] ?? key;
  });
});

describe('EmptyState', () => {
  it('renders the localized empty gallery message', async () => {
    const { default: EmptyState } = await getEmptyState();
    const element = await EmptyState();
    render(element as React.ReactElement);
    expect(screen.getByText('No projects yet — check back soon.')).toBeInTheDocument();
  });

  it('calls getTranslations with the gallery namespace', async () => {
    const { default: EmptyState } = await getEmptyState();
    await EmptyState();
    expect(mockGetTranslations).toHaveBeenCalledWith('gallery');
  });

  it('renders a section with text-center class', async () => {
    const { default: EmptyState } = await getEmptyState();
    const element = await EmptyState();
    const { container } = render(element as React.ReactElement);
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section?.className).toContain('text-center');
  });
});
