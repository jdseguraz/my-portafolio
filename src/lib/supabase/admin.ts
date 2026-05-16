/**
 * Service-role Supabase client factory.
 * ADR-27, ADR-18: server-only — MUST NOT reach client bundles.
 *
 * Uses @supabase/supabase-js createClient (NOT @supabase/ssr) because:
 * - Service role does not need cookie-based session management.
 * - auth.persistSession / autoRefreshToken / detectSessionInUrl are all disabled.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Returns a service-role Supabase client with full DB access (bypasses RLS).
 * @throws if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)',
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
