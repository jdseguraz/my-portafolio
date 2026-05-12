'use client';

/**
 * Client-side animated shell for the masonry gallery.
 * Three responsive-visibility blocks (1-col, 2-col, 3-col) handled via Tailwind.
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
  /** ID of the project whose card should get priority image loading (desktop col-0, item-0) */
  priorityProjectId?: string;
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
}: MasonryGalleryAnimatedProps) {
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? staticContainerVariants : containerVariants;

  function renderColumn(projects: Project[], colIndex: number, layoutColumns: number) {
    return (
      <motion.div
        key={colIndex}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="flex flex-col gap-6 flex-1"
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
            />
          );
        })}
      </motion.div>
    );
  }

  return (
    <>
      {/* Mobile: 1 column */}
      <div
        data-testid="layout-1col"
        className="flex flex-col gap-6 sm:hidden"
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
          />
        ))}
      </div>

      {/* Tablet: 2 columns */}
      <div
        data-testid="layout-2col"
        className="hidden sm:flex md:hidden gap-6"
      >
        {columns.two.map((col, ci) => (
          <div key={ci} data-testid={`col-2-${ci}`} className="flex flex-col gap-6 flex-1">
            {col.map((project) => (
              <ProjectCardMotion
                key={project.id}
                slug={project.slug}
                localizedTitle={getLocalizedField(project, 'title', locale as 'en' | 'es')}
                coverUrl={project.cover_image_url}
                tags={project.tags}
                isPriority={false}
                locale={locale}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: 3 columns */}
      <div
        data-testid="layout-3col"
        className="hidden md:flex gap-6"
      >
        {columns.three.map((col, ci) => renderColumn(col, ci, 3))}
      </div>
    </>
  );
}
