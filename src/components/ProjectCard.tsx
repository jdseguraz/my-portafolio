/**
 * Server Component wrapper for a project card.
 * Resolves localized title and passes serializable props to the client motion wrapper.
 * ADR-46 (server/client split), FR-115, FR-116
 *
 * No 'use client' — this is a Server Component.
 * cover_image_url null → skip rendering the image (graceful fallback).
 */
import { getLocalizedField } from '@/lib/i18n/fallback';
import type { Database } from '@/lib/supabase/database.types';
import ProjectCardMotion from './ProjectCardMotion';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectCardProps {
  project: Project;
  locale: string;
  isPriority?: boolean;
}

export default async function ProjectCard({ project, locale, isPriority = false }: ProjectCardProps) {
  const localizedTitle = getLocalizedField(project, 'title', locale as 'en' | 'es');

  return (
    <ProjectCardMotion
      slug={project.slug}
      localizedTitle={localizedTitle}
      coverUrl={project.cover_image_url}
      tags={project.tags}
      isPriority={isPriority}
      locale={locale}
    />
  );
}
