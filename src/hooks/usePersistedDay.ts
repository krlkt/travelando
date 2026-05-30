'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { pickInitialDay } from '@/lib/trips/activeDayStorage';

/**
 * Day-tab state backed by `localStorage`.
 *
 * Reads the saved day through `useSyncExternalStore` so server and the first
 * client paint both render the deterministic `fallback` (matching SSR markup),
 * then React re-renders with the restored value after hydration — no
 * setState-in-effect and no hydration mismatch. The returned setter persists
 * each change and notifies subscribers. All storage access is guarded so
 * private-mode / disabled storage never throws.
 */
export function usePersistedDay(
  storageKey: string,
  fallback: string,
  validKeys: readonly string[],
): [string, (next: string) => void] {
  // Local subscriber set so writes via the returned setter re-render the hook.
  const listenersRef = useRef<Set<() => void>>(new Set());

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const listeners = listenersRef.current;
      listeners.add(onStoreChange);
      // Keep tabs in sync when another tab writes the same key.
      const onStorage = (e: StorageEvent) => {
        if (e.key === storageKey) onStoreChange();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener('storage', onStorage);
      };
    },
    [storageKey],
  );

  const getStored = useCallback((): string | null => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      // localStorage unavailable (private mode / disabled) — treat as unset.
      return null;
    }
  }, [storageKey]);

  // Server render (and the hydrating client render) sees no stored value, so
  // both resolve to `fallback`.
  const stored = useSyncExternalStore(subscribe, getStored, () => null);
  const day = pickInitialDay({ stored, validKeys, fallback });

  const persistDay = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Ignore write failures — subscribers below still re-render.
      }
      listenersRef.current.forEach((listener) => listener());
    },
    [storageKey],
  );

  return [day, persistDay];
}
