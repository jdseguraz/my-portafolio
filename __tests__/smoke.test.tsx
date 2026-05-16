import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import ThemeProvider from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';

const withProvider = (ui: React.ReactNode) => (
  <ThemeProvider>{ui}</ThemeProvider>
);

describe('ThemeToggle', () => {
  it('renders without throwing inside a ThemeProvider', () => {
    const { container } = render(withProvider(<ThemeToggle />));
    expect(container).toBeTruthy();
  });

  it('renders no button on the server (mounted-guard prevents pre-hydration flash)', () => {
    const html = renderToString(withProvider(<ThemeToggle />));
    expect(html).not.toMatch(/Toggle theme/);
    expect(html).not.toMatch(/<button/);
  });
});
