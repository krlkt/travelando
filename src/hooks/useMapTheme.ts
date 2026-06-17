'use client';

import { useEffect, useState } from 'react';
import type { MapTheme } from '@/lib/map/style';

/** Resolves the current map theme from the `dark` class or the OS preference. */
export function resolveMapTheme(): MapTheme {
  if (typeof document === 'undefined') return 'light';
  if (document.documentElement.classList.contains('dark')) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Tracks the basemap theme. The lazy initializer resolves up front (no
 * setState-in-effect); the effect only subscribes to later system-theme changes.
 */
export function useMapTheme(): MapTheme {
  const [theme, setTheme] = useState<MapTheme>(resolveMapTheme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(resolveMapTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return theme;
}
