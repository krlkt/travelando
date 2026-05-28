import { z } from 'zod';

const placeSchema = z.object({
  label: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeId: z.string().optional(),
});

const moneySchema = z.object({
  amount: z.number(),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code'),
});

export const tripDraftSchema = z.object({
  title: z.string().min(1),
  destination: z.string().min(1),
  coverImage: z.string().url().optional(),
  coverGradient: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const tripPatchSchema = tripDraftSchema.partial();

export const tripMemberDraftSchema = z
  .object({
    email: z.string().email().optional(),
    displayName: z.string().min(1).max(80).optional(),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.displayName), {
    message: 'email or displayName is required',
  });

export const tripMemberPatchSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
});

export const itemKindSchema = z.enum([
  'transport',
  'activity',
  'lodging',
  'meal',
  'note',
]);

export const transportModeSchema = z.enum([
  'flight',
  'train',
  'car',
  'bus',
  'ferry',
  'walk',
  'metro',
  'taxi',
]);

export const itemDraftSchema = z.object({
  kind: itemKindSchema,
  title: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  from: placeSchema.optional(),
  to: placeSchema.optional(),
  transportMode: transportModeSchema.optional(),
  notes: z.string().optional(),
  expense: moneySchema.optional(),
});

export const itemPatchSchema = z.object({
  kind: itemKindSchema.optional(),
  title: z.string().min(1).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().nullish(),
  from: placeSchema.nullish(),
  to: placeSchema.nullish(),
  transportMode: transportModeSchema.nullish(),
  notes: z.string().nullish(),
  expense: moneySchema.nullish(),
});

export const foodPlaceCategorySchema = z.enum([
  'restaurant',
  'cafe',
  'bar',
  'food',
  'drink',
  'other',
]);

export const foodPlaceDraftSchema = z.object({
  tripId: z.string().min(1),
  cityLabel: z.string().min(1),
  cityPlaceId: z.string().optional(),
  name: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeId: z.string().optional(),
  notes: z.string().optional(),
  category: foodPlaceCategorySchema.optional(),
});

export const foodPlacePatchSchema = foodPlaceDraftSchema.partial();

export const cityOverrideDraftSchema = z.object({
  tripId: z.string().min(1),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cityLabel: z.string().min(1),
  cityPlaceId: z.string().optional(),
});
