'use client';

/**
 * BackgroundAmbient — three ambient layers behind the public site.
 *
 *  1. Grain: a tiled SVG noise texture at very low opacity — gives the
 *     background an organic, film-grain feel that's always present.
 *  2. Orbs: three large, heavily-blurred radial gradients drifting on
 *     slow keyframe loops (20-32s) — provide premium "breath" motion
 *     that never competes with foreground content.
 *  3. Cursor spotlight: a soft radial gradient that follows the pointer
 *     on devices with a fine pointer (mouse/trackpad). Hidden on touch.
 *
 * Sits fixed inset-0 at z-index -10, pointer-events-none so it never
 * blocks interaction with anything above it. Respects
 * `prefers-reduced-motion` — orbs become static, cursor spotlight is
 * disabled.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Tiny SVG noise as a data URI — repeats edge-to-edge.
// feTurbulence + transparent baseFrequency gives a film-grain look.
const GRAIN_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>";

export default function BackgroundAmbient() {
  const shouldReduce = useReducedMotion();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hasFinePointer, setHasFinePointer] = useState(false);

  // Detect mouse-vs-touch on mount (avoids SSR mismatch on initial render).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasFinePointer(window.matchMedia('(pointer: fine)').matches);
  }, []);

  // Track pointer position — only attached when we have a fine pointer
  // AND the user hasn't requested reduced motion. Updates are passive.
  useEffect(() => {
    if (!hasFinePointer || shouldReduce) return;
    const handler = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, [hasFinePointer, shouldReduce]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -10 }}
    >
      {/* Layer 1 — film grain */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* Layer 2 — drifting orbs (3 of them, different colors + paths + tempos) */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          top: '8%',
          left: '12%',
          width: '38rem',
          height: '38rem',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)',
        }}
        animate={
          shouldReduce
            ? undefined
            : { x: [0, 60, -40, 0], y: [0, -50, 30, 0] }
        }
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          top: '48%',
          left: '58%',
          width: '34rem',
          height: '34rem',
          background:
            'radial-gradient(circle, rgba(168,85,247,0.20), transparent 70%)',
        }}
        animate={
          shouldReduce
            ? undefined
            : { x: [0, -80, 40, 0], y: [0, 40, -60, 0] }
        }
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          top: '68%',
          left: '18%',
          width: '30rem',
          height: '30rem',
          background:
            'radial-gradient(circle, rgba(251,191,36,0.16), transparent 70%)',
        }}
        animate={
          shouldReduce ? undefined : { x: [0, 50, 0], y: [0, -30, 0] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Layer 3 — cursor spotlight (desktop only, reduced-motion-safe) */}
      {hasFinePointer && !shouldReduce && pos && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(640px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.06), transparent 45%)`,
            transition: 'background 120ms ease-out',
          }}
        />
      )}
    </div>
  );
}
