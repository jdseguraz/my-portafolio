/**
 * Project detail page — /[locale]/projects/[slug]
 * FR-132–FR-163, ADR-53, ADR-54, ADR-60, NFR-32, NFR-37
 *
 * Server Component. ISR (revalidate=60). Fetches published project by slug.
 * Renders Markdown server-side and passes as React-node prop to ProjectDetailMotion.
 * Zero react-markdown / remark-gfm / rehype-highlight in the client bundle (NFR-32).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getLocalizedField } from '@/lib/i18n/fallback';
import { profile } from '@/lib/profile';
import ProjectDetailMotion from '@/components/ProjectDetailMotion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// ISR — consistent with index page strategy (NFR-37, FR-121 carry-forward)
export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

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
      locale={locale}
      slug={slug}
    />
  );
}

/**
 * generateMetadata — locale-aware title + truncated subtitle (ADR-60).
 * Returns {} for missing/unpublished projects — page body handles 404.
 * DR4-08: accepted duplicate query at portfolio scale; Fase 5 can add React.cache().
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('title_en,title_es,subtitle_en,subtitle_es')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (!project) return {};

  const localizedTitle = getLocalizedField(project, 'title', locale as 'en' | 'es');
  const localizedSubtitle =
    getLocalizedField(project, 'subtitle', locale as 'en' | 'es') ?? '';

  return {
    title: `${localizedTitle} — ${profile.name}`,
    description: localizedSubtitle.slice(0, 160),
  };
}
