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

interface TripsState {
  trips: Trip[];
  getTrip: (id: string) => Trip | undefined;
  createTrip: (draft: TripDraft) => Trip;
  updateTrip: (id: string, patch: Partial<TripDraft>) => void;
  removeTrip: (id: string) => void;
  addItem: (tripId: string, draft: ItemDraft) => TripItem;
  updateItem: (
    tripId: string,
    itemId: string,
    patch: Partial<ItemDraft>,
  ) => void;
  removeItem: (tripId: string, itemId: string) => void;
}

const TripsContext = createContext<TripsState | null>(null);

const randomId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

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

  const createTrip = useCallback((draft: TripDraft): Trip => {
    const trip: Trip = { ...draft, id: randomId('trip'), items: [] };
    setTrips((prev) => [...prev, trip]);
    return trip;
  }, []);

  const updateTrip = useCallback((id: string, patch: Partial<TripDraft>) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addItem = useCallback((tripId: string, draft: ItemDraft): TripItem => {
    const item: TripItem = { ...draft, id: randomId('item'), tripId };
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, items: [...t.items, item] } : t,
      ),
    );
    return item;
  }, []);

  const updateItem = useCallback(
    (tripId: string, itemId: string, patch: Partial<ItemDraft>) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                items: t.items.map((i) =>
                  i.id === itemId ? { ...i, ...patch } : i,
                ),
              }
            : t,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((tripId: string, itemId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, items: t.items.filter((i) => i.id !== itemId) }
          : t,
      ),
    );
  }, []);

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
