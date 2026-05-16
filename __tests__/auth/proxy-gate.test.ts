/**
 * Tests for src/lib/auth/proxy-gate.ts
 * FR-54, FR-55, FR-56, FR-57, FR-58, FR-59, NFR-08, ADR-16
 *
 * Strict TDD: this file is written RED before the impl exists.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let decideAdminRoute: (
  pathname: string,
  cookieToken: string | null | undefined,
) => { kind: 'next' } | { kind: 'redirect'; to: string } | { kind: 'delegate' };

// A valid 32-byte base64url-encoded test secret
const VALID_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';

beforeEach(async () => {
  vi.stubEnv('AUTH_SESSION_SECRET', VALID_SECRET);
  vi.resetModules();
  const mod = await import('../../src/lib/auth/proxy-gate');
  decideAdminRoute = mod.decideAdminRoute;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** Helper: build a valid signed session cookie */
async function buildValidCookie(): Promise<string> {
  vi.resetModules();
  const { signSession } = await import('../../src/lib/auth/session');
  return signSession(Date.now());
}

describe('decideAdminRoute', () => {
  it('pathname=/admin + no cookie → { kind: "next" } (login form renders)', () => {
    const result = decideAdminRoute('/admin', null);
    expect(result).toEqual({ kind: 'next' });
  });

  it('pathname=/admin + valid cookie → { kind: "redirect", to: "/admin/projects" }', async () => {
    const token = await buildValidCookie();
    const result = decideAdminRoute('/admin', token);
    expect(result).toEqual({ kind: 'redirect', to: '/admin/projects' });
  });

  it('pathname=/admin/projects + valid cookie → { kind: "next" }', async () => {
    const token = await buildValidCookie();
    const result = decideAdminRoute('/admin/projects', token);
    expect(result).toEqual({ kind: 'next' });
  });

  it('pathname=/admin/projects + no cookie → { kind: "redirect", to: "/admin" }', () => {
    const result = decideAdminRoute('/admin/projects', null);
    expect(result).toEqual({ kind: 'redirect', to: '/admin' });
  });

  it('pathname=/admin/projects + tampered cookie → { kind: "redirect", to: "/admin" }', async () => {
    const token = await buildValidCookie();
    const tampered = token.slice(0, -4) + 'XXXX';
    const result = decideAdminRoute('/admin/projects', tampered);
    expect(result).toEqual({ kind: 'redirect', to: '/admin' });
  });

  it('pathname=/en → { kind: "delegate" } (public path — delegate to intl)', () => {
    const result = decideAdminRoute('/en', null);
    expect(result).toEqual({ kind: 'delegate' });
  });

  it('pathname=/about/page → { kind: "delegate" } (public path)', () => {
    const result = decideAdminRoute('/about/page', null);
    expect(result).toEqual({ kind: 'delegate' });
  });

  it('pathname=/ → { kind: "delegate" } (root public path)', () => {
    const result = decideAdminRoute('/', null);
    expect(result).toEqual({ kind: 'delegate' });
  });

  it('pathname=/admin/projects/new + valid cookie → { kind: "next" }', async () => {
    const token = await buildValidCookie();
    const result = decideAdminRoute('/admin/projects/new', token);
    expect(result).toEqual({ kind: 'next' });
  });

  it('pathname=/admin/projects/new + no cookie → { kind: "redirect", to: "/admin" }', () => {
    const result = decideAdminRoute('/admin/projects/new', null);
    expect(result).toEqual({ kind: 'redirect', to: '/admin' });
  });
});
