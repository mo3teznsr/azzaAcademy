'use client';

import { useSyncExternalStore } from 'react';

/** Entrance ease from BRAND.md motion. */
export const EASE = [0.23, 1, 0.32, 1] as const;

function mediaStore(query: string) {
  const subscribe = (cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener('change', cb);
    return () => m.removeEventListener('change', cb);
  };
  return { subscribe, get: () => window.matchMedia(query).matches };
}

const RM = mediaStore('(prefers-reduced-motion: reduce)');
const FINE = mediaStore('(hover: hover) and (pointer: fine)');
const WIDE = mediaStore('(min-width: 768px)');

/**
 * Reduced motion, `false` during SSR and hydration, then the real value (no hydration mismatch:
 * framer's `useReducedMotion` reads matchMedia on the first client render).
 */
export const useCalm = () => useSyncExternalStore(RM.subscribe, RM.get, () => false);
/** Mouse or trackpad (cursor effects only there). */
export const useFinePointer = () => useSyncExternalStore(FINE.subscribe, FINE.get, () => false);
/** md and up: sticky sequences run here; below they become stacked cards. */
export const useWide = () => useSyncExternalStore(WIDE.subscribe, WIDE.get, () => false);

/** Scroll-linked sequences run only on wide screens without reduced motion. */
export function useSequence() {
  const calm = useCalm();
  const wide = useWide();
  return wide && !calm;
}
