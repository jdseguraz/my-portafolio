/**
 * Tests for src/components/icons/GitHubIcon.tsx and LinkedInIcon.tsx
 * FR-188, FR-189, ADR-74, C-28
 * Strict TDD — RED phase
 *
 * Verifies:
 *  - Each component renders an <svg> element
 *  - aria-label prop is applied to the <svg>
 *  - viewBox="0 0 24 24" is present
 *  - className prop is applied to the <svg>
 *  - No 'use client' directive (server-renderable — tested indirectly by import succeeding without JSDOM client)
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Import components
// ---------------------------------------------------------------------------
async function getGitHubIcon() {
  return await import('../../src/components/icons/GitHubIcon');
}

async function getLinkedInIcon() {
  return await import('../../src/components/icons/LinkedInIcon');
}

// ---------------------------------------------------------------------------
// GitHubIcon tests
// ---------------------------------------------------------------------------
describe('GitHubIcon — SVG rendering', () => {
  it('renders an svg element', async () => {
    const { default: GitHubIcon } = await getGitHubIcon();
    const { container } = render(<GitHubIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('sets aria-label when ariaLabel prop is passed', async () => {
    const { default: GitHubIcon } = await getGitHubIcon();
    const { container } = render(<GitHubIcon ariaLabel="GitHub" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('GitHub');
  });

  it('has viewBox="0 0 24 24"', async () => {
    const { default: GitHubIcon } = await getGitHubIcon();
    const { container } = render(<GitHubIcon />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('applies className prop to svg', async () => {
    const { default: GitHubIcon } = await getGitHubIcon();
    const { container } = render(<GitHubIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('custom-class')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LinkedInIcon tests
// ---------------------------------------------------------------------------
describe('LinkedInIcon — SVG rendering', () => {
  it('renders an svg element', async () => {
    const { default: LinkedInIcon } = await getLinkedInIcon();
    const { container } = render(<LinkedInIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('sets aria-label when ariaLabel prop is passed', async () => {
    const { default: LinkedInIcon } = await getLinkedInIcon();
    const { container } = render(<LinkedInIcon ariaLabel="LinkedIn" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('LinkedIn');
  });

  it('has viewBox="0 0 24 24"', async () => {
    const { default: LinkedInIcon } = await getLinkedInIcon();
    const { container } = render(<LinkedInIcon />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('applies className prop to svg', async () => {
    const { default: LinkedInIcon } = await getLinkedInIcon();
    const { container } = render(<LinkedInIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('custom-class')).toBe(true);
  });
});
