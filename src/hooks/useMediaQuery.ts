import { useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query; safe for the first render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)');

/** True on devices whose primary pointer cannot hover (phones, most tablets). */
export const useIsTouch = (): boolean => useMediaQuery('(hover: none) and (pointer: coarse)');
