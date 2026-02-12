import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a media query and returns whether it matches.
 * Uses useSyncExternalStore to avoid hydration mismatch and flash.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const m = window.matchMedia(query);
      m.addEventListener('change', onStoreChange);
      return () => m.removeEventListener('change', onStoreChange);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false),
    () => false
  );
}
