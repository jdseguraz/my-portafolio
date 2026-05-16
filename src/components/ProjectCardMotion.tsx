'use client';

/**
 * Client-side animation wrapper for a project card.
 * ADR-41 (motion/react), ADR-42 (masonry), ADR-44 (image), ADR-46 (server/client split), ADR-49 (reduced motion)
 * FR-115, FR-116b
 */
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import GitHubIcon from '@/components/icons/GitHubIcon';

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
  liveUrl?: string | null;
  liveLinkLabel?: string;
  repoUrl?: string | null;
  repoLinkLabel?: string;
}

export default function ProjectCardMotion({
  slug,
  localizedTitle,
  coverUrl,
  tags,
  isPriority = false,
  liveUrl,
  liveLinkLabel = 'Open live site',
  repoUrl,
  repoLinkLabel = 'View source on GitHub',
}: ProjectCardMotionProps) {
  const reducedMotion = useReducedMotion();
  const variants = reducedMotion ? staticVariants : cardVariants;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="group relative"
    >
      <Link
        href={`/projects/${slug}`}
        className="block bg-zinc-100 dark:bg-zinc-900 p-4 sm:p-5 shadow-md dark:shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/60"
      >
        {coverUrl && (
          <div className="overflow-hidden">
            <Image
              src={coverUrl}
              alt={localizedTitle}
              width={1200}
              height={800}
              priority={isPriority}
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              style={{ width: '100%', height: 'auto' }}
              className="block transition-transform duration-500 ease-out group-hover:scale-[1.015]"
            />
          </div>
        )}
        <div className="mt-4">
          <h3 className="font-semibold text-base leading-snug tracking-tight">
            {localizedTitle}
          </h3>
          {tags.length > 0 && (
            <p className="text-xs opacity-50 mt-1 truncate">
              {tags.join(', ')}
            </p>
          )}
        </div>
      </Link>
      {(liveUrl || repoUrl) && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1.5 z-10">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={repoLinkLabel}
              title={repoLinkLabel}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm shadow-sm text-foreground/70 hover:text-foreground hover:bg-background hover:scale-105 active:scale-95 transition-all"
            >
              <GitHubIcon size={16} ariaLabel={repoLinkLabel} />
            </a>
          )}
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={liveLinkLabel}
              title={liveLinkLabel}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm shadow-sm text-foreground/70 hover:text-foreground hover:bg-background hover:scale-105 active:scale-95 transition-all"
            >
              <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
