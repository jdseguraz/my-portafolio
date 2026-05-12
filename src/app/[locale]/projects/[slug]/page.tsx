/**
 * Project detail stub — /[locale]/projects/[slug]
 * FR-118, FR-119, FR-120, FR-121, ADR-50
 *
 * Server Component. Fetches published project by slug, returns 404 on miss.
 * FASE 4: replace body with Markdown render + gallery_images carousel.
 */
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLocalizedField } from '@/lib/i18n/fallback';

// ISR — consistent with index page strategy (FR-121)
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

  // .eq('published', true) is defense-in-depth; RLS also enforces this for anon role.
  if (!project) notFound();

  const t = await getTranslations('nav');
  const title = getLocalizedField(project, 'title', locale as 'en' | 'es');
  const subtitle = getLocalizedField(project, 'subtitle', locale as 'en' | 'es');

  // FASE 4: replace body with Markdown render (react-markdown) + gallery_images carousel.
  return (
    <article className="px-6 py-12 max-w-3xl mx-auto">
      <Link href="/" className="text-sm opacity-70 hover:opacity-100 underline" data-testid="nav-link">
        ← {t('backToGallery')}
      </Link>
      <h1 className="text-4xl font-bold mt-6">{title}</h1>
      {subtitle && <p className="opacity-70 mt-2">{subtitle}</p>}
      <div className="flex gap-2 flex-wrap mt-4">
        {project.tags?.map((tag) => (
          <span key={tag} className="px-2 py-1 text-xs rounded bg-foreground/10">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
