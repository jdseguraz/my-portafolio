/**
 * Admin login page — server component.
 * ADR-22: NO next-intl. English-only.
 * P1-22: If session cookie is already valid, redirect to /admin/projects.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/session';
import LoginForm from '@/components/admin/LoginForm';

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const { valid } = verifySession(token);

  if (valid) {
    redirect('/admin/projects');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm opacity-60">Portfolio admin access</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
