/**
 * MapTiler basemap configuration. The key is a public, referrer-restricted
 * token (`NEXT_PUBLIC_MAPTILER_KEY`). When it is absent the map surface renders
 * a graceful fallback instead of failing — the rest of the app is unaffected.
 */

export type MapTheme = 'light' | 'dark';

// Muted "dataviz" styles keep the basemap quiet so trip pins stay the focus,
// rather than the stock saturated street style.
const STYLE_ID: Record<MapTheme, string> = {
  light: 'dataviz-light',
  dark: 'dataviz-dark',
};

export function getMapTilerKey(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPTILER_KEY || undefined;
}

export function isMapConfigured(): boolean {
  return !!getMapTilerKey();
}

export function buildStyleUrl(theme: MapTheme): string | null {
  const key = getMapTilerKey();
  if (!key) return null;
  return `https://api.maptiler.com/maps/${STYLE_ID[theme]}/style.json?key=${key}`;
}
