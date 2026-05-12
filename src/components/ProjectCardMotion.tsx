'use client';

/**
 * Client-side animation wrapper for a project card.
 * ADR-41 (motion/react), ADR-42 (masonry), ADR-44 (image), ADR-46 (server/client split), ADR-49 (reduced motion)
 * FR-115, FR-116b
 */
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const staticVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

interface ProjectCardMotionProps {
  slug: string;
  localizedTitle: string;
  coverUrl: string | null;
  tags: string[];
  isPriority?: boolean;
  locale?: string;
}

export default function ProjectCardMotion({
  slug,
  localizedTitle,
  coverUrl,
  tags,
  isPriority = false,
}: ProjectCardMotionProps) {
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? staticVariants : cardVariants;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="group"
    >
      <Link href={`/projects/${slug}`}>
        {coverUrl && (
          <div className="overflow-hidden rounded-lg mb-3">
            <Image
              src={coverUrl}
              alt={localizedTitle}
              width={1200}
              height={800}
              priority={isPriority}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              style={{ width: '100%', height: 'auto' }}
              className="block transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <h3 className="font-semibold text-base leading-snug mb-2">{localizedTitle}</h3>
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
