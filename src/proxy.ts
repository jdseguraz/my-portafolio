/**
 * Next 16 proxy (renamed from middleware.ts per proxy.md line 11).
 * ADR-16: Admin branch short-circuits before next-intl delegation.
 *
 * Two layers of defense for admin routes:
 *  Layer 1 (this file): quick cookie check on every request.
 *  Layer 2 (requireAdminSession): canonical check inside every Server Action.
 */
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { decideAdminRoute } from '@/lib/auth/proxy-gate';

const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin branch — runs BEFORE intl, never delegates.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const cookieToken = request.cookies.get('admin_session')?.value ?? null;
    const decision = decideAdminRoute(pathname, cookieToken);

    switch (decision.kind) {
      case 'redirect':
        return NextResponse.redirect(new URL(decision.to, request.url));
      case 'next':
        return NextResponse.next();
      case 'delegate':
        // Admin path matched but delegate returned — shouldn't happen; fall through to intl.
        break;
    }
  }

  // Public branch — delegate to next-intl.
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Root: explicit entry so next-intl can redirect `/` → `/{detected-locale}`.
    // The generic pattern below SHOULD cover it, but Next 16's path-to-regexp can
    // miss the root path in practice — keep `/` explicit for resilience.
    '/',
    // Public paths handled by next-intl. Excludes admin/api/_next/static assets.
    '/((?!admin|api|_next|.*\\..*).*)',
    // Admin path tree — both entries for explicitness and path-to-regexp version resilience.
    '/admin',
    '/admin/:path*',
  ],
};
