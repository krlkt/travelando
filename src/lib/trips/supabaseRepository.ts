import type { SupabaseClient } from '@supabase/supabase-js';
import {
  activityPlaceDraftToInsert,
  activityPlacePatchToUpdate,
  cityOverrideDraftToInsert,
  expenseDraftToInsert,
  expensePatchToUpdate,
  expenseSharesToInsert,
  foodPlaceDraftToInsert,
  foodPlacePatchToUpdate,
  itemDraftToInsert,
  itemPatchToUpdate,
  rowToActivityPlace,
  rowToCityOverride,
  rowToExpense,
  rowToFoodPlace,
  rowToItem,
  rowToMember,
  rowToSettlement,
  rowToTrip,
  settlementDraftToInsert,
  tripDraftToInsert,
  tripPatchToUpdate,
  type ActivityPlaceRow,
  type CityOverrideRow,
  type ExpenseRow,
  type FoodPlaceRow,
  type SettlementRow,
  type TripItemRow,
  type TripMemberRow,
  type TripRow,
} from './mappers';
import type { TripsRepository } from './repository';
import type {
  ActivityPlace,
  ActivityPlaceDraft,
  CityOverride,
  CityOverrideDraft,
  Expense,
  ExpenseDraft,
  ExpensePatch,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  Settlement,
  SettlementDraft,
  Trip,
  TripDraft,
  TripItem,
  TripMember,
  TripMemberDraft,
  TripMemberPatch,
} from './types';
import {
  DEMO_TRIP_PROTECTED_ERROR,
  getDemoTrip,
  isDemoTrip,
  listDemoTrips,
} from './demoTrips';

const TRIP_COLUMNS =
  'id, owner_id, title, destination, cover_image, cover_gradient, start_date, end_date';

const ITEM_COLUMNS =
  'id, trip_id, kind, title, starts_at, ends_at, from_place, to_place, transport_mode, notes';

const MEMBER_COLUMNS =
  'id, trip_id, user_id, display_name, email, invited_by, profiles(avatar_url, display_name)';

const EXPENSE_SHARE_COLUMNS = 'id, expense_id, member_id, value, locked';

const EXPENSE_COLUMNS = `id, trip_id, item_id, title, amount, currency, payer_member_id, spent_on, mode, category, expense_shares(${EXPENSE_SHARE_COLUMNS})`;

const SETTLEMENT_COLUMNS =
  'id, trip_id, from_member_id, to_member_id, amount, currency, settled_on, note';

const TRIP_WITH_ITEMS = `${TRIP_COLUMNS}, trip_items(${ITEM_COLUMNS}), trip_members(${MEMBER_COLUMNS})`;

