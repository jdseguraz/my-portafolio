/**
 * Smoke test: src/lib/supabase/admin.ts loads without error when env vars are set.
 * ADR-28: relies on global vi.mock('server-only') from setup.ts.
 *
 * This test will be KEPT as it provides a useful guard that the module loads cleanly.
 * Integration testing via T4 (actions.test.ts) in PR3.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('createAdminClient smoke test', () => {
  it('module imports without error when env vars are set', async () => {
    const mod = await import('../src/lib/supabase/admin');
    expect(typeof mod.createAdminClient).toBe('function');
  });

  it('createAdminClient() returns a client object', async () => {
    const { createAdminClient } = await import('../src/lib/supabase/admin');
    const client = createAdminClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('createAdminClient() throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
    const { createAdminClient } = await import('../src/lib/supabase/admin');
    expect(() => createAdminClient()).toThrow();
  });

  it('createAdminClient() throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    const { createAdminClient } = await import('../src/lib/supabase/admin');
    expect(() => createAdminClient()).toThrow();
  });
});
