import type { ItemDraft, Trip, TripDraft, TripItem } from './types';

export interface TripsRepository {
  findAll(): Promise<Trip[]>;
  findById(id: string): Promise<Trip | null>;
  create(draft: TripDraft): Promise<Trip>;
  update(id: string, patch: Partial<TripDraft>): Promise<Trip>;
  remove(id: string): Promise<void>;
  addItem(tripId: string, draft: ItemDraft): Promise<TripItem>;
  updateItem(
    tripId: string,
    itemId: string,
    patch: Partial<ItemDraft>,
  ): Promise<TripItem>;
  removeItem(tripId: string, itemId: string): Promise<void>;
}
