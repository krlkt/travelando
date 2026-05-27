import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cityOverrideDraftToInsert,
  foodPlaceDraftToInsert,
  foodPlacePatchToUpdate,
  itemDraftToInsert,
  itemPatchToUpdate,
  rowToCityOverride,
  rowToFoodPlace,
  rowToItem,
  rowToTrip,
  tripDraftToInsert,
  tripPatchToUpdate,
  type CityOverrideRow,
  type FoodPlaceRow,
  type TripItemRow,
  type TripRow,
} from './mappers';
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
import {
  DEMO_TRIP_PROTECTED_ERROR,
  getDemoTrip,
  isDemoTrip,
  listDemoTrips,
} from './demoTrips';

const TRIP_COLUMNS =
  'id, owner_id, title, destination, cover_image, cover_gradient, start_date, end_date, travelers';

const ITEM_COLUMNS =
  'id, trip_id, kind, title, starts_at, ends_at, from_place, to_place, transport_mode, notes, expense';

const TRIP_WITH_ITEMS = `${TRIP_COLUMNS}, trip_items(${ITEM_COLUMNS})`;

type TripWithItemsRow = TripRow & { trip_items: TripItemRow[] | null };

function unwrap<T>(
  value: T | null,
  error: { message: string } | null,
  context: string,
): T {
  if (error) throw new Error(`${context}: ${error.message}`);
  if (value === null) throw new Error(`${context}: no rows returned`);
  return value;
}

export function createSupabaseRepository(
  client: SupabaseClient,
): TripsRepository {
  return {
    async findAll(): Promise<Trip[]> {
      const { data, error } = await client
        .from('trips')
        .select(TRIP_WITH_ITEMS)
        .order('start_date', { ascending: true });

      if (error) throw new Error(`findAll: ${error.message}`);
      const dbTrips = (data ?? []).map((row) =>
        rowToTrip(
          row as TripWithItemsRow,
          (row as TripWithItemsRow).trip_items,
        ),
      );
      const merged = [...listDemoTrips(), ...dbTrips];
      merged.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
      return merged;
    },

    async findById(id: string): Promise<Trip | null> {
      const demo = getDemoTrip(id);
      if (demo) return demo;

      const { data, error } = await client
        .from('trips')
        .select(TRIP_WITH_ITEMS)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(`findById(${id}): ${error.message}`);
      if (!data) return null;
      const row = data as TripWithItemsRow;
      return rowToTrip(row, row.trip_items);
    },

    async create(draft: TripDraft): Promise<Trip> {
      const insert = tripDraftToInsert(draft);
      const { data, error } = await client
        .from('trips')
        .insert(insert)
        .select(TRIP_WITH_ITEMS)
        .single();
      const row = unwrap(data as TripWithItemsRow | null, error, 'create trip');
      return rowToTrip(row, row.trip_items);
    },

    async update(id: string, patch: Partial<TripDraft>): Promise<Trip> {
      if (isDemoTrip(id)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const update = tripPatchToUpdate(patch);
      const { data, error } = await client
        .from('trips')
        .update(update)
        .eq('id', id)
        .select(TRIP_WITH_ITEMS)
        .single();
      const row = unwrap(
        data as TripWithItemsRow | null,
        error,
        `update trip ${id}`,
      );
      return rowToTrip(row, row.trip_items);
    },

    async remove(id: string): Promise<void> {
      if (isDemoTrip(id)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const { error } = await client.from('trips').delete().eq('id', id);
      if (error) throw new Error(`remove trip ${id}: ${error.message}`);
    },

    async addItem(tripId: string, draft: ItemDraft): Promise<TripItem> {
      if (isDemoTrip(tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const insert = itemDraftToInsert(tripId, draft);
      const { data, error } = await client
        .from('trip_items')
        .insert(insert)
        .select(ITEM_COLUMNS)
        .single();
      const row = unwrap(data as TripItemRow | null, error, 'add item');
      return rowToItem(row);
    },

    async updateItem(
      tripId: string,
      itemId: string,
      patch: ItemPatch,
    ): Promise<TripItem> {
      if (isDemoTrip(tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const update = itemPatchToUpdate(patch);
      const { data, error } = await client
        .from('trip_items')
        .update(update)
        .eq('id', itemId)
        .eq('trip_id', tripId)
        .select(ITEM_COLUMNS)
        .single();
      const row = unwrap(
        data as TripItemRow | null,
        error,
        `update item ${itemId}`,
      );
      return rowToItem(row);
    },

    async removeItem(tripId: string, itemId: string): Promise<void> {
      if (isDemoTrip(tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const { error } = await client
        .from('trip_items')
        .delete()
        .eq('id', itemId)
        .eq('trip_id', tripId);
      if (error) throw new Error(`remove item ${itemId}: ${error.message}`);
    },

    async listFoodPlaces(tripId: string): Promise<FoodPlace[]> {
      const { data, error } = await client
        .from('food_places')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`listFoodPlaces: ${error.message}`);
      return (data ?? []).map((r) => rowToFoodPlace(r as FoodPlaceRow));
    },

    async addFoodPlace(draft: FoodPlaceDraft): Promise<FoodPlace> {
      if (isDemoTrip(draft.tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const insert = foodPlaceDraftToInsert(draft);
      const { data, error } = await client
        .from('food_places')
        .insert(insert)
        .select('*')
        .single();
      const row = unwrap(data as FoodPlaceRow | null, error, 'addFoodPlace');
      return rowToFoodPlace(row);
    },

    async updateFoodPlace(
      id: string,
      patch: Partial<FoodPlaceDraft>,
    ): Promise<FoodPlace> {
      const update = foodPlacePatchToUpdate(patch);
      const { data, error } = await client
        .from('food_places')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();
      const row = unwrap(
        data as FoodPlaceRow | null,
        error,
        `updateFoodPlace ${id}`,
      );
      return rowToFoodPlace(row);
    },

    async removeFoodPlace(id: string): Promise<void> {
      const { error } = await client.from('food_places').delete().eq('id', id);
      if (error) throw new Error(`removeFoodPlace ${id}: ${error.message}`);
    },

    async listCityOverrides(tripId: string): Promise<CityOverride[]> {
      const { data, error } = await client
        .from('city_overrides')
        .select('*')
        .eq('trip_id', tripId);
      if (error) throw new Error(`listCityOverrides: ${error.message}`);
      return (data ?? []).map((r) => rowToCityOverride(r as CityOverrideRow));
    },

    async upsertCityOverride(draft: CityOverrideDraft): Promise<CityOverride> {
      if (isDemoTrip(draft.tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const insert = cityOverrideDraftToInsert(draft);
      const { data, error } = await client
        .from('city_overrides')
        .upsert(insert, { onConflict: 'trip_id,day_key' })
        .select('*')
        .single();
      const row = unwrap(
        data as CityOverrideRow | null,
        error,
        'upsertCityOverride',
      );
      return rowToCityOverride(row);
    },

    async removeCityOverride(id: string): Promise<void> {
      const { error } = await client
        .from('city_overrides')
        .delete()
        .eq('id', id);
      if (error) throw new Error(`removeCityOverride ${id}: ${error.message}`);
    },
  };
}
