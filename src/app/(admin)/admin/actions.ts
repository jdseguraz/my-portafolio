'use server';
import 'server-only';

/**
 * Admin auth Server Actions: login + logout.
 * DR-13: login + logout live here. Layout imports only logout. No circular dep.
 * DR-05 CRITICAL: cookies().set(...) MUST be called BEFORE redirect(...).
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkPassword } from '@/lib/auth/password';
import { signSession } from '@/lib/auth/session';
import { requireAdminSession } from '@/lib/auth/require-session';

type LoginResult = { ok: false; error: string };

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

/**
 * Handles the admin login form submission.
 * Does NOT call requireAdminSession — this IS the auth entry point.
 *
 * DR-05: cookies().set() BEFORE redirect() — the cookie header must be written
 * on the same response that redirect() uses.
 */
export async function login(formData: FormData): Promise<LoginResult | void> {
  const submitted = (formData.get('password') as string | null) ?? '';

  let passwordOk = false;
  try {
    passwordOk = checkPassword(submitted);
  } catch {
    // ADMIN_PASSWORD not configured — fail loudly
    return { ok: false, error: 'Server misconfiguration: ADMIN_PASSWORD is not set' };
  }

  if (!passwordOk) {
    return { ok: false, error: 'Invalid password' };
  }

  // Password correct — sign a session token.
  let token: string;
  try {
    token = signSession();
  } catch {
    return { ok: false, error: 'Server misconfiguration: AUTH_SESSION_SECRET is not set' };
  }

  // DR-05: Set cookie BEFORE redirect.
  const cookieStore = await cookies();
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/admin',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  redirect('/admin/projects');
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

/**
 * Clears the admin session cookie and redirects to /admin (login page).
 * Calls requireAdminSession defensively — no-op redirect if already logged out.
 */
export async function logout(): Promise<void> {
  // Defensive: if not logged in, requireAdminSession will redirect to /admin anyway.
  await requireAdminSession();

  const cookieStore = await cookies();
  // Explicit path-scoped clear: cookieStore.delete() may not match a path-scoped cookie.
  cookieStore.set('admin_session', '', { path: '/admin', maxAge: 0 });

  redirect('/admin');
}
