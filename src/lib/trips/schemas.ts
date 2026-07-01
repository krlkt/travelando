import { z } from 'zod';

const placeSchema = z.object({
  label: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeId: z.string().optional(),
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

export const memberInviteSchema = z.object({
  email: z.string().email(),
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
  fromCity: placeSchema.optional(),
  toCity: placeSchema.optional(),
  from: placeSchema.optional(),
  to: placeSchema.optional(),
  transportMode: transportModeSchema.optional(),
  notes: z.string().optional(),
  privateToUserIds: z.array(z.string().uuid()).optional(),
});

export const itemPatchSchema = z.object({
  kind: itemKindSchema.optional(),
  title: z.string().min(1).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().nullish(),
  fromCity: placeSchema.nullish(),
  toCity: placeSchema.nullish(),
  from: placeSchema.nullish(),
  to: placeSchema.nullish(),
  transportMode: transportModeSchema.nullish(),
  notes: z.string().nullish(),
  privateToUserIds: z.array(z.string().uuid()).nullish(),
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
  wantLevel: z.number().int().min(1).max(5).optional(),
});

export const foodPlacePatchSchema = foodPlaceDraftSchema.partial();

export const activityPlaceCategorySchema = z.enum([
  'sightseeing',
  'museum',
  'outdoor',
  'entertainment',
  'tour',
  'shopping',
  'nightlife',
  'other',
]);

export const activityPlaceDraftSchema = z.object({
  tripId: z.string().min(1),
  cityLabel: z.string().min(1),
  cityPlaceId: z.string().optional(),
  name: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeId: z.string().optional(),
  notes: z.string().optional(),
  category: activityPlaceCategorySchema.optional(),
  wantLevel: z.number().int().min(1).max(5).optional(),
});

export const activityPlacePatchSchema = activityPlaceDraftSchema.partial();

export const travelCompanionSchema = z.enum([
  'solo',
  'partner',
  'friends',
  'family',
]);

/**
 * Body for `POST /api/trips/[id]/recommendations`. The city is required (we
 * recommend per-city); everything else is optional personalization. Strings are
 * length-capped so a malformed client can't inflate the LLM prompt.
 */
export const recommendationRequestSchema = z.object({
  cityLabel: z.string().min(1).max(120),
  cityPlaceId: z.string().max(300).optional(),
  interests: z.string().max(300).optional(),
  companions: travelCompanionSchema.optional(),
  groupSize: z.number().int().min(1).max(50).optional(),
  ageRange: z.string().max(40).optional(),
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export const cityOverrideDraftSchema = z.object({
  tripId: z.string().min(1),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cityLabel: z.string().min(1),
  cityPlaceId: z.string().optional(),
});

export const dayPlanDraftSchema = z.object({
  tripId: z.string().min(1),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const expenseSplitModeSchema = z.enum(['equally', 'parts', 'amounts']);

export const expenseCategorySchema = z.enum([
  'accommodation',
  'entertainment',
  'groceries',
  'restaurants',
  'shopping',
  'transport',
  'other',
]);

const expenseShareSchema = z.object({
  memberId: z.string().min(1),
  value: z.number().nullable(),
  locked: z.boolean(),
});

export const expenseDraftSchema = z.object({
  tripId: z.string().min(1),
  itemId: z.string().min(1).optional(),
  title: z.string().min(1).max(120),
  amount: z.number().positive(),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code'),
  payerMemberId: z.string().min(1),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: expenseSplitModeSchema,
  category: expenseCategorySchema,
  resolved: z.boolean(),
  shares: z.array(expenseShareSchema).min(1),
});

export const expensePatchSchema = expenseDraftSchema
  .partial()
  .omit({ tripId: true })
  .extend({ itemId: z.string().min(1).nullish() });

export const settlementDraftSchema = z
  .object({
    tripId: z.string().min(1),
    fromMemberId: z.string().min(1),
    toMemberId: z.string().min(1),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code'),
    settledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().max(280).optional(),
  })
  .refine((v) => v.fromMemberId !== v.toMemberId, {
    message: 'fromMemberId and toMemberId must differ',
    path: ['toMemberId'],
  });
