'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActivityPlace,
  ActivityPlaceDraft,
  CityOverride,
  CityOverrideDraft,
  DayPlan,
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
  SettlementUpdate,
  Trip,
  TripDraft,
  TripInvitation,
  TripItem,
  TripMember,
  TripMemberDraft,
  TripMemberPatch,
} from './types';
import type { RemoveMemberResult } from './memberRetire';
import { DEMO_TRIP_PROTECTED_ERROR, isDemoTrip } from './demoTrips';

interface TripsState {
  trips: Trip[];
  getTrip: (id: string) => Trip | undefined;
  createTrip: (draft: TripDraft) => Promise<Trip>;
  updateTrip: (id: string, patch: Partial<TripDraft>) => Promise<void>;
  removeTrip: (id: string) => Promise<void>;
  addItem: (tripId: string, draft: ItemDraft) => Promise<TripItem>;
  updateItem: (
    tripId: string,
    itemId: string,
    patch: ItemPatch,
  ) => Promise<void>;
  removeItem: (tripId: string, itemId: string) => Promise<void>;

  foodPlaces: Record<string, FoodPlace[]>;
  activityPlaces: Record<string, ActivityPlace[]>;
  cityOverrides: Record<string, CityOverride[]>;
  dayPlans: Record<string, DayPlan[]>;
  expenses: Record<string, Expense[]>;
  settlements: Record<string, Settlement[]>;
  /**
   * Per-trip load state for the secondary data fetched by `loadTripExtras`
   * (food/activity places, city overrides, day plans, expenses, settlements).
   * Drives skeletons: `'loading'` only the first time, so revisits with cached
   * data never flash a skeleton. Stays at the last value during background
   * refreshes.
   */
  extrasStatus: Record<string, ExtrasStatus>;
  loadTripExtras: (tripId: string) => Promise<void>;
  addFoodPlace: (draft: FoodPlaceDraft) => Promise<FoodPlace>;
  updateFoodPlace: (
    id: string,
    patch: Partial<FoodPlaceDraft>,
  ) => Promise<void>;
  removeFoodPlace: (tripId: string, id: string) => Promise<void>;
  addActivityPlace: (draft: ActivityPlaceDraft) => Promise<ActivityPlace>;
  updateActivityPlace: (
    id: string,
    patch: Partial<ActivityPlaceDraft>,
  ) => Promise<void>;
  removeActivityPlace: (tripId: string, id: string) => Promise<void>;
  upsertCityOverride: (draft: CityOverrideDraft) => Promise<void>;
  removeCityOverride: (tripId: string, id: string) => Promise<void>;
  /** Mark a day planned (no existing plan) or unmark it (toggle). */
  toggleDayPlan: (tripId: string, dayKey: string) => Promise<void>;
  addExpense: (draft: ExpenseDraft) => Promise<Expense>;
  updateExpense: (
    tripId: string,
    id: string,
    patch: ExpensePatch,
  ) => Promise<void>;
  removeExpense: (tripId: string, id: string) => Promise<void>;
  addSettlement: (draft: SettlementDraft) => Promise<Settlement>;
  updateSettlement: (
    tripId: string,
    id: string,
    patch: SettlementUpdate,
  ) => Promise<Settlement>;
  removeSettlement: (tripId: string, id: string) => Promise<void>;

  addMember: (tripId: string, draft: TripMemberDraft) => Promise<TripMember>;
  updateMember: (
    tripId: string,
    memberId: string,
    patch: TripMemberPatch,
  ) => Promise<void>;
  removeMember: (
    tripId: string,
    memberId: string,
  ) => Promise<RemoveMemberResult>;
  inviteMember: (
    tripId: string,
    memberId: string,
    draft: MemberInviteDraft,
  ) => Promise<TripMember>;
  /** Hand the trip to another member. The caller stays on as a regular member. */
  transferOwnership: (tripId: string, memberId: string) => Promise<void>;

  invitations: TripInvitation[];
  refreshInvitations: () => Promise<void>;
  acceptInvitation: (memberId: string) => Promise<void>;
  declineInvitation: (memberId: string) => Promise<void>;
}

