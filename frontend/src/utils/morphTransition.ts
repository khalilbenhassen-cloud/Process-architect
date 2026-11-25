import { flushSync } from 'react-dom';

/**
 * Runs a state update inside the browser's native View Transitions API (Apple Keynote Morph / Magic Move)
 * when available, falling back cleanly to a direct update in unsupported environments (e.g. jsdom).
 */
export function runMorphTransition(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => {
      flushSync(() => {
        update();
      });
    });
  } else {
    update();
  }
}
