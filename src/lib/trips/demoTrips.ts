import { mockTrips } from './mockData';
import type { Trip } from './types';

// Demo trips that must always be available and can never be deleted.
// Source of truth is mockData; these IDs are not stored in Supabase
// (the trips table uses uuid ids, so they can never collide).
const DEMO_TRIP_IDS: ReadonlySet<string> = new Set(['trip-lisbon']);

export const DEMO_TRIP_PROTECTED_ERROR = 'demo_trip_protected';

export function isDemoTrip(id: string): boolean {
  return DEMO_TRIP_IDS.has(id);
}

export function getDemoTrip(id: string): Trip | undefined {
  if (!isDemoTrip(id)) return undefined;
  const found = mockTrips.find((t) => t.id === id);
  return found ? cloneTrip(found) : undefined;
}

export function listDemoTrips(): Trip[] {
  return mockTrips.filter((t) => DEMO_TRIP_IDS.has(t.id)).map(cloneTrip);
}

function cloneTrip(trip: Trip): Trip {
  return {
    ...trip,
    members: trip.members.map((m) => ({ ...m })),
    items: trip.items.map((i) => ({ ...i })),
  };
}
