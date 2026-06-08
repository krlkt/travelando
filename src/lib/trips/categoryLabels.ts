import type { ActivityPlaceCategory, FoodPlaceCategory } from './types';

/** Human labels for food wishlist categories, in display order. */
export const FOOD_CATEGORIES: { value: FoodPlaceCategory; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'food', label: 'Street food' },
  { value: 'drink', label: 'Drinks' },
  { value: 'other', label: 'Other' },
];

/** Human labels for activity wishlist categories, in display order. */
export const ACTIVITY_CATEGORIES: {
  value: ActivityPlaceCategory;
  label: string;
}[] = [
  { value: 'sightseeing', label: 'Sightseeing' },
  { value: 'museum', label: 'Museum' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'tour', label: 'Tour' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'other', label: 'Other' },
];

const FOOD_LABELS = new Map(FOOD_CATEGORIES.map((c) => [c.value, c.label]));
const ACTIVITY_LABELS = new Map(
  ACTIVITY_CATEGORIES.map((c) => [c.value, c.label]),
);

/** Label for a food category, falling back to the raw value. */
export function foodCategoryLabel(category: FoodPlaceCategory): string {
  return FOOD_LABELS.get(category) ?? category;
}

/** Label for an activity category, falling back to the raw value. */
export function activityCategoryLabel(category: ActivityPlaceCategory): string {
  return ACTIVITY_LABELS.get(category) ?? category;
}
