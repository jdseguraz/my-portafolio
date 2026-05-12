/**
 * Project detail page — /[locale]/projects/[slug]
 * FR-132–FR-163, ADR-53, ADR-54, ADR-60, NFR-32, NFR-37
 * FR-180, FR-183, FR-185, FR-191 — extended metadata + cached fetcher + W-01 cleanup.
 *
 * Server Component. ISR (revalidate=60). Fetches published project by slug.
 * Both generateMetadata AND the page body use getPublishedProjectBySlug(slug)
 * from the SAME module path — React.cache() deduplicates to ONE DB query (NFR-40).
 * Renders Markdown server-side and passes as React-node prop to ProjectDetailMotion.
 * Zero react-markdown / remark-gfm / rehype-highlight in the client bundle (NFR-32).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getLocalizedField } from '@/lib/i18n/fallback';
import { profile } from '@/lib/profile';
import { getPublishedProjectBySlug } from '@/lib/projects/fetch';
import { buildAlternates } from '@/lib/seo/alternates';
import ProjectDetailMotion from '@/components/ProjectDetailMotion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// ISR — consistent with index page strategy (NFR-37, FR-121 carry-forward)
export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * generateMetadata — extended with alternates, openGraph, twitter (FR-180).
 * Shares getPublishedProjectBySlug with the page body via React.cache() (FR-185).
 * Returns {} for missing/unpublished projects — page body handles 404.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getPublishedProjectBySlug(slug);

  if (!project) return {};

  const localizedTitle = getLocalizedField(project, 'title', locale as 'en' | 'es');
  const localizedSubtitle =
    getLocalizedField(project, 'subtitle', locale as 'en' | 'es') ?? '';

  const title = `${localizedTitle} — ${profile.name}`;
  const description = localizedSubtitle.slice(0, 160);

  return {
    title,
    description,
    alternates: buildAlternates(`projects/${slug}`, locale as 'en' | 'es'),
    openGraph: {
      title,
      description,
      type: 'article',
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      url: `/${locale}/projects/${slug}`,
      images: project.cover_image_url
        ? [
            {
              url: project.cover_image_url,
              width: 1200,
              height: 800,
              alt: localizedTitle,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      images: project.cover_image_url ? [project.cover_image_url] : [],
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Same cached fetcher as generateMetadata — React.cache() deduplicates the DB query
  const project = await getPublishedProjectBySlug(slug);

  // .eq('published', true) is defense-in-depth; null on miss or unpublished.
  if (!project) notFound();

  // Translations — two namespace calls to preserve stub test contract (ADR-61)
  const tNav = await getTranslations('nav');
  const tGallery = await getTranslations('gallery');

  // Locale-aware field resolution (FR-136, C-23)
  const title = getLocalizedField(project, 'title', locale as 'en' | 'es');
  const subtitle = getLocalizedField(project, 'subtitle', locale as 'en' | 'es');
  const description = getLocalizedField(project, 'description', locale as 'en' | 'es');

  // ADR-53: Render Markdown server-side; pass resolved React node to client motion wrapper.
  // react-markdown / remark-gfm / rehype-highlight NEVER imported in ProjectDetailMotion.
  const descriptionNode = (
    <article className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {description}
      </ReactMarkdown>
    </article>
  );

  // Gallery images — null-safe (FR-156)
  const galleryUrls = project.gallery_images ?? [];

  return (
    <ProjectDetailMotion
      title={title}
      subtitle={subtitle}
      tags={project.tags ?? []}
      descriptionNode={descriptionNode}
      galleryUrls={galleryUrls}
      backLinkLabel={tNav('backToGallery')}
      galleryHeading={tGallery('heading')}
    />
  );
}
