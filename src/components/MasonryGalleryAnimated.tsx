'use client';

/**
 * Client-side animated shell for the masonry gallery.
 * Three responsive-visibility blocks: 1-col mobile (<640px), 2-col tablet
 * (640-1023px), 3-col desktop (1024px+). Editorial masonry per PRD §2 (Dann Petty).
 * ADR-41 (motion/react), ADR-42 (masonry columns), ADR-46 (server/client split), ADR-49 (reduced motion)
 * FR-112, FR-113
 */
import { motion, useReducedMotion } from 'motion/react';
import type { Database } from '@/lib/supabase/database.types';
import ProjectCardMotion from './ProjectCardMotion';
import { getLocalizedField } from '@/lib/i18n/fallback';

type Project = Database['public']['Tables']['projects']['Row'];

interface MasonryGalleryAnimatedProps {
  columns: {
    one: Project[][];
    two: Project[][];
    three: Project[][];
  };
  locale: string;
  /** ID of the project whose card should get priority image loading (desktop 3-col, col-0, item-0). */
  priorityProjectId?: string;
  /** Localized aria-label for the external-link icon on each card (e.g. "Open live site"). */
  liveLinkLabel?: string;
  /** Localized aria-label for the GitHub icon on each card (e.g. "View source on GitHub"). */
  repoLinkLabel?: string;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staticContainerVariants = {
  hidden: {},
  visible: {},
};

export default function MasonryGalleryAnimated({
  columns,
  locale,
  priorityProjectId,
  liveLinkLabel,
  repoLinkLabel,
}: MasonryGalleryAnimatedProps) {
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? staticContainerVariants : containerVariants;

  function renderColumn(projects: Project[], colIndex: number, layoutColumns: number) {
    return (
      <motion.div
        key={colIndex}
        data-testid={`col-3-${colIndex}`}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="flex flex-col gap-5 min-[1280px]:gap-6 flex-1"
      >
        {projects.map((project) => {
          const localizedTitle = getLocalizedField(project, 'title', locale as 'en' | 'es');
          const isPriority =
            layoutColumns === 3 && project.id === priorityProjectId;
          return (
            <ProjectCardMotion
              key={project.id}
              slug={project.slug}
              localizedTitle={localizedTitle}
              coverUrl={project.cover_image_url}
              tags={project.tags}
              isPriority={isPriority}
              locale={locale}
              liveUrl={project.live_url}
              liveLinkLabel={liveLinkLabel}
              repoUrl={project.repo_url}
              repoLinkLabel={repoLinkLabel}
            />
          );
        })}
      </motion.div>
    );
  }

  return (
    <>
      {/* Mobile: 1 column (<640px) */}
      <div
        data-testid="layout-1col"
        className="flex flex-col gap-4 sm:hidden"
      >
        {columns.one[0]?.map((project) => (
          <ProjectCardMotion
            key={project.id}
            slug={project.slug}
            localizedTitle={getLocalizedField(project, 'title', locale as 'en' | 'es')}
            coverUrl={project.cover_image_url}
            tags={project.tags}
            isPriority={false}
            locale={locale}
            liveUrl={project.live_url}
            liveLinkLabel={liveLinkLabel}
            repoUrl={project.repo_url}
            repoLinkLabel={repoLinkLabel}
          />
        ))}
      </div>

      {/* Tablet: 2 columns (640px – 1023px) */}
      <div
        data-testid="layout-2col"
        className="hidden sm:flex min-[1024px]:hidden gap-4 sm:gap-5"
      >
        {columns.two.map((col, ci) => (
          <div key={ci} data-testid={`col-2-${ci}`} className="flex flex-col gap-4 flex-1">
            {col.map((project) => (
              <ProjectCardMotion
                key={project.id}
                slug={project.slug}
                localizedTitle={getLocalizedField(project, 'title', locale as 'en' | 'es')}
                coverUrl={project.cover_image_url}
                tags={project.tags}
                isPriority={false}
                locale={locale}
                liveUrl={project.live_url}
                liveLinkLabel={liveLinkLabel}
                repoUrl={project.repo_url}
                repoLinkLabel={repoLinkLabel}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: 3 columns (1024px+) */}
      <div
        data-testid="layout-3col"
        className="hidden min-[1024px]:flex gap-5 min-[1280px]:gap-6"
      >
        {columns.three.map((col, ci) => renderColumn(col, ci, 3))}
      </div>
    </>
  );
}
