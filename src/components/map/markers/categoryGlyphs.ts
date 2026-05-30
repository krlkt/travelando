import type {
  ActivityPlaceCategory,
  FoodPlaceCategory,
} from '@/lib/trips/types';

// Inline lucide-derived SVG path data (no surrounding <svg>) so the caller can
// wrap it with its own `svg()` helper. Markers are imperative DOM nodes managed
// by MapLibre, so we can't mount React/lucide components — we ship the raw paths.
// Keep these visually simple: markers render at ~14–18px.
const PATH = {
  // lucide: utensils-crossed
  utensils:
    '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/>',
  // lucide: coffee
  coffee:
    '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  // lucide: wine
  wine: '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
  // lucide: soup
  soup: '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>',
  // lucide: glass-water
  glassWater:
    '<path d="M5 3h14l-1.4 14.5a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 3Z"/><path d="M6 8h12"/>',
  // lucide: camera
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  // lucide: landmark
  landmark:
    '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  // lucide: tree-pine
  treePine:
    '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>',
  // lucide: clapperboard
  clapperboard:
    '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  // lucide: flag
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  // lucide: shopping-bag
  shoppingBag:
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  // lucide: music
  music:
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
} as const;

const FOOD_GLYPHS: Record<FoodPlaceCategory, string> = {
  restaurant: PATH.utensils,
  cafe: PATH.coffee,
  bar: PATH.wine,
  food: PATH.soup,
  drink: PATH.glassWater,
  other: PATH.utensils,
};

const ACTIVITY_GLYPHS: Record<ActivityPlaceCategory, string> = {
  sightseeing: PATH.camera,
  museum: PATH.landmark,
  outdoor: PATH.treePine,
  entertainment: PATH.clapperboard,
  tour: PATH.flag,
  shopping: PATH.shoppingBag,
  nightlife: PATH.music,
  other: PATH.camera,
};

/** SVG path data for a food wishlist marker, by category. Falls back to the
 *  generic utensils glyph when the category is unset or unrecognized. */
export function foodCategoryGlyph(category?: FoodPlaceCategory): string {
  return (category && FOOD_GLYPHS[category]) || PATH.utensils;
}

/** SVG path data for an activity wishlist marker, by category. Falls back to the
 *  generic camera glyph when the category is unset or unrecognized. */
export function activityCategoryGlyph(
  category?: ActivityPlaceCategory,
): string {
  return (category && ACTIVITY_GLYPHS[category]) || PATH.camera;
}
