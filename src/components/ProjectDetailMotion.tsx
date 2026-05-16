'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import GitHubIcon from '@/components/icons/GitHubIcon';

/**
 * W-01 resolution (ADR-75): locale and slug props removed — they were accepted but unused.
 * FR-191.
 */
interface ProjectDetailMotionProps {
  title: string;
  subtitle: string;
  tags: string[];
  descriptionNode: ReactNode;
  galleryUrls: string[];
  backLinkLabel: string;
  galleryHeading: string;
  liveUrl?: string | null;
  liveLinkLabel?: string;
  repoUrl?: string | null;
  repoLinkLabel?: string;
}

export default function ProjectDetailMotion({
  title,
  subtitle,
  tags,
  descriptionNode,
  galleryUrls,
  backLinkLabel,
  galleryHeading,
  liveUrl,
  liveLinkLabel,
  repoUrl,
  repoLinkLabel,
}: ProjectDetailMotionProps) {
  const shouldReduce = useReducedMotion();

  // Normalize: treat undefined as empty (defensive — page always passes ?? [])
  const normalizedGalleryUrls = galleryUrls ?? [];

  const makeAnimate = (delay: number) =>
    shouldReduce
      ? {
          initial: { opacity: 1, y: 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0 },
        }
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay },
        };

  const galleryVariants = shouldReduce
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-50px' },
        transition: { duration: 0.5, delay: 0.2 },
      };

  return (
    <article className="px-4 sm:px-6 py-8 sm:py-12 max-w-3xl mx-auto">
      <motion.section {...makeAnimate(0)} className="mb-8 sm:mb-12">
        <Link
          href="/"
          className="text-sm opacity-70 hover:opacity-100 underline"
          data-testid="nav-link"
        >
          ← {backLinkLabel}
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-6 text-balance leading-[1.1]">
          {title}
        </h1>
        {subtitle && <p className="opacity-70 mt-2 text-balance">{subtitle}</p>}
        {tags && tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded bg-foreground/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {(liveUrl || repoUrl) && (
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {liveUrl && liveLinkLabel && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {liveLinkLabel}
                <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
              </a>
            )}
            {repoUrl && repoLinkLabel && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-foreground/20 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <GitHubIcon size={16} ariaLabel={repoLinkLabel} />
                {repoLinkLabel}
              </a>
            )}
          </div>
        )}
      </motion.section>

      <motion.section {...makeAnimate(0.1)} className="mb-10 sm:mb-16">
        {descriptionNode}
      </motion.section>

      {normalizedGalleryUrls.length > 0 && (
        <motion.section {...galleryVariants} className="mt-8 sm:mt-12">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">{galleryHeading}</h2>
          <div className="space-y-4 sm:space-y-6">
            {normalizedGalleryUrls.map((url, i) => (
              <Image
                key={url}
                src={url}
                alt={`${title} — image ${i + 1}`}
                width={1200}
                height={800}
                style={{ width: '100%', height: 'auto' }}
                className="rounded-lg"
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 768px"
              />
            ))}
          </div>
        </motion.section>
      )}
    </article>
  );
}
