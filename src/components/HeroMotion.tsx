'use client';
/**
 * HeroMotion — Client animation wrapper for the Hero component.
 * FR-108, FR-109, FR-110, ADR-41, ADR-46, ADR-49
 *
 * Receives serializable props from the Hero Server Component.
 *
 * Title: per-letter cascading fall — each character drops in from above
 *   with stagger (0.04s) and ease-out (0.5s per letter). Spaces are
 *   non-breaking so the giant wordmark stays on the visual baseline.
 * Tagline + social row: fade-in + translateY, delayed until after the
 *   title has settled (~0.9s / ~1.1s).
 * Respects prefers-reduced-motion via useReducedMotion() — all per-letter
 *   motion collapses to an instant render, including tagline + social.
 */

import { motion, useReducedMotion } from 'motion/react';
import { Mail } from 'lucide-react';
import GitHubIcon from '@/components/icons/GitHubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';

export interface HeroMotionProps {
  title: string;
  tagline: string;
  name: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
}

// Per-letter cascade timings — kept small enough that the title settles
// before the user starts reading; tagline picks up the beat.
const LETTER_STAGGER = 0.04;
const LETTER_DURATION = 0.5;
const TAGLINE_DELAY = 0.9;
const SOCIAL_DELAY = 1.1;

const titleContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: LETTER_STAGGER } },
};

const letterVariants = {
  hidden: { y: -60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: LETTER_DURATION, ease: [0.2, 0.65, 0.3, 0.95] as const },
  },
};

export default function HeroMotion({
  title,
  tagline,
  // name is part of the Profile prop contract (ADR-47) — available for subheadings in future phases
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  name: _name,
  email,
  githubUrl,
  linkedinUrl,
}: HeroMotionProps) {
  const shouldReduce = useReducedMotion();

  // ADR-49: When reduced motion is preferred, animate to visible state instantly.
  function makeVariants(delay: number) {
    if (shouldReduce) {
      return {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay },
    };
  }

  // Split the title into characters so each one can animate independently.
  // Spaces are rendered as non-breaking so they keep their width inside the
  // inline-block layout that motion.span requires for transforms.
  const titleChars = title.split('');

  return (
    <section className="flex flex-col items-center justify-center text-center pt-16 pb-20 sm:pt-24 sm:pb-28 px-6 gap-8">
      {/* Group 1: Monumental wordmark — letters cascade in */}
      <motion.h1
        className="font-bold uppercase leading-[0.85] tracking-[-0.04em] text-balance"
        style={{ fontSize: 'clamp(3rem, 14vw, 11rem)' }}
        variants={shouldReduce ? undefined : titleContainerVariants}
        initial={shouldReduce ? undefined : 'hidden'}
        animate={shouldReduce ? undefined : 'visible'}
        aria-label={title}
      >
        {titleChars.map((char, i) => (
          <motion.span
            key={`${char}-${i}`}
            variants={shouldReduce ? undefined : letterVariants}
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
            aria-hidden="true"
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        ))}
      </motion.h1>

      {/* Group 2: Tagline — delayed until the title has nearly settled */}
      <motion.div {...makeVariants(TAGLINE_DELAY)}>
        <p className="text-base sm:text-lg text-foreground/60 max-w-xl text-balance">
          {tagline}
        </p>
      </motion.div>

      {/* Group 3: Social links — small + subtle */}
      <motion.div {...makeVariants(SOCIAL_DELAY)} className="flex items-center gap-5 mt-2">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <GitHubIcon size={20} ariaLabel="GitHub" />
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <LinkedInIcon size={20} ariaLabel="LinkedIn" />
        </a>
        <a
          href={`mailto:${email}`}
          aria-label="Email"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <Mail size={20} strokeWidth={1.75} aria-label="Email" />
        </a>
      </motion.div>
    </section>
  );
}