export type ExtrasStatus = 'idle' | 'loading' | 'loaded' | 'error';

const TripsContext = createContext<TripsState | null>(null);

const tempId = (prefix: string): string =>
  `${prefix}-tmp-${Math.random().toString(36).slice(2, 9)}`;

function applyItemPatch(item: TripItem, patch: ItemPatch): TripItem {
  const next: TripItem = { ...item };
  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.startsAt !== undefined) next.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) next.endsAt = patch.endsAt ?? undefined;
  if (patch.fromCity !== undefined) next.fromCity = patch.fromCity ?? undefined;
  if (patch.toCity !== undefined) next.toCity = patch.toCity ?? undefined;
  if (patch.from !== undefined) next.from = patch.from ?? undefined;
  if (patch.to !== undefined) next.to = patch.to ?? undefined;
  if (patch.transportMode !== undefined)
    next.transportMode = patch.transportMode ?? undefined;
  if (patch.notes !== undefined) next.notes = patch.notes ?? undefined;
  if (patch.privateToUserIds !== undefined)
    next.privateToUserIds =
      patch.privateToUserIds && patch.privateToUserIds.length > 0
        ? patch.privateToUserIds
        : undefined;
  return next;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callApi<T>(
  input: string,
  init?: RequestInit,
): Promise<T | null> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return json.data ?? null;
}

interface TripsProviderProps {
  initialTrips: Trip[];
  children: ReactNode;
}

