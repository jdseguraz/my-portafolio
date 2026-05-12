import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import ThemeProvider from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Juan Segura — Developer',
  description: 'Personal portfolio — projects, ideas, and contact.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO Fase 5: make lang dynamic per locale. Root layout cannot read params; restructuring deferred to Fase 5 SEO pass. (ADR-52, C-17)
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
