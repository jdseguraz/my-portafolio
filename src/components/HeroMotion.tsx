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
// Note: lucide-react v1 removed branded icons (Github, Linkedin).
// Using ExternalLink + Globe as functional proxies with aria-labels for accessibility.
import { ExternalLink, Globe, Mail } from 'lucide-react';

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
    <section className="flex flex-col items-center justify-center text-center py-24 px-6 gap-6">
      {/* Group 1: Title */}
      <motion.div {...makeVariants(0)}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      </motion.div>

      {/* Group 2: Tagline */}
      <motion.div {...makeVariants(0.1)}>
        <p className="text-xl text-foreground/70 max-w-prose">{tagline}</p>
      </motion.div>

      {/* Group 3: Social links */}
      <motion.div {...makeVariants(0.2)} className="flex items-center gap-6">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <ExternalLink size={24} aria-label="GitHub" />
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <Globe size={24} aria-label="LinkedIn" />
        </a>
        <a
          href={`mailto:${email}`}
          aria-label="Email"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <Mail size={24} aria-label="Email" />
        </a>
      </motion.div>
    </section>
  );
}