type TripWithItemsRow = TripRow & {
  trip_items: TripItemRow[] | null;
  trip_members: TripMemberRow[] | null;
};

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
          (row as TripWithItemsRow).trip_members,
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
      return rowToTrip(row, row.trip_items, row.trip_members);
    },

    async create(draft: TripDraft): Promise<Trip> {
      const insert = tripDraftToInsert(draft);
      const { data, error } = await client
        .from('trips')
        .insert(insert)
        .select(TRIP_WITH_ITEMS)
        .single();
      const row = unwrap(data as TripWithItemsRow | null, error, 'create trip');
      return rowToTrip(row, row.trip_items, row.trip_members);
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
      return rowToTrip(row, row.trip_items, row.trip_members);
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

    async listActivityPlaces(tripId: string): Promise<ActivityPlace[]> {
      const { data, error } = await client
        .from('activity_places')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`listActivityPlaces: ${error.message}`);
      return (data ?? []).map((r) => rowToActivityPlace(r as ActivityPlaceRow));
    },

    async addActivityPlace(draft: ActivityPlaceDraft): Promise<ActivityPlace> {
      if (isDemoTrip(draft.tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const insert = activityPlaceDraftToInsert(draft);
      const { data, error } = await client
        .from('activity_places')
        .insert(insert)
        .select('*')
        .single();
      const row = unwrap(
        data as ActivityPlaceRow | null,
        error,
        'addActivityPlace',
      );
      return rowToActivityPlace(row);
    },

    async updateActivityPlace(
      id: string,
      patch: Partial<ActivityPlaceDraft>,
    ): Promise<ActivityPlace> {
      const update = activityPlacePatchToUpdate(patch);
      const { data, error } = await client
        .from('activity_places')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();
      const row = unwrap(
        data as ActivityPlaceRow | null,
        error,
        `updateActivityPlace ${id}`,
      );
      return rowToActivityPlace(row);
    },

    async removeActivityPlace(id: string): Promise<void> {
      const { error } = await client
        .from('activity_places')
        .delete()
        .eq('id', id);
      if (error) throw new Error(`removeActivityPlace ${id}: ${error.message}`);
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

    async listMembers(tripId: string): Promise<TripMember[]> {
      const { data, error } = await client
        .from('trip_members')
        .select(MEMBER_COLUMNS)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`listMembers: ${error.message}`);
      return (data ?? []).map((r) => rowToMember(r as TripMemberRow));
    },

    async addMember(
      tripId: string,
      draft: TripMemberDraft,
    ): Promise<TripMember> {
      if (isDemoTrip(tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      if (!draft.email && !draft.displayName) {
        throw new Error('email or displayName is required');
      }

      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throw new Error('unauthorized');

      let userId: string | null = null;
      let resolvedName: string | null = draft.displayName ?? null;
      let email: string | null = draft.email ?? null;

      if (draft.email) {
        // SECURITY DEFINER RPC — the `profiles owner read` policy blocks
        // direct SELECTs on other users' rows, so we go through a function
        // that returns only the single matching profile.
        const { data: profiles, error: profileError } = await client.rpc(
          'find_profile_by_email',
          { p_email: draft.email },
        );
        if (profileError) {
          throw new Error(`addMember lookup: ${profileError.message}`);
        }
        const profile = Array.isArray(profiles) ? profiles[0] : profiles;
        if (profile) {
          userId = profile.id as string;
          email = (profile.email as string | null) ?? draft.email;
          resolvedName =
            draft.displayName ??
            (profile.display_name as string | null) ??
            (profile.email as string | null) ??
            draft.email;
        } else {
          throw new Error('user_not_found');
        }
      }

      const insert: Omit<TripMemberRow, 'id' | 'profiles'> = {
        trip_id: tripId,
        user_id: userId,
        display_name: resolvedName ?? draft.email ?? 'Member',
        email,
        invited_by: authData.user.id,
      };

      const { data, error } = await client
        .from('trip_members')
        .insert(insert)
        .select(MEMBER_COLUMNS)
        .single();
      const row = unwrap(data as TripMemberRow | null, error, 'addMember');
      return rowToMember(row);
    },

    async updateMember(
      tripId: string,
      memberId: string,
      patch: TripMemberPatch,
    ): Promise<TripMember> {
      if (isDemoTrip(tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const update: Partial<Pick<TripMemberRow, 'display_name'>> = {};
      if (patch.displayName !== undefined)
        update.display_name = patch.displayName;
      const { data, error } = await client
        .from('trip_members')
        .update(update)
        .eq('id', memberId)
        .eq('trip_id', tripId)
        .select(MEMBER_COLUMNS)
        .single();
      const row = unwrap(
        data as TripMemberRow | null,
        error,
        `updateMember ${memberId}`,
      );
      return rowToMember(row);
    },

    async removeMember(tripId: string, memberId: string): Promise<void> {
      if (isDemoTrip(tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const { error } = await client
        .from('trip_members')
        .delete()
        .eq('id', memberId)
        .eq('trip_id', tripId);
      if (error) {
        throw new Error(`removeMember ${memberId}: ${error.message}`);
      }
    },

    async listExpenses(tripId: string): Promise<Expense[]> {
      const { data, error } = await client
        .from('expenses')
        .select(EXPENSE_COLUMNS)
        .eq('trip_id', tripId)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(`listExpenses: ${error.message}`);
      return (data ?? []).map((r) => rowToExpense(r as ExpenseRow));
    },

    async addExpense(draft: ExpenseDraft): Promise<Expense> {
      if (isDemoTrip(draft.tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const insert = expenseDraftToInsert(draft);
      const { data, error } = await client
        .from('expenses')
        .insert(insert)
        .select(EXPENSE_COLUMNS)
        .single();
      const parent = unwrap(data as ExpenseRow | null, error, 'addExpense');

      const sharesInsert = expenseSharesToInsert(parent.id, draft.shares);
      const { error: sharesError } = await client
        .from('expense_shares')
        .insert(sharesInsert);
      if (sharesError) {
        // Best-effort cleanup; CASCADE removes any partially-inserted shares.
        await client.from('expenses').delete().eq('id', parent.id);
        throw new Error(`addExpense shares: ${sharesError.message}`);
      }

      const { data: refetched, error: refetchError } = await client
        .from('expenses')
        .select(EXPENSE_COLUMNS)
        .eq('id', parent.id)
        .single();
      const finalRow = unwrap(
        refetched as ExpenseRow | null,
        refetchError,
        `addExpense fetch ${parent.id}`,
      );
      return rowToExpense(finalRow);
    },

    async updateExpense(id: string, patch: ExpensePatch): Promise<Expense> {
      const update = expensePatchToUpdate(patch);
      if (Object.keys(update).length > 0) {
        const { error } = await client
          .from('expenses')
          .update(update)
          .eq('id', id);
        if (error) {
          throw new Error(`updateExpense ${id}: ${error.message}`);
        }
      }

      if (patch.shares !== undefined) {
        const { error: deleteError } = await client
          .from('expense_shares')
          .delete()
          .eq('expense_id', id);
        if (deleteError) {
          throw new Error(
            `updateExpense ${id} clear shares: ${deleteError.message}`,
          );
        }
        const sharesInsert = expenseSharesToInsert(id, patch.shares);
        if (sharesInsert.length > 0) {
          const { error: insertError } = await client
            .from('expense_shares')
            .insert(sharesInsert);
          if (insertError) {
            throw new Error(
              `updateExpense ${id} shares: ${insertError.message}`,
            );
          }
        }
      }

      const { data, error } = await client
        .from('expenses')
        .select(EXPENSE_COLUMNS)
        .eq('id', id)
        .single();
      const row = unwrap(
        data as ExpenseRow | null,
        error,
        `updateExpense fetch ${id}`,
      );
      return rowToExpense(row);
    },

    async removeExpense(id: string): Promise<void> {
      const { error } = await client.from('expenses').delete().eq('id', id);
      if (error) throw new Error(`removeExpense ${id}: ${error.message}`);
    },

    async listSettlements(tripId: string): Promise<Settlement[]> {
      const { data, error } = await client
        .from('settlements')
        .select(SETTLEMENT_COLUMNS)
        .eq('trip_id', tripId)
        .order('settled_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(`listSettlements: ${error.message}`);
      return (data ?? []).map((r) => rowToSettlement(r as SettlementRow));
    },

    async addSettlement(draft: SettlementDraft): Promise<Settlement> {
      if (isDemoTrip(draft.tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);
      const insert = settlementDraftToInsert(draft);
      const { data, error } = await client
        .from('settlements')
        .insert(insert)
        .select(SETTLEMENT_COLUMNS)
        .single();
      const row = unwrap(data as SettlementRow | null, error, 'addSettlement');
      return rowToSettlement(row);
    },

    async removeSettlement(id: string): Promise<void> {
      const { error } = await client.from('settlements').delete().eq('id', id);
      if (error) throw new Error(`removeSettlement ${id}: ${error.message}`);
    },
  };
}
