import { mockTrips } from './mockData';
import type { TripsRepository } from './repository';
import type {
  CityOverride,
  CityOverrideDraft,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  Trip,
  TripDraft,
  TripItem,
} from './types';

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
  let foodPlaces: FoodPlace[] = [];
  let cityOverrides: CityOverride[] = [];

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
    async updateItem(tripId, itemId, patch: ItemPatch) {
      let updated: TripItem | null = null;
      store = store.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          items: t.items.map((i) => {
            if (i.id !== itemId) return i;
            const next: TripItem = { ...i };
            if (patch.kind !== undefined) next.kind = patch.kind;
            if (patch.title !== undefined) next.title = patch.title;
            if (patch.startsAt !== undefined) next.startsAt = patch.startsAt;
            if (patch.endsAt !== undefined)
              next.endsAt = patch.endsAt ?? undefined;
            if (patch.from !== undefined) next.from = patch.from ?? undefined;
            if (patch.to !== undefined) next.to = patch.to ?? undefined;
            if (patch.transportMode !== undefined)
              next.transportMode = patch.transportMode ?? undefined;
            if (patch.notes !== undefined)
              next.notes = patch.notes ?? undefined;
            if (patch.expense !== undefined)
              next.expense = patch.expense ?? undefined;
            updated = next;
            return next;
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

    async listFoodPlaces(tripId) {
      return foodPlaces
        .filter((p) => p.tripId === tripId)
        .map((p) => ({ ...p }));
    },
    async addFoodPlace(draft: FoodPlaceDraft) {
      const place: FoodPlace = { ...draft, id: randomId('fp') };
      foodPlaces = [...foodPlaces, place];
      return { ...place };
    },
    async updateFoodPlace(id, patch) {
      let updated: FoodPlace | null = null;
      foodPlaces = foodPlaces.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...patch };
        return updated;
      });
      if (!updated) throw new Error(`FoodPlace ${id} not found`);
      return { ...(updated as FoodPlace) };
    },
    async removeFoodPlace(id) {
      foodPlaces = foodPlaces.filter((p) => p.id !== id);
    },

    async listCityOverrides(tripId) {
      return cityOverrides
        .filter((o) => o.tripId === tripId)
        .map((o) => ({ ...o }));
    },
    async upsertCityOverride(draft: CityOverrideDraft) {
      const existing = cityOverrides.find(
        (o) => o.tripId === draft.tripId && o.dayKey === draft.dayKey,
      );
      if (existing) {
        const updated = {
          ...existing,
          cityLabel: draft.cityLabel,
          cityPlaceId: draft.cityPlaceId,
        };
        cityOverrides = cityOverrides.map((o) =>
          o.id === existing.id ? updated : o,
        );
        return { ...updated };
      }
      const override: CityOverride = { ...draft, id: randomId('co') };
      cityOverrides = [...cityOverrides, override];
      return { ...override };
    },
    async removeCityOverride(id) {
      cityOverrides = cityOverrides.filter((o) => o.id !== id);
    },
  };
}

export const inMemoryRepository = createInMemoryRepository();
