import { RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * Subtle Apple HIG GSAP staggered reveal for card grids & list sections.
 * Animates composite properties only (opacity + translateY) and clears inline styles after completion.
 */
export function useStaggerReveal(
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  deps: unknown[] = []
) {
  useGSAP(
    () => {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
      const root = containerRef.current;
      if (!root) return;
      const targets = root.querySelectorAll(selector);
      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.34,
          stagger: 0.035,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          overwrite: 'auto',
        }
      );
    },
    { scope: containerRef, dependencies: deps }
  );
}
