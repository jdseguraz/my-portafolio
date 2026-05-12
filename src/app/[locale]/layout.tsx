import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import PublicHeader from '@/components/PublicHeader';
import type { ReactNode } from 'react';

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

  // MANDATORY: must be first next-intl call
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PublicHeader />
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
