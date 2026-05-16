// 'server-only' throws at import time outside RSC contexts (ADR-28, DR-02).
// This mock MUST be the first statement so it is hoisted before any transitive
// import of a server-only module during test file collection.
vi.mock('server-only', () => ({}));

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement matchMedia; next-themes (and other media-query-aware
// libs) call it on mount. Stub it so components render without throwing.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => cleanup());
