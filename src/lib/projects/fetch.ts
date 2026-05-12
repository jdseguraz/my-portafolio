import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cached Supabase fetchers for published projects.
 * FR-183, FR-184, FR-185, FR-186, FR-187
 * ADR-72: SELECT * so a single cached result satisfies both metadata + page body.
 * ADR-73: 'server-only' as first statement prevents accidental client-bundle inclusion.
 *
 * React.cache() deduplicates by [fnReference, ...args] within a single request scope.
 * Both generateMetadata and the page default export call the SAME function from
 * the SAME module path — guaranteeing ONE DB round-trip per request (NFR-40).
 */

type Project = Database['public']['Tables']['projects']['Row'];

export const getPublishedProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    return data as Project | null;
  },
);

export const getAllPublishedProjects = cache(async (): Promise<Project[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  return (data ?? []) as Project[];
});
