/**
 * Server-only session guard for Server Actions.
 * ADR-17, ADR-18
 *
 * Defense-in-depth per Next 16 data-security.md (line 358):
 * "The page-level redirect controls which UI is rendered, but the Server Action is
 * a separate entry point and must verify the caller on its own."
 *
 * Call as the FIRST statement in every mutating Server Action.
 * redirect() on failure — throws a special Next signal so subsequent SA code never runs.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/session';

/**
 * Verifies the admin session cookie. Redirects to /admin on failure.
 * @throws Never — redirect() is handled by Next's internals.
 */
export async function requireAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get('admin_session')?.value;
  const { valid } = verifySession(token);
  if (!valid) {
    redirect('/admin');
  }
}
