/**
 * Server Component — masonry gallery shell.
 * Computes column distributions and delegates rendering to the client motion wrapper.
 * ADR-42 (masonry), ADR-46 (server/client split), FR-111, FR-114
 *
 * No 'use client' — this is a Server Component.
 * Returns null when projects is empty (caller renders EmptyState instead).
 */
import { distributeToColumns } from '@/lib/gallery/distribute-columns';
import type { Database } from '@/lib/supabase/database.types';
import MasonryGalleryAnimated from './MasonryGalleryAnimated';

type Project = Database['public']['Tables']['projects']['Row'];

interface MasonryGalleryProps {
  projects: Project[];
  locale: string;
}

export default async function MasonryGallery({ projects, locale }: MasonryGalleryProps) {
  if (projects.length === 0) {
    return null;
  }

  const one = distributeToColumns(projects, 1);
  const two = distributeToColumns(projects, 2);
  const three = distributeToColumns(projects, 3);

  // The first card in the desktop 3-column first column gets priority loading
  const priorityProjectId = three[0]?.[0]?.id;

  return (
    <MasonryGalleryAnimated
      columns={{ one, two, three }}
      locale={locale}
      priorityProjectId={priorityProjectId}
    />
  );
}
