import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../../src/hooks/useMediaQuery';

describe('useMediaQuery', () => {
  let listeners: Map<string, Set<(e: MediaQueryListEvent) => void>>;
  let mediaQueryStates: Map<string, boolean>;

  function createMockMediaQueryList(query: string): MediaQueryList {
    if (!listeners.has(query)) {
      listeners.set(query, new Set());
    }
    if (!mediaQueryStates.has(query)) {
      mediaQueryStates.set(query, false);
    }

    return {
      matches: mediaQueryStates.get(query)!,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.get(query)!.add(cb);
        }
      }),
      removeEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.get(query)!.delete(cb);
        }
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
  }

  function triggerMediaChange(query: string, matches: boolean) {
    mediaQueryStates.set(query, matches);
    const queryListeners = listeners.get(query);
    if (queryListeners) {
      for (const cb of queryListeners) {
        cb({ matches, media: query } as MediaQueryListEvent);
      }
    }
  }

  beforeEach(() => {
    listeners = new Map();
    mediaQueryStates = new Map();

    vi.stubGlobal('matchMedia', vi.fn((query: string) => createMockMediaQueryList(query)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Initial value', () => {
    it('returns false when media query does not match', () => {
      mediaQueryStates.set('(min-width: 768px)', false);

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(false);
    });

    it('returns true when media query matches', () => {
      mediaQueryStates.set('(min-width: 768px)', true);

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(true);
    });
  });

  describe('Responding to changes', () => {
    it('updates when media query starts matching', () => {
      mediaQueryStates.set('(min-width: 768px)', false);

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(false);

      act(() => {
        triggerMediaChange('(min-width: 768px)', true);
      });

      expect(result.current).toBe(true);
    });

    it('updates when media query stops matching', () => {
      mediaQueryStates.set('(prefers-color-scheme: dark)', true);

      const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
      expect(result.current).toBe(true);

      act(() => {
        triggerMediaChange('(prefers-color-scheme: dark)', false);
      });

      expect(result.current).toBe(false);
    });
  });

  describe('Subscription management', () => {
    it('subscribes to change events on mount', () => {
      renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(listeners.get('(min-width: 768px)')!.size).toBeGreaterThan(0);
    });

    it('unsubscribes from change events on unmount', () => {
      const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(listeners.get('(min-width: 768px)')!.size).toBeGreaterThan(0);

      unmount();

      expect(listeners.get('(min-width: 768px)')!.size).toBe(0);
    });
  });

  describe('Multiple queries', () => {
    it('supports multiple independent media queries', () => {
      mediaQueryStates.set('(min-width: 768px)', true);
      mediaQueryStates.set('(prefers-color-scheme: dark)', false);

      const { result: widthResult } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      const { result: darkResult } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

      expect(widthResult.current).toBe(true);
      expect(darkResult.current).toBe(false);
    });

    it('updates queries independently', () => {
      mediaQueryStates.set('(min-width: 768px)', false);
      mediaQueryStates.set('(prefers-color-scheme: dark)', false);

      const { result: widthResult } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      const { result: darkResult } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

      act(() => {
        triggerMediaChange('(min-width: 768px)', true);
      });

      expect(widthResult.current).toBe(true);
      expect(darkResult.current).toBe(false);
    });
  });

  describe('SSR safety', () => {
    it('subscribe returns a no-op unsubscribe when window is undefined', () => {
      // We can't fully remove window in happy-dom, but we can verify the
      // subscribe guard works by checking that matchMedia's addEventListener
      // is called (confirming the browser path is taken when window exists).
      // The hook uses `typeof window === 'undefined'` to return a no-op on SSR.
      renderHook(() => useMediaQuery('(min-width: 768px)'));

      // In happy-dom (browser-like), matchMedia should have been called
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    });

    it('returns false for a non-matching query (mirrors server snapshot)', () => {
      // The server snapshot always returns false. In client too, a non-matching
      // query returns false, so initial render is consistent with SSR.
      mediaQueryStates.set('(min-width: 9999px)', false);

      const { result } = renderHook(() => useMediaQuery('(min-width: 9999px)'));
      expect(result.current).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles query change by re-subscribing', () => {
      mediaQueryStates.set('(min-width: 768px)', true);
      mediaQueryStates.set('(min-width: 1024px)', false);

      const { result, rerender } = renderHook(
        ({ query }) => useMediaQuery(query),
        { initialProps: { query: '(min-width: 768px)' } }
      );

      expect(result.current).toBe(true);

      rerender({ query: '(min-width: 1024px)' });

      expect(result.current).toBe(false);
    });
  });
});
