export type ItemKind = 'transport' | 'activity' | 'lodging' | 'meal' | 'note';

export type TransportMode =
  | 'flight'
  | 'train'
  | 'car'
  | 'bus'
  | 'ferry'
  | 'walk'
  | 'metro'
  | 'taxi';

export interface Place {
  label: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface TripItem {
  id: string;
  tripId: string;
  kind: ItemKind;
  title: string;
  startsAt: string;
  endsAt?: string;
  /** Transport only: the city you're leaving. Drives the trip's "City" logic. */
  fromCity?: Place;
  /** Transport only: the city you're arriving at. Drives the trip's "City" logic. */
  toCity?: Place;
  /** Departure waypoint (station/airport). Used for map-view routing. */
  from?: Place;
  /** Arrival waypoint (station/airport). Used for map-view routing. */
  to?: Place;
  transportMode?: TransportMode;
  notes?: string;
  privateToUserIds?: string[];
}

export type TripMemberStatus = 'pending' | 'accepted';

export interface TripMember {
  id: string;
  tripId: string;
  userId?: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  invitedBy?: string;
  status: TripMemberStatus;
  invitedEmail?: string;
  // True when a pending invite was created by claiming an existing name-only
  // member. Declining reverts to that name-only member instead of deleting it.
  revertToNameOnly?: boolean;
}

/**
 * A pending invitation as seen by the *invited* user, who cannot read the trip
 * itself until they accept. Returned by the list_my_invitations RPC.
 */
export interface TripInvitation {
  memberId: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  startDate: string;
  endDate: string;
  coverGradient: string;
  ownerName: string;
  invitedAt: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  coverImage?: string;
  coverGradient: string;
  startDate: string;
  endDate: string;
  ownerId?: string;
  members: TripMember[];
  items: TripItem[];
}

export type ItemDraft = Omit<TripItem, 'id' | 'tripId'>;
export type TripDraft = Omit<Trip, 'id' | 'items' | 'members' | 'ownerId'>;

export interface TripMemberDraft {
  email?: string;
  displayName?: string;
}

/** Sending an invite to a specific email (used by the "invite" action). */
export interface MemberInviteDraft {
  email: string;
}

export interface TripMemberPatch {
  displayName?: string;
}

export interface ItemPatch {
  kind?: ItemKind;
  title?: string;
  startsAt?: string;
  endsAt?: string | null;
  fromCity?: Place | null;
  toCity?: Place | null;
  from?: Place | null;
  to?: Place | null;
  transportMode?: TransportMode | null;
  notes?: string | null;
  privateToUserIds?: string[] | null;
}

export type FoodPlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'food'
  | 'drink'
  | 'other';

export interface FoodPlace {
  id: string;
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  notes?: string;
  category?: FoodPlaceCategory;
  wantLevel?: number;
}

export interface CityOverride {
  id: string;
  tripId: string;
  dayKey: string;
  cityLabel: string;
  cityPlaceId?: string;
}

export interface CitySegment {
  cityLabel: string;
  cityPlaceId?: string;
  startsAt?: string;
  endsAt?: string;
  items: TripItem[];
}

export interface DayCityBucket {
  key: string;
  date: Date;
  segments: CitySegment[];
}

/** A trip day the user has marked as "planned enough" (done). */
export interface DayPlan {
  id: string;
  tripId: string;
  dayKey: string;
}

export type DayPlanDraft = Omit<DayPlan, 'id'>;

export type FoodPlaceDraft = Omit<FoodPlace, 'id'>;

export type ActivityPlaceCategory =
  | 'sightseeing'
  | 'museum'
  | 'outdoor'
  | 'entertainment'
  | 'tour'
  | 'shopping'
  | 'nightlife'
  | 'other';

export interface ActivityPlace {
  id: string;
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  notes?: string;
  category?: ActivityPlaceCategory;
  wantLevel?: number;
}

export type ActivityPlaceDraft = Omit<ActivityPlace, 'id'>;
export type CityOverrideDraft = Omit<CityOverride, 'id'>;

/** Who the traveller is going with — biases what gets recommended. */
export type TravelCompanion = 'solo' | 'partner' | 'friends' | 'family';

/**
 * Optional user input that personalizes city recommendations. Every field is
 * optional: with nothing set, the recommender returns the city's plain must-dos.
 */
export interface RecommendationContext {
  /** Free-text of what they feel like doing ("ramen, temples, jazz bars"). */
  interests?: string;
  companions?: TravelCompanion;
  groupSize?: number;
  /** Loose age band, e.g. "kids", "20s", "60+". */
  ageRange?: string;
}

/**
 * A single AI-curated place suggestion for a city. Shaped to drop straight into
 * the wishlist: `kind` + `category` map onto the food/activity tables, and the
 * place fields mirror {@link FoodPlace}/{@link ActivityPlace}. `reason` is the
 * one-line "why this fits you" written by the LLM (absent on the rule-based
 * fallback).
 */
export interface Recommendation {
  placeId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
  kind: 'food' | 'activity';
  category: FoodPlaceCategory | ActivityPlaceCategory;
  reason?: string;
}

export type ExpenseSplitMode = 'equally' | 'parts' | 'amounts';

export type ExpenseCategory =
  | 'accommodation'
  | 'entertainment'
  | 'groceries'
  | 'restaurants'
  | 'shopping'
  | 'transport'
  | 'other';

export interface ExpenseShare {
  memberId: string;
  // equally: null
  // parts:   integer multiplier (>= 1)
  // amounts: locked amount when locked === true, else null (auto-distributed)
  value: number | null;
  locked: boolean;
}

export interface Expense {
  id: string;
  tripId: string;
  itemId?: string;
  title: string;
  amount: number;
  currency: string;
  payerMemberId: string;
  spentOn: string;
  /** Server-generated insertion timestamp (ISO). Used for "date added" sort. */
  createdAt: string;
  mode: ExpenseSplitMode;
  category: ExpenseCategory;
  /**
   * When true, members already paid their own share at the time, so this
   * expense is excluded from balance settlement. It still counts toward
   * spending totals and the category breakdown.
   */
  resolved: boolean;
  shares: ExpenseShare[];
}

export type ExpenseDraft = Omit<Expense, 'id' | 'createdAt'>;

export interface ExpensePatch {
  itemId?: string | null;
  title?: string;
  amount?: number;
  currency?: string;
  payerMemberId?: string;
  spentOn?: string;
  mode?: ExpenseSplitMode;
  category?: ExpenseCategory;
  resolved?: boolean;
  shares?: ExpenseShare[];
}

export interface Settlement {
  id: string;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  settledOn: string;
  note?: string;
}

export type SettlementDraft = Omit<Settlement, 'id'>;
