'use client';

import { useEffect, useRef, useState } from 'react';
import { pickInitialDay } from '@/lib/trips/activeDayStorage';

/**
 * Day-tab state backed by `localStorage`.
 *
 * Seeds with the deterministic `fallback` so server and client render the same
 * markup, then restores any saved day once after mount (avoiding a hydration
 * mismatch). The returned setter persists each change. All storage access is
 * guarded so private-mode / disabled storage never throws.
 */
export function usePersistedDay(
  storageKey: string,
  fallback: string,
  validKeys: readonly string[],
): [string, (next: string) => void] {
  const [day, setDay] = useState(fallback);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const stored = window.localStorage.getItem(storageKey);
      const initial = pickInitialDay({ stored, validKeys, fallback });
      if (initial !== day) {
        setDay(initial);
      }
    } catch {
      // localStorage unavailable (private mode / disabled) — keep the fallback.
    }
    // Runs once on mount; intentionally not reacting to later prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persistDay = (next: string) => {
    setDay(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Ignore write failures — the in-memory tab still updates.
    }
  };

  return [day, persistDay];
}
