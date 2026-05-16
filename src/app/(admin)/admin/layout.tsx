/**
 * Admin root layout — merged root + admin chrome layout.
 * ADR-62, ADR-64
 * This file is the root layout for the (admin) route group.
 * It renders <html lang="en"> (fixed English — admin is English-only per ADR-22).
 * No NextIntlClientProvider. No PublicHeader.
 */
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import ThemeProvider from '@/components/theme-provider';
import { logout } from './actions';
import '../../globals.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen flex flex-col">
            <header className="border-b px-6 py-4 flex items-center justify-between">
              <span className="font-semibold tracking-tight">Admin</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                >
                  Sign out
                </button>
              </form>
            </header>
            <main className="flex-1 px-6 py-8">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
