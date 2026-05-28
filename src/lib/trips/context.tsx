'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CityOverride,
  CityOverrideDraft,
  Expense,
  ExpenseDraft,
  ExpensePatch,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  Trip,
  TripDraft,
  TripItem,
  TripMember,
  TripMemberDraft,
  TripMemberPatch,
} from './types';
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
  cityOverrides: Record<string, CityOverride[]>;
  expenses: Record<string, Expense[]>;
  loadTripExtras: (tripId: string) => Promise<void>;
  addFoodPlace: (draft: FoodPlaceDraft) => Promise<FoodPlace>;
  updateFoodPlace: (
    id: string,
    patch: Partial<FoodPlaceDraft>,
  ) => Promise<void>;
  removeFoodPlace: (tripId: string, id: string) => Promise<void>;
  upsertCityOverride: (draft: CityOverrideDraft) => Promise<void>;
  removeCityOverride: (tripId: string, id: string) => Promise<void>;
  addExpense: (draft: ExpenseDraft) => Promise<Expense>;
  updateExpense: (
    tripId: string,
    id: string,
    patch: ExpensePatch,
  ) => Promise<void>;
  removeExpense: (tripId: string, id: string) => Promise<void>;

  addMember: (tripId: string, draft: TripMemberDraft) => Promise<TripMember>;
  updateMember: (
    tripId: string,
    memberId: string,
    patch: TripMemberPatch,
  ) => Promise<void>;
  removeMember: (tripId: string, memberId: string) => Promise<void>;
}

const TripsContext = createContext<TripsState | null>(null);

const tempId = (prefix: string): string =>
  `${prefix}-tmp-${Math.random().toString(36).slice(2, 9)}`;

function applyItemPatch(item: TripItem, patch: ItemPatch): TripItem {
  const next: TripItem = { ...item };
  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.startsAt !== undefined) next.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) next.endsAt = patch.endsAt ?? undefined;
  if (patch.from !== undefined) next.from = patch.from ?? undefined;
  if (patch.to !== undefined) next.to = patch.to ?? undefined;
  if (patch.transportMode !== undefined)
    next.transportMode = patch.transportMode ?? undefined;
  if (patch.notes !== undefined) next.notes = patch.notes ?? undefined;
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
  const [cityOverrides, setCityOverrides] = useState<
    Record<string, CityOverride[]>
  >({});
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});

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
    const [fp, co, ex] = await Promise.all([
      callApi<FoodPlace[]>(`/api/trips/${tripId}/food-places`),
      callApi<CityOverride[]>(`/api/trips/${tripId}/city-overrides`),
      callApi<Expense[]>(`/api/trips/${tripId}/expenses`),
    ]);
    setFoodPlaces((prev) => ({ ...prev, [tripId]: fp ?? [] }));
    setCityOverrides((prev) => ({ ...prev, [tripId]: co ?? [] }));
    setExpenses((prev) => ({ ...prev, [tripId]: ex ?? [] }));
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
    async (tripId: string, memberId: string): Promise<void> => {
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
        await callApi<null>(`/api/trips/${tripId}/members/${memberId}`, {
          method: 'DELETE',
        });
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
      cityOverrides,
      expenses,
      loadTripExtras,
      addFoodPlace,
      updateFoodPlace,
      removeFoodPlace,
      upsertCityOverride,
      removeCityOverride,
      addExpense,
      updateExpense,
      removeExpense,
      addMember,
      updateMember,
      removeMember,
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
      cityOverrides,
      expenses,
      loadTripExtras,
      addFoodPlace,
      updateFoodPlace,
      removeFoodPlace,
      upsertCityOverride,
      removeCityOverride,
      addExpense,
      updateExpense,
      removeExpense,
      addMember,
      updateMember,
      removeMember,
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
