/**
 * Programmatic sitemap with hreflang alternates.
 * FR-172, FR-173, FR-174, ADR-65, NFR-39
 *
 * Entries: 2 homepage (en/es) + 2 per published project (en/es).
 * Revalidates every 3600 seconds to reflect new projects without requiring a rebuild.
 */
import type { MetadataRoute } from 'next';
import { getAllPublishedProjects } from '@/lib/projects/fetch';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jdseguraz.com';
  const projects = await getAllPublishedProjects();
  const now = new Date();

  const homepageEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/en`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${siteUrl}/en`,
          es: `${siteUrl}/es`,
        },
      },
    },
    {
      url: `${siteUrl}/es`,
      lastModified: now,
      alternates: {
        languages: {
          en: `${siteUrl}/en`,
          es: `${siteUrl}/es`,
        },
      },
    },
  ];

  const projectEntries: MetadataRoute.Sitemap = projects.flatMap((project) => [
    {
      url: `${siteUrl}/en/projects/${project.slug}`,
      lastModified: project.updated_at ? new Date(project.updated_at) : now,
      alternates: {
        languages: {
          en: `${siteUrl}/en/projects/${project.slug}`,
          es: `${siteUrl}/es/projects/${project.slug}`,
        },
      },
    },
    {
      url: `${siteUrl}/es/projects/${project.slug}`,
      lastModified: project.updated_at ? new Date(project.updated_at) : now,
      alternates: {
        languages: {
          en: `${siteUrl}/en/projects/${project.slug}`,
          es: `${siteUrl}/es/projects/${project.slug}`,
        },
      },
    },
  ]);

  return [...homepageEntries, ...projectEntries] satisfies MetadataRoute.Sitemap;
}
