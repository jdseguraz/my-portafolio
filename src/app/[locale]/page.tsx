/**
 * Public home page — gallery of published projects.
 * FR-103, FR-104, FR-105, FR-106, FR-107, ADR-43, ADR-44, ADR-51
 *
 * ISR with 60s revalidation. Renders Hero + MasonryGallery (or EmptyState).
 * Removes the old floater controls (ThemeToggle + LocaleSwitcher) moved to PublicHeader (PR3).
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Hero from '@/components/Hero';
import MasonryGallery from '@/components/MasonryGallery';
import EmptyState from '@/components/EmptyState';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  // MANDATORY: must be called before any other next-intl API
  setRequestLocale(locale);

  // Fetch published projects ordered by display_order ASC, then created_at DESC
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  const safeProjects = projects ?? [];

  return (
    <main className="min-h-screen px-4 py-12 max-w-7xl mx-auto">
      <Hero />
      {safeProjects.length === 0 ? (
        <EmptyState />
      ) : (
        <MasonryGallery projects={safeProjects} locale={locale} />
      )}
    </main>
  );
}
