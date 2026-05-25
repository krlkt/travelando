import { z } from 'zod';

const placeSchema = z.object({
  label: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const moneySchema = z.object({
  amount: z.number(),
  currency: z.string().min(1).max(8),
});

export const tripDraftSchema = z.object({
  title: z.string().min(1),
  destination: z.string().min(1),
  coverImage: z.string().url().optional(),
  coverGradient: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  travelers: z.array(z.string()).default([]),
});

export const tripPatchSchema = tripDraftSchema.partial();

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

export const itemPatchSchema = itemDraftSchema.partial();
