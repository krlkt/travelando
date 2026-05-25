import type { SupabaseClient } from '@supabase/supabase-js';
import {
  itemDraftToInsert,
  itemPatchToUpdate,
  rowToItem,
  rowToTrip,
  tripDraftToInsert,
  tripPatchToUpdate,
  type TripItemRow,
  type TripRow,
} from './mappers';
import type { TripsRepository } from './repository';
import type { ItemDraft, Trip, TripDraft, TripItem } from './types';

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
      return (data ?? []).map((row) =>
        rowToTrip(
          row as TripWithItemsRow,
          (row as TripWithItemsRow).trip_items,
        ),
      );
    },

    async findById(id: string): Promise<Trip | null> {
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
      const { error } = await client.from('trips').delete().eq('id', id);
      if (error) throw new Error(`remove trip ${id}: ${error.message}`);
    },

    async addItem(tripId: string, draft: ItemDraft): Promise<TripItem> {
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
      patch: Partial<ItemDraft>,
    ): Promise<TripItem> {
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
      const { error } = await client
        .from('trip_items')
        .delete()
        .eq('id', itemId)
        .eq('trip_id', tripId);
      if (error) throw new Error(`remove item ${itemId}: ${error.message}`);
    },
  };
}
