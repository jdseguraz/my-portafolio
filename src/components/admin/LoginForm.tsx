'use client';

/**
 * Admin login form — client component.
 * ADR-22: NO next-intl. English-only.
 * Uses useActionState (React 19) for form error display.
 */

import { useActionState } from 'react';
import { login } from '@/app/(admin)/admin/actions';

type LoginState = { ok: false; error: string } | null;

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    async (_prev: LoginState, formData: FormData) => {
      const result = await login(formData);
      // If login succeeds it redirects — we only receive a return value on error.
      return result ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? 'login-error' : undefined}
        />
      </div>

      {state?.error && (
        <p id="login-error" className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
