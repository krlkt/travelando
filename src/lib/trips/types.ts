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
  from?: Place;
  to?: Place;
  transportMode?: TransportMode;
  notes?: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId?: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  invitedBy?: string;
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

export interface TripMemberPatch {
  displayName?: string;
}

export interface ItemPatch {
  kind?: ItemKind;
  title?: string;
  startsAt?: string;
  endsAt?: string | null;
  from?: Place | null;
  to?: Place | null;
  transportMode?: TransportMode | null;
  notes?: string | null;
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

export type FoodPlaceDraft = Omit<FoodPlace, 'id'>;
export type CityOverrideDraft = Omit<CityOverride, 'id'>;

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
  mode: ExpenseSplitMode;
  category: ExpenseCategory;
  shares: ExpenseShare[];
}

export type ExpenseDraft = Omit<Expense, 'id'>;

export interface ExpensePatch {
  itemId?: string | null;
  title?: string;
  amount?: number;
  currency?: string;
  payerMemberId?: string;
  spentOn?: string;
  mode?: ExpenseSplitMode;
  category?: ExpenseCategory;
  shares?: ExpenseShare[];
}
