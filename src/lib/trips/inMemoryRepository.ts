import { mockTrips } from './mockData';
import type { TripsRepository } from './repository';
import type {
  ActivityPlace,
  ActivityPlaceDraft,
  CityOverride,
  CityOverrideDraft,
  DayPlan,
  DayPlanDraft,
  Expense,
  ExpenseDraft,
  ExpensePatch,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  MemberInviteDraft,
  Settlement,
  SettlementDraft,
  Trip,
  TripDraft,
  TripInvitation,
  TripItem,
  TripMember,
  TripMemberDraft,
  TripMemberPatch,
} from './types';

const cloneTrip = (trip: Trip): Trip => ({
  ...trip,
  members: trip.members.map((m) => ({ ...m })),
  items: trip.items.map((i) => ({ ...i })),
});

const randomId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function createInMemoryRepository(
  seed: Trip[] = mockTrips,
): TripsRepository {
  let store: Trip[] = seed.map(cloneTrip);
  let foodPlaces: FoodPlace[] = [];
  let activityPlaces: ActivityPlace[] = [];
  let cityOverrides: CityOverride[] = [];
  let dayPlans: DayPlan[] = [];
  let expenses: Expense[] = [];
  let settlements: Settlement[] = [];

  const cloneExpense = (e: Expense): Expense => ({
    ...e,
    shares: e.shares.map((s) => ({ ...s })),
  });

  return {
    async findAll() {
      return store.map(cloneTrip);
    },
    async findById(id) {
      const found = store.find((t) => t.id === id);
      return found ? cloneTrip(found) : null;
    },
    async create(draft: TripDraft) {
      const trip: Trip = {
        ...draft,
        id: randomId('trip'),
        items: [],
        members: [],
      };
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
            if (patch.fromCity !== undefined)
              next.fromCity = patch.fromCity ?? undefined;
            if (patch.toCity !== undefined)
              next.toCity = patch.toCity ?? undefined;
            if (patch.from !== undefined) next.from = patch.from ?? undefined;
            if (patch.to !== undefined) next.to = patch.to ?? undefined;
            if (patch.transportMode !== undefined)
              next.transportMode = patch.transportMode ?? undefined;
            if (patch.notes !== undefined)
              next.notes = patch.notes ?? undefined;
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

    async listActivityPlaces(tripId) {
      return activityPlaces
        .filter((p) => p.tripId === tripId)
        .map((p) => ({ ...p }));
    },
    async addActivityPlace(draft: ActivityPlaceDraft) {
      const place: ActivityPlace = { ...draft, id: randomId('ap') };
      activityPlaces = [...activityPlaces, place];
      return { ...place };
    },
    async updateActivityPlace(id, patch) {
      let updated: ActivityPlace | null = null;
      activityPlaces = activityPlaces.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...patch };
        return updated;
      });
      if (!updated) throw new Error(`ActivityPlace ${id} not found`);
      return { ...(updated as ActivityPlace) };
    },
    async removeActivityPlace(id) {
      activityPlaces = activityPlaces.filter((p) => p.id !== id);
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

    async listDayPlans(tripId) {
      return dayPlans.filter((p) => p.tripId === tripId).map((p) => ({ ...p }));
    },
    async upsertDayPlan(draft: DayPlanDraft) {
      const existing = dayPlans.find(
        (p) => p.tripId === draft.tripId && p.dayKey === draft.dayKey,
      );
      if (existing) return { ...existing };
      const plan: DayPlan = { ...draft, id: randomId('dp') };
      dayPlans = [...dayPlans, plan];
      return { ...plan };
    },
    async removeDayPlan(id) {
      dayPlans = dayPlans.filter((p) => p.id !== id);
    },

    async listMembers(tripId) {
      const trip = store.find((t) => t.id === tripId);
      return (trip?.members ?? []).map((m) => ({ ...m }));
    },
    async addMember(tripId, draft: TripMemberDraft) {
      const trip = store.find((t) => t.id === tripId);
      if (!trip) throw new Error(`Trip ${tripId} not found`);
      const isInvite = Boolean(draft.email);
      const member: TripMember = {
        id: randomId('mem'),
        tripId,
        displayName:
          draft.displayName ?? draft.email?.split('@')[0] ?? 'Member',
        email: draft.email,
        // Email invites start pending (no access until accepted); name-only
        // members are listed but never granted access, so they're accepted.
        status: isInvite ? 'pending' : 'accepted',
        invitedEmail: isInvite ? draft.email : undefined,
      };
      store = store.map((t) =>
        t.id === tripId ? { ...t, members: [...t.members, member] } : t,
      );
      return { ...member };
    },
    async updateMember(tripId, memberId, patch: TripMemberPatch) {
      let updated: TripMember | null = null;
      store = store.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          members: t.members.map((m) => {
            if (m.id !== memberId) return m;
            updated =
              patch.displayName !== undefined
                ? { ...m, displayName: patch.displayName }
                : m;
            return updated;
          }),
        };
      });
      if (!updated)
        throw new Error(`Member ${memberId} not found in trip ${tripId}`);
      return { ...(updated as TripMember) };
    },
    async removeMember(tripId, memberId) {
      store = store.map((t) =>
        t.id === tripId
          ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
          : t,
      );
      return { retired: false };
    },
    async inviteMember(tripId, memberId, draft: MemberInviteDraft) {
      let updated: TripMember | null = null;
      store = store.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          members: t.members.map((m) => {
            if (m.id !== memberId) return m;
            updated = {
              ...m,
              status: 'pending',
              invitedEmail: draft.email,
              email: m.email ?? draft.email,
              // Claiming a name-only member: decline reverts, not deletes.
              revertToNameOnly: true,
            };
            return updated;
          }),
        };
      });
      if (!updated)
        throw new Error(`Member ${memberId} not found in trip ${tripId}`);
      return { ...(updated as TripMember) };
    },
    async listMyInvitations() {
      // No auth context in memory; surface every pending invite as an
      // invitation so tests can assert on the transition.
      const invitations: TripInvitation[] = [];
      for (const trip of store) {
        for (const m of trip.members) {
          if (m.status !== 'pending') continue;
          invitations.push({
            memberId: m.id,
            tripId: trip.id,
            tripTitle: trip.title,
            tripDestination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            coverGradient: trip.coverGradient,
            ownerName: 'Trip owner',
            invitedAt: new Date(0).toISOString(),
          });
        }
      }
      return invitations;
    },
    async acceptInvitation(memberId) {
      let tripId: string | null = null;
      store = store.map((t) => {
        if (!t.members.some((m) => m.id === memberId)) return t;
        tripId = t.id;
        return {
          ...t,
          members: t.members.map((m) =>
            m.id === memberId
              ? { ...m, status: 'accepted', invitedEmail: undefined }
              : m,
          ),
        };
      });
      if (!tripId) throw new Error('invitation_not_found');
      return tripId;
    },
    async declineInvitation(memberId) {
      store = store.map((t) => {
        if (!t.members.some((m) => m.id === memberId)) return t;
        return {
          ...t,
          members: t.members.flatMap((m) => {
            if (m.id !== memberId) return [m];
            // Reverting a claimed invite keeps the original name-only member.
            if (m.revertToNameOnly) {
              return [
                {
                  ...m,
                  status: 'accepted' as const,
                  userId: undefined,
                  invitedEmail: undefined,
                  email: undefined,
                  revertToNameOnly: false,
                },
              ];
            }
            return [];
          }),
        };
      });
    },

    async listExpenses(tripId) {
      return expenses.filter((e) => e.tripId === tripId).map(cloneExpense);
    },
    async addExpense(draft: ExpenseDraft) {
      const expense: Expense = {
        ...draft,
        resolved: draft.resolved ?? false,
        id: randomId('exp'),
        createdAt: new Date().toISOString(),
        shares: draft.shares.map((s) => ({ ...s })),
      };
      expenses = [...expenses, expense];
      return cloneExpense(expense);
    },
    async updateExpense(id, patch: ExpensePatch) {
      let updated: Expense | null = null;
      expenses = expenses.map((e) => {
        if (e.id !== id) return e;
        const next: Expense = { ...e };
        if (patch.itemId !== undefined) next.itemId = patch.itemId ?? undefined;
        if (patch.title !== undefined) next.title = patch.title;
        if (patch.amount !== undefined) next.amount = patch.amount;
        if (patch.currency !== undefined) next.currency = patch.currency;
        if (patch.payerMemberId !== undefined)
          next.payerMemberId = patch.payerMemberId;
        if (patch.spentOn !== undefined) next.spentOn = patch.spentOn;
        if (patch.mode !== undefined) next.mode = patch.mode;
        if (patch.category !== undefined) next.category = patch.category;
        if (patch.resolved !== undefined) next.resolved = patch.resolved;
        if (patch.shares !== undefined)
          next.shares = patch.shares.map((s) => ({ ...s }));
        updated = next;
        return next;
      });
      if (!updated) throw new Error(`Expense ${id} not found`);
      return cloneExpense(updated);
    },
    async removeExpense(id) {
      expenses = expenses.filter((e) => e.id !== id);
    },

    async listSettlements(tripId) {
      return settlements
        .filter((s) => s.tripId === tripId)
        .map((s) => ({ ...s }));
    },
    async addSettlement(draft: SettlementDraft) {
      const settlement: Settlement = { ...draft, id: randomId('stl') };
      settlements = [...settlements, settlement];
      return { ...settlement };
    },
    async removeSettlement(id) {
      settlements = settlements.filter((s) => s.id !== id);
    },
  };
}

export const inMemoryRepository = createInMemoryRepository();
