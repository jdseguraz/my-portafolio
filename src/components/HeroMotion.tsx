'use client';
/**
 * HeroMotion — Client animation wrapper for the Hero component.
 * FR-108, FR-109, FR-110, ADR-41, ADR-46, ADR-49
 *
 * Receives serializable props from the Hero Server Component.
 * Handles motion.div fade-in + translateY on mount with cascading delays.
 * Respects prefers-reduced-motion via useReducedMotion() hook.
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

  return (
    <section className="flex flex-col items-center justify-center text-center pt-16 pb-20 sm:pt-24 sm:pb-28 px-6 gap-8">
      {/* Group 1: Monumental wordmark — fluid type scales with viewport */}
      <motion.div {...makeVariants(0)}>
        <h1
          className="font-bold uppercase leading-[0.85] tracking-[-0.04em] text-balance"
          style={{ fontSize: 'clamp(3rem, 14vw, 11rem)' }}
        >
          {title}
        </h1>
      </motion.div>

      {/* Group 2: Tagline */}
      <motion.div {...makeVariants(0.15)}>
        <p className="text-base sm:text-lg text-foreground/60 max-w-xl text-balance">
          {tagline}
        </p>
      </motion.div>

      {/* Group 3: Social links — small + subtle */}
      <motion.div {...makeVariants(0.3)} className="flex items-center gap-5 mt-2">
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
