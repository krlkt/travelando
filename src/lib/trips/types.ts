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

export interface Money {
  amount: number;
  currency: string;
}

export interface Place {
  label: string;
  address?: string;
  lat?: number;
  lng?: number;
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
  expense?: Money;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  coverImage?: string;
  coverGradient: string;
  startDate: string;
  endDate: string;
  travelers: string[];
  items: TripItem[];
}

export type ItemDraft = Omit<TripItem, 'id' | 'tripId'>;
export type TripDraft = Omit<Trip, 'id' | 'items'>;
