import { mockTrips } from './mockData';
import type { TripsRepository } from './repository';
import type { ItemDraft, Trip, TripDraft, TripItem } from './types';

const cloneTrip = (trip: Trip): Trip => ({
  ...trip,
  travelers: [...trip.travelers],
  items: trip.items.map((i) => ({ ...i })),
});

const randomId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function createInMemoryRepository(
  seed: Trip[] = mockTrips,
): TripsRepository {
  let store: Trip[] = seed.map(cloneTrip);

  return {
    async findAll() {
      return store.map(cloneTrip);
    },
    async findById(id) {
      const found = store.find((t) => t.id === id);
      return found ? cloneTrip(found) : null;
    },
    async create(draft: TripDraft) {
      const trip: Trip = { ...draft, id: randomId('trip'), items: [] };
      store = [...store, trip];
      return cloneTrip(trip);
    },
    async update(id, patch) {
      let updated: Trip | null = null;
      store = store.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, ...patch };
        return updated;
      });
      if (!updated) throw new Error(`Trip ${id} not found`);
      return cloneTrip(updated);
    },
    async remove(id) {
      store = store.filter((t) => t.id !== id);
    },
    async addItem(tripId, draft: ItemDraft) {
      const item: TripItem = { ...draft, id: randomId('item'), tripId };
      let added = false;
      store = store.map((t) => {
        if (t.id !== tripId) return t;
        added = true;
        return { ...t, items: [...t.items, item] };
      });
      if (!added) throw new Error(`Trip ${tripId} not found`);
      return { ...item };
    },
    async updateItem(tripId, itemId, patch) {
      let updated: TripItem | null = null;
      store = store.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          items: t.items.map((i) => {
            if (i.id !== itemId) return i;
            updated = { ...i, ...patch };
            return updated;
          }),
        };
      });
      if (!updated)
        throw new Error(`Item ${itemId} not found in trip ${tripId}`);
      return { ...(updated as TripItem) };
    },
    async removeItem(tripId, itemId) {
      store = store.map((t) =>
        t.id === tripId
          ? { ...t, items: t.items.filter((i) => i.id !== itemId) }
          : t,
      );
    },
  };
}

export const inMemoryRepository = createInMemoryRepository();
