/**
 * Smoke test for src/app/admin/actions.ts — login action.
 * PR3-F3: Light test — asserts the action exists and returns error on empty password.
 * Full E2E auth flow deferred to Playwright (fase 3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies so we don't hit real cookie store or redirect
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/auth/require-session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/password', () => ({
  checkPassword: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/auth/session', () => ({
  signSession: vi.fn().mockReturnValue('mock.token'),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ADMIN_PASSWORD', 'test-password-long-enough');
  vi.stubEnv('AUTH_SESSION_SECRET', 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8');
});

describe('login action (smoke)', () => {
  it('the login export exists and is a function', async () => {
    const { login } = await import('../../src/app/(admin)/admin/actions');
    expect(typeof login).toBe('function');
  });

  it('returns error shape when password is empty / wrong', async () => {
    // checkPassword is mocked to return false
    const { login } = await import('../../src/app/(admin)/admin/actions');
    const fd = new FormData();
    fd.append('password', '');
    const result = await login(fd);
    expect(result).toEqual({ ok: false, error: 'Invalid password' });
  });

  it('logout export exists and is a function', async () => {
    const { logout } = await import('../../src/app/(admin)/admin/actions');
    expect(typeof logout).toBe('function');
  });
});
