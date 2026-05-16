/**
 * Public home page — gallery of published projects.
 * FR-103, FR-104, FR-105, FR-106, FR-107, ADR-43, ADR-44, ADR-51
 * FR-179, FR-186 — extended metadata + cached fetcher.
 *
 * ISR with 60s revalidation. Renders Hero + MasonryGallery (or EmptyState).
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Hero from '@/components/Hero';
import MasonryGallery from '@/components/MasonryGallery';
import EmptyState from '@/components/EmptyState';
import { getAllPublishedProjects } from '@/lib/projects/fetch';
import { buildAlternates } from '@/lib/seo/alternates';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: buildAlternates('', locale as 'en' | 'es'),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      url: `/${locale}`,
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  // MANDATORY: must be called before any other next-intl API
  setRequestLocale(locale);

  // Fetch published projects via React.cache()-wrapped fetcher (FR-186, ADR-72)
  const safeProjects = await getAllPublishedProjects();

  return (
    <div className="min-h-screen px-4 py-6 sm:py-12 max-w-7xl mx-auto">
      <Hero />
      {safeProjects.length === 0 ? (
        <EmptyState />
      ) : (
        <MasonryGallery projects={safeProjects} locale={locale} />
      )}
    </div>
  );
}
