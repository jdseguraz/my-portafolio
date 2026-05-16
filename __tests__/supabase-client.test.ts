import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/ssr to avoid real network calls
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {},
  })),
}));

describe('Supabase browser client', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('createClient() does not throw when env vars are set', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    expect(() => createClient()).not.toThrow();
  });

  it('createClient() returns an object with a .from method', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const client = createClient();
    expect(client).toHaveProperty('from');
  });
});
