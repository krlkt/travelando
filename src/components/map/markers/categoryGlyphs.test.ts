import { describe, expect, it } from 'vitest';
import type {
  ActivityPlaceCategory,
  FoodPlaceCategory,
} from '@/lib/trips/types';
import { activityCategoryGlyph, foodCategoryGlyph } from './categoryGlyphs';

const FOOD_CATEGORIES: FoodPlaceCategory[] = [
  'restaurant',
  'cafe',
  'bar',
  'food',
  'drink',
  'other',
];

const ACTIVITY_CATEGORIES: ActivityPlaceCategory[] = [
  'sightseeing',
  'museum',
  'outdoor',
  'entertainment',
  'tour',
  'shopping',
  'nightlife',
  'other',
];

describe('foodCategoryGlyph', () => {
  it.each(FOOD_CATEGORIES)('returns a non-empty glyph for %s', (category) => {
    expect(foodCategoryGlyph(category)).toMatch(/^<(path|circle|line|polygon)/);
  });

  it('falls back to the utensils glyph when category is undefined', () => {
    const fallback = foodCategoryGlyph(undefined);
    expect(fallback).toBe(foodCategoryGlyph('other'));
    expect(fallback).not.toHaveLength(0);
  });

  it('renders distinct glyphs for drink vs restaurant', () => {
    expect(foodCategoryGlyph('drink')).not.toBe(
      foodCategoryGlyph('restaurant'),
    );
  });

  it('renders distinct glyphs for cafe vs restaurant', () => {
    expect(foodCategoryGlyph('cafe')).not.toBe(foodCategoryGlyph('restaurant'));
  });
});

describe('activityCategoryGlyph', () => {
  it.each(ACTIVITY_CATEGORIES)(
    'returns a non-empty glyph for %s',
    (category) => {
      expect(activityCategoryGlyph(category)).toMatch(
        /^<(path|circle|line|polygon)/,
      );
    },
  );

  it('falls back to the camera glyph when category is undefined', () => {
    const fallback = activityCategoryGlyph(undefined);
    expect(fallback).toBe(activityCategoryGlyph('sightseeing'));
    expect(fallback).not.toHaveLength(0);
  });

  it('renders distinct glyphs for museum vs sightseeing', () => {
    expect(activityCategoryGlyph('museum')).not.toBe(
      activityCategoryGlyph('sightseeing'),
    );
  });
});
