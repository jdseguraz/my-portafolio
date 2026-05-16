/**
 * Pure routing decision function for the admin gate.
 * ADR-16, ADR-18
 *
 * NO 'import server-only' — this module is used in proxy.ts (Node Edge/Node runtime)
 * AND unit-tested directly by Vitest.
 */
import { verifySession } from './session';

type Decision =
  | { kind: 'next' }
  | { kind: 'redirect'; to: string }
  | { kind: 'delegate' };

/**
 * Decides how to handle a request based on the pathname and the session cookie.
 *
 * Branching logic (ADR-16):
 *   - Non-admin path         → 'delegate' (caller passes to next-intl)
 *   - /admin exact + no valid cookie → 'next' (render login form)
 *   - /admin exact + valid cookie   → 'redirect' to /admin/projects
 *   - /admin/* + valid cookie       → 'next'
 *   - /admin/* + no valid cookie    → 'redirect' to /admin
 */
export function decideAdminRoute(
  pathname: string,
  cookieToken: string | null | undefined,
): Decision {
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');

  if (!isAdminPath) {
    return { kind: 'delegate' };
  }

  const { valid } = verifySession(cookieToken);

  if (pathname === '/admin') {
    if (valid) {
      return { kind: 'redirect', to: '/admin/projects' };
    }
    return { kind: 'next' };
  }

  // Any /admin/* route requires a valid session
  if (!valid) {
    return { kind: 'redirect', to: '/admin' };
  }

  return { kind: 'next' };
}
