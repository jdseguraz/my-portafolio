/**
 * Public root layout — merged root + locale layout.
 * ADR-62, ADR-63, ADR-67, ADR-78
 * This file is the root layout for the (public) route group.
 * It renders <html lang={locale}> (dynamic per locale — resolves ADR-52).
 * It also hosts metadataBase (ADR-67) and the Supabase preconnect hint (ADR-78).
 */
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import PublicHeader from '@/components/PublicHeader';
import ThemeProvider from '@/components/theme-provider';
import BackgroundAmbient from '@/components/BackgroundAmbient';
import type { ReactNode } from 'react';
import '../../globals.css';

// Static metadata export — metadataBase is resolved once here for all public routes (ADR-67).
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jdseguraz.com'),
  title: {
    template: '%s — Juan Segura',
    default: 'Juan Segura — Developer',
  },
};

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale before any next-intl call
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // MANDATORY: must be first next-intl call (next-intl SSR contract)
  setRequestLocale(locale);

  const messages = await getMessages();

  // Derive Supabase host for preconnect hint (ADR-78)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {supabaseHost && <link rel="preconnect" href={supabaseHost} />}
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <BackgroundAmbient />
          <NextIntlClientProvider messages={messages}>
            <PublicHeader />
            <main>{children}</main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