export function TripsProvider({ initialTrips, children }: TripsProviderProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [foodPlaces, setFoodPlaces] = useState<Record<string, FoodPlace[]>>({});
  const [activityPlaces, setActivityPlaces] = useState<
    Record<string, ActivityPlace[]>
  >({});
  const [cityOverrides, setCityOverrides] = useState<
    Record<string, CityOverride[]>
  >({});
  const [dayPlans, setDayPlans] = useState<Record<string, DayPlan[]>>({});
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [settlements, setSettlements] = useState<Record<string, Settlement[]>>(
    {},
  );
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [extrasStatus, setExtrasStatus] = useState<
    Record<string, ExtrasStatus>
  >({});
  // De-dupes concurrent loads for the same trip (e.g. dashboard + detail both
  // mounting). Callers awaiting an in-flight load share its promise instead of
  // firing a second round of six fetches.
  const extrasInFlight = useRef<Map<string, Promise<void>>>(new Map());

  const getTrip = useCallback(
    (id: string) => trips.find((t) => t.id === id),
    [trips],
  );

  const createTrip = useCallback(async (draft: TripDraft): Promise<Trip> => {
    const optimistic: Trip = {
      ...draft,
      id: tempId('trip'),
      items: [],
      members: [],
    };
    setTrips((prev) => [...prev, optimistic]);

    try {
      const created = await callApi<Trip>('/api/trips', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      if (!created) throw new Error('Trip not returned');
      setTrips((prev) =>
        prev.map((t) => (t.id === optimistic.id ? created : t)),
      );
      return created;
    } catch (err) {
      setTrips((prev) => prev.filter((t) => t.id !== optimistic.id));
      throw err;
    }
  }, []);

  const updateTrip = useCallback(
    async (id: string, patch: Partial<TripDraft>): Promise<void> => {
      let snapshot: Trip | undefined;
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          snapshot = t;
          return { ...t, ...patch };
        }),
      );

      try {
        const updated = await callApi<Trip>(`/api/trips/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        if (updated) {
          setTrips((prev) => prev.map((t) => (t.id === id ? updated : t)));
        }
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setTrips((prev) => prev.map((t) => (t.id === id ? restored : t)));
        }
        throw err;
      }
    },
    [],
  );

  const removeTrip = useCallback(async (id: string): Promise<void> => {
    if (isDemoTrip(id)) {
      throw new Error(DEMO_TRIP_PROTECTED_ERROR);
    }

    let snapshot: Trip | undefined;
    setTrips((prev) => {
      snapshot = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });

    try {
      await callApi<null>(`/api/trips/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (snapshot) {
        const restored = snapshot;
        setTrips((prev) => [...prev, restored]);
      }
      throw err;
    }
  }, []);

  const addItem = useCallback(
    async (tripId: string, draft: ItemDraft): Promise<TripItem> => {
      const optimistic: TripItem = { ...draft, id: tempId('item'), tripId };
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, items: [...t.items, optimistic] } : t,
        ),
      );

      try {
        const created = await callApi<TripItem>(`/api/trips/${tripId}/items`, {
          method: 'POST',
          body: JSON.stringify(draft),
        });
        if (!created) throw new Error('Item not returned');
        setTrips((prev) =>
          prev.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  items: t.items.map((i) =>
                    i.id === optimistic.id ? created : i,
                  ),
                }
              : t,
          ),
        );
        return created;
      } catch (err) {
        setTrips((prev) =>
          prev.map((t) =>
            t.id === tripId
              ? { ...t, items: t.items.filter((i) => i.id !== optimistic.id) }
              : t,
          ),
        );
        throw err;
      }
    },
    [],
  );

  const updateItem = useCallback(
    async (tripId: string, itemId: string, patch: ItemPatch): Promise<void> => {
      let snapshot: TripItem | undefined;
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                items: t.items.map((i) => {
                  if (i.id !== itemId) return i;
                  snapshot = i;
                  return applyItemPatch(i, patch);
                }),
              }
            : t,
        ),
      );

      try {
        const updated = await callApi<TripItem>(
          `/api/trips/${tripId}/items/${itemId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(patch),
          },
        );
        if (updated) {
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId
                ? {
                    ...t,
                    items: t.items.map((i) => (i.id === itemId ? updated : i)),
                  }
                : t,
            ),
          );
        }
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId
                ? {
                    ...t,
                    items: t.items.map((i) => (i.id === itemId ? restored : i)),
                  }
                : t,
            ),
          );
        }
        throw err;
      }
    },
    [],
  );

  const loadTripExtras = useCallback(async (tripId: string): Promise<void> => {
    const inFlight = extrasInFlight.current.get(tripId);
    if (inFlight) return inFlight;

    // First load shows a skeleton; later refreshes keep the cached data on
    // screen ('loaded' stays put) so the UI never flashes back to a skeleton.
    setExtrasStatus((prev) =>
      prev[tripId] === 'loaded' ? prev : { ...prev, [tripId]: 'loading' },
    );

    const run = (async () => {
      try {
        const [fp, ap, co, dp, ex, st] = await Promise.all([
          callApi<FoodPlace[]>(`/api/trips/${tripId}/food-places`),
          callApi<ActivityPlace[]>(`/api/trips/${tripId}/activity-places`),
          callApi<CityOverride[]>(`/api/trips/${tripId}/city-overrides`),
          callApi<DayPlan[]>(`/api/trips/${tripId}/day-plans`),
          callApi<Expense[]>(`/api/trips/${tripId}/expenses`),
          callApi<Settlement[]>(`/api/trips/${tripId}/settlements`),
        ]);
        setFoodPlaces((prev) => ({ ...prev, [tripId]: fp ?? [] }));
        setActivityPlaces((prev) => ({ ...prev, [tripId]: ap ?? [] }));
        setCityOverrides((prev) => ({ ...prev, [tripId]: co ?? [] }));
        setDayPlans((prev) => ({ ...prev, [tripId]: dp ?? [] }));
        setExpenses((prev) => ({ ...prev, [tripId]: ex ?? [] }));
        setSettlements((prev) => ({ ...prev, [tripId]: st ?? [] }));
        setExtrasStatus((prev) => ({ ...prev, [tripId]: 'loaded' }));
      } catch (err) {
        // Keep any already-cached data visible on a failed refresh; only the
        // initial load surfaces an error state.
        setExtrasStatus((prev) =>
          prev[tripId] === 'loaded' ? prev : { ...prev, [tripId]: 'error' },
        );
        throw err;
      } finally {
        extrasInFlight.current.delete(tripId);
      }
    })();

    extrasInFlight.current.set(tripId, run);
    return run;
  }, []);

  const addFoodPlace = useCallback(
    async (draft: FoodPlaceDraft): Promise<FoodPlace> => {
      const created = await callApi<FoodPlace>(
        `/api/trips/${draft.tripId}/food-places`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (!created) throw new Error('FoodPlace not returned');
      setFoodPlaces((prev) => ({
        ...prev,
        [draft.tripId]: [...(prev[draft.tripId] ?? []), created],
      }));
      return created;
    },
    [],
  );

  const updateFoodPlace = useCallback(
    async (id: string, patch: Partial<FoodPlaceDraft>): Promise<void> => {
      const tripId =
        patch.tripId ??
        Object.keys(foodPlaces).find((tid) =>
          foodPlaces[tid]?.some((p) => p.id === id),
        );
      if (!tripId) throw new Error(`FoodPlace ${id} not found in context`);
      const updated = await callApi<FoodPlace>(`/api/food-places/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (updated) {
        setFoodPlaces((prev) => ({
          ...prev,
          [tripId]: (prev[tripId] ?? []).map((p) =>
            p.id === id ? updated : p,
          ),
        }));
      }
    },
    [foodPlaces],
  );

  const removeFoodPlace = useCallback(
    async (tripId: string, id: string): Promise<void> => {
      setFoodPlaces((prev) => ({
        ...prev,
        [tripId]: (prev[tripId] ?? []).filter((p) => p.id !== id),
      }));
      try {
        await callApi<null>(`/api/food-places/${id}`, { method: 'DELETE' });
      } catch (err) {
        await loadTripExtras(tripId);
        throw err;
      }
    },
    [loadTripExtras],
  );

  const addActivityPlace = useCallback(
    async (draft: ActivityPlaceDraft): Promise<ActivityPlace> => {
      const created = await callApi<ActivityPlace>(
        `/api/trips/${draft.tripId}/activity-places`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (!created) throw new Error('ActivityPlace not returned');
      setActivityPlaces((prev) => ({
        ...prev,
        [draft.tripId]: [...(prev[draft.tripId] ?? []), created],
      }));
      return created;
    },
    [],
  );

  const updateActivityPlace = useCallback(
    async (id: string, patch: Partial<ActivityPlaceDraft>): Promise<void> => {
      const tripId =
        patch.tripId ??
        Object.keys(activityPlaces).find((tid) =>
          activityPlaces[tid]?.some((p) => p.id === id),
        );
      if (!tripId) throw new Error(`ActivityPlace ${id} not found in context`);
      const updated = await callApi<ActivityPlace>(
        `/api/activity-places/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      );
      if (updated) {
        setActivityPlaces((prev) => ({
          ...prev,
          [tripId]: (prev[tripId] ?? []).map((p) =>
            p.id === id ? updated : p,
          ),
        }));
      }
    },
    [activityPlaces],
  );

  const removeActivityPlace = useCallback(
    async (tripId: string, id: string): Promise<void> => {
      setActivityPlaces((prev) => ({
        ...prev,
        [tripId]: (prev[tripId] ?? []).filter((p) => p.id !== id),
      }));
      try {
        await callApi<null>(`/api/activity-places/${id}`, { method: 'DELETE' });
      } catch (err) {
        await loadTripExtras(tripId);
        throw err;
      }
    },
    [loadTripExtras],
  );

  const upsertCityOverride = useCallback(
    async (draft: CityOverrideDraft): Promise<void> => {
      const result = await callApi<CityOverride>(
        `/api/trips/${draft.tripId}/city-overrides`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (result) {
        setCityOverrides((prev) => {
          const existing = prev[draft.tripId] ?? [];
          const filtered = existing.filter((o) => o.dayKey !== draft.dayKey);
          return { ...prev, [draft.tripId]: [...filtered, result] };
        });
      }
    },
    [],
  );

  const removeCityOverride = useCallback(
    async (tripId: string, id: string): Promise<void> => {
      setCityOverrides((prev) => ({
        ...prev,
        [tripId]: (prev[tripId] ?? []).filter((o) => o.id !== id),
      }));
      try {
        await callApi<null>(`/api/city-overrides/${id}`, { method: 'DELETE' });
      } catch (err) {
        await loadTripExtras(tripId);
        throw err;
      }
    },
    [loadTripExtras],
  );

  const toggleDayPlan = useCallback(
    async (tripId: string, dayKey: string): Promise<void> => {
      const existing = (dayPlans[tripId] ?? []).find(
        (p) => p.dayKey === dayKey,
      );
      if (existing) {
        setDayPlans((prev) => ({
          ...prev,
          [tripId]: (prev[tripId] ?? []).filter((p) => p.id !== existing.id),
        }));
        try {
          await callApi<null>(`/api/day-plans/${existing.id}`, {
            method: 'DELETE',
          });
        } catch (err) {
          await loadTripExtras(tripId);
          throw err;
        }
        return;
      }
      const result = await callApi<DayPlan>(`/api/trips/${tripId}/day-plans`, {
        method: 'POST',
        body: JSON.stringify({ dayKey }),
      });
      if (result) {
        setDayPlans((prev) => {
          const current = prev[tripId] ?? [];
          const filtered = current.filter((p) => p.dayKey !== dayKey);
          return { ...prev, [tripId]: [...filtered, result] };
        });
      }
    },
    [dayPlans, loadTripExtras],
  );

  const addExpense = useCallback(
    async (draft: ExpenseDraft): Promise<Expense> => {
      const created = await callApi<Expense>(
        `/api/trips/${draft.tripId}/expenses`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (!created) throw new Error('Expense not returned');
      setExpenses((prev) => ({
        ...prev,
        [draft.tripId]: [...(prev[draft.tripId] ?? []), created],
      }));
      return created;
    },
    [],
  );

  const updateExpense = useCallback(
    async (tripId: string, id: string, patch: ExpensePatch): Promise<void> => {
      const updated = await callApi<Expense>(`/api/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (!updated) return;
      setExpenses((prev) => ({
        ...prev,
        [tripId]: (prev[tripId] ?? []).map((e) => (e.id === id ? updated : e)),
      }));
    },
    [],
  );

  const removeExpense = useCallback(
    async (tripId: string, id: string): Promise<void> => {
      let snapshot: Expense | undefined;
      setExpenses((prev) => {
        const list = prev[tripId] ?? [];
        snapshot = list.find((e) => e.id === id);
        return { ...prev, [tripId]: list.filter((e) => e.id !== id) };
      });
      try {
        await callApi<null>(`/api/expenses/${id}`, { method: 'DELETE' });
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setExpenses((prev) => ({
            ...prev,
            [tripId]: [...(prev[tripId] ?? []), restored],
          }));
        }
        throw err;
      }
    },
    [],
  );

  const addSettlement = useCallback(
    async (draft: SettlementDraft): Promise<Settlement> => {
      const created = await callApi<Settlement>(
        `/api/trips/${draft.tripId}/settlements`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (!created) throw new Error('Settlement not returned');
      setSettlements((prev) => ({
        ...prev,
        [draft.tripId]: [created, ...(prev[draft.tripId] ?? [])],
      }));
      return created;
    },
    [],
  );

  const updateSettlement = useCallback(
    async (
      tripId: string,
      id: string,
      patch: SettlementUpdate,
    ): Promise<Settlement> => {
      let snapshot: Settlement | undefined;
      setSettlements((prev) => {
        const list = prev[tripId] ?? [];
        snapshot = list.find((s) => s.id === id);
        return {
          ...prev,
          [tripId]: list.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        };
      });
      try {
        const updated = await callApi<Settlement>(`/api/settlements/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        if (updated) {
          setSettlements((prev) => ({
            ...prev,
            [tripId]: (prev[tripId] ?? []).map((s) =>
              s.id === id ? updated : s,
            ),
          }));
          return updated;
        }
        return { ...(snapshot as Settlement), ...patch, id, tripId };
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setSettlements((prev) => ({
            ...prev,
            [tripId]: (prev[tripId] ?? []).map((s) =>
              s.id === id ? restored : s,
            ),
          }));
        }
        throw err;
      }
    },
    [],
  );

  const removeSettlement = useCallback(
    async (tripId: string, id: string): Promise<void> => {
      let snapshot: Settlement | undefined;
      setSettlements((prev) => {
        const list = prev[tripId] ?? [];
        snapshot = list.find((s) => s.id === id);
        return { ...prev, [tripId]: list.filter((s) => s.id !== id) };
      });
      try {
        await callApi<null>(`/api/settlements/${id}`, { method: 'DELETE' });
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setSettlements((prev) => ({
            ...prev,
            [tripId]: [...(prev[tripId] ?? []), restored],
          }));
        }
        throw err;
      }
    },
    [],
  );

  const addMember = useCallback(
    async (tripId: string, draft: TripMemberDraft): Promise<TripMember> => {
      const created = await callApi<TripMember>(
        `/api/trips/${tripId}/members`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (!created) throw new Error('Member not returned');
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, members: [...t.members, created] } : t,
        ),
      );
      return created;
    },
    [],
  );

  const updateMember = useCallback(
    async (
      tripId: string,
      memberId: string,
      patch: TripMemberPatch,
    ): Promise<void> => {
      let snapshot: TripMember | undefined;
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                members: t.members.map((m) => {
                  if (m.id !== memberId) return m;
                  snapshot = m;
                  return patch.displayName !== undefined
                    ? { ...m, displayName: patch.displayName }
                    : m;
                }),
              }
            : t,
        ),
      );
      try {
        const updated = await callApi<TripMember>(
          `/api/trips/${tripId}/members/${memberId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(patch),
          },
        );
        if (updated) {
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId
                ? {
                    ...t,
                    members: t.members.map((m) =>
                      m.id === memberId ? updated : m,
                    ),
                  }
                : t,
            ),
          );
        }
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId
                ? {
                    ...t,
                    members: t.members.map((m) =>
                      m.id === memberId ? restored : m,
                    ),
                  }
                : t,
            ),
          );
        }
        throw err;
      }
    },
    [],
  );

  const removeMember = useCallback(
    async (tripId: string, memberId: string): Promise<RemoveMemberResult> => {
      let snapshot: TripMember | undefined;
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t;
          snapshot = t.members.find((m) => m.id === memberId);
          return {
            ...t,
            members: t.members.filter((m) => m.id !== memberId),
          };
        }),
      );
      try {
        const result = await callApi<RemoveMemberResult>(
          `/api/trips/${tripId}/members/${memberId}`,
          { method: 'DELETE' },
        );
        // A retired member keeps their row as a name-only participant so their
        // expense history and balances stay intact — re-insert it in place of
        // the optimistic removal.
        if (result?.retired) {
          const retired = result.member;
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId ? { ...t, members: [...t.members, retired] } : t,
            ),
          );
        }
        return result ?? { retired: false };
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId ? { ...t, members: [...t.members, restored] } : t,
            ),
          );
        }
        throw err;
      }
    },
    [],
  );

  const inviteMember = useCallback(
    async (
      tripId: string,
      memberId: string,
      draft: MemberInviteDraft,
    ): Promise<TripMember> => {
      const updated = await callApi<TripMember>(
        `/api/trips/${tripId}/members/${memberId}/invite`,
        {
          method: 'POST',
          body: JSON.stringify(draft),
        },
      );
      if (!updated) throw new Error('Member not returned');
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                members: t.members.map((m) =>
                  m.id === memberId ? updated : m,
                ),
              }
            : t,
        ),
      );
      return updated;
    },
    [],
  );

  // Not optimistic on purpose: ownership drives who may manage members and
  // delete the trip, so the UI only swaps it once the server has committed.
  const transferOwnership = useCallback(
    async (tripId: string, memberId: string): Promise<void> => {
      const result = await callApi<{ ownerId: string }>(
        `/api/trips/${tripId}/members/${memberId}/transfer-ownership`,
        { method: 'POST' },
      );
      if (!result?.ownerId) throw new Error('Owner not returned');
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, ownerId: result.ownerId } : t,
        ),
      );
    },
    [],
  );

  const refreshInvitations = useCallback(async (): Promise<void> => {
    try {
      const data = await callApi<TripInvitation[]>('/api/invitations');
      setInvitations(data ?? []);
    } catch {
      // Anonymous / signed-out users have no invitations; stay silent.
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    callApi<TripInvitation[]>('/api/invitations')
      .then((data) => {
        if (active) setInvitations(data ?? []);
      })
      .catch(() => {
        // Anonymous / signed-out users have no invitations; stay silent.
        if (active) setInvitations([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const acceptInvitation = useCallback(
    async (memberId: string): Promise<void> => {
      const result = await callApi<{ tripId: string }>(
        `/api/invitations/${memberId}`,
        { method: 'POST' },
      );
      setInvitations((prev) => prev.filter((i) => i.memberId !== memberId));
      // The trip is now accessible — pull it in so it shows on the dashboard.
      const tripId = result?.tripId;
      if (tripId) {
        try {
          const trip = await callApi<Trip>(`/api/trips/${tripId}`);
          if (trip) {
            setTrips((prev) =>
              prev.some((t) => t.id === trip.id)
                ? prev.map((t) => (t.id === trip.id ? trip : t))
                : [...prev, trip],
            );
          }
        } catch {
          // Non-fatal: the trip will appear on next full load.
        }
      }
    },
    [],
  );

  const declineInvitation = useCallback(
    async (memberId: string): Promise<void> => {
      let snapshot: TripInvitation | undefined;
      setInvitations((prev) => {
        snapshot = prev.find((i) => i.memberId === memberId);
        return prev.filter((i) => i.memberId !== memberId);
      });
      try {
        await callApi<null>(`/api/invitations/${memberId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setInvitations((prev) => [...prev, restored]);
        }
        throw err;
      }
    },
    [],
  );

  const removeItem = useCallback(
    async (tripId: string, itemId: string): Promise<void> => {
      let snapshot: TripItem | undefined;
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t;
          snapshot = t.items.find((i) => i.id === itemId);
          return { ...t, items: t.items.filter((i) => i.id !== itemId) };
        }),
      );

      try {
        await callApi<null>(`/api/trips/${tripId}/items/${itemId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        if (snapshot) {
          const restored = snapshot;
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId ? { ...t, items: [...t.items, restored] } : t,
            ),
          );
        }
        throw err;
      }
    },
    [],
  );

  const value = useMemo<TripsState>(
    () => ({
      trips,
      getTrip,
      createTrip,
      updateTrip,
      removeTrip,
      addItem,
      updateItem,
      removeItem,
      foodPlaces,
      activityPlaces,
      cityOverrides,
      dayPlans,
      expenses,
      settlements,
      extrasStatus,
      loadTripExtras,
      addFoodPlace,
      updateFoodPlace,
      removeFoodPlace,
      addActivityPlace,
      updateActivityPlace,
      removeActivityPlace,
      upsertCityOverride,
      removeCityOverride,
      toggleDayPlan,
      addExpense,
      updateExpense,
      removeExpense,
      addSettlement,
      updateSettlement,
      removeSettlement,
      addMember,
      updateMember,
      removeMember,
      inviteMember,
      transferOwnership,
      invitations,
      refreshInvitations,
      acceptInvitation,
      declineInvitation,
    }),
    [
      trips,
      getTrip,
      createTrip,
      updateTrip,
      removeTrip,
      addItem,
      updateItem,
      removeItem,
      foodPlaces,
      activityPlaces,
      cityOverrides,
      dayPlans,
      expenses,
      settlements,
      extrasStatus,
      loadTripExtras,
      addFoodPlace,
      updateFoodPlace,
      removeFoodPlace,
      addActivityPlace,
      updateActivityPlace,
      removeActivityPlace,
      upsertCityOverride,
      removeCityOverride,
      toggleDayPlan,
      addExpense,
      updateExpense,
      removeExpense,
      addSettlement,
      updateSettlement,
      removeSettlement,
      addMember,
      updateMember,
      removeMember,
      inviteMember,
      transferOwnership,
      invitations,
      refreshInvitations,
      acceptInvitation,
      declineInvitation,
    ],
  );

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  );
}

export function useTrips(): TripsState {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used inside <TripsProvider>');
  return ctx;
}

export function useTripsOptional(): TripsState | null {
  return useContext(TripsContext);
}
