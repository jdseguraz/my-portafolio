/**
 * Tests for src/lib/auth/password.ts
 * FR-45, FR-46, FR-47, NFR-08, NFR-16, ADR-18
 *
 * Strict TDD: this file is written RED before the impl exists.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let checkPassword: (submitted: string) => boolean;

const ADMIN_PASSWORD = 'S3cur3P@ssword!Test123';

beforeEach(async () => {
  vi.stubEnv('ADMIN_PASSWORD', ADMIN_PASSWORD);
  vi.resetModules();
  const mod = await import('../../src/lib/auth/password');
  checkPassword = mod.checkPassword;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('checkPassword', () => {
  it('returns true for the correct password', () => {
    expect(checkPassword(ADMIN_PASSWORD)).toBe(true);
  });

  it('returns false for a wrong password with the same byte length', () => {
    // Same length as ADMIN_PASSWORD — exercises timingSafeEqual path, not length guard
    const wrong = ADMIN_PASSWORD.slice(0, -1) + (ADMIN_PASSWORD.endsWith('3') ? '4' : '3');
    expect(checkPassword(wrong)).toBe(false);
  });

  it('returns false for a wrong password with different length (LENGTH GUARD)', () => {
    // If there were no length guard, passing different-length buffers to timingSafeEqual would throw
    expect(checkPassword('short')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(checkPassword('')).toBe(false);
  });

  it('returns false for a longer password', () => {
    expect(checkPassword(ADMIN_PASSWORD + 'extra')).toBe(false);
  });

  it('throws when ADMIN_PASSWORD env var is missing', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../../src/lib/auth/password');
    expect(() => mod.checkPassword('anything')).toThrow();
  });
});
