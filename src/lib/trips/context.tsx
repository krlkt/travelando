'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ItemDraft, Trip, TripDraft, TripItem } from './types';
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
    patch: Partial<ItemDraft>,
  ) => Promise<void>;
  removeItem: (tripId: string, itemId: string) => Promise<void>;
}

const TripsContext = createContext<TripsState | null>(null);

const tempId = (prefix: string): string =>
  `${prefix}-tmp-${Math.random().toString(36).slice(2, 9)}`;

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

  const getTrip = useCallback(
    (id: string) => trips.find((t) => t.id === id),
    [trips],
  );

  const createTrip = useCallback(async (draft: TripDraft): Promise<Trip> => {
    const optimistic: Trip = { ...draft, id: tempId('trip'), items: [] };
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
    async (
      tripId: string,
      itemId: string,
      patch: Partial<ItemDraft>,
    ): Promise<void> => {
      let snapshot: TripItem | undefined;
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                items: t.items.map((i) => {
                  if (i.id !== itemId) return i;
                  snapshot = i;
                  return { ...i, ...patch };
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
