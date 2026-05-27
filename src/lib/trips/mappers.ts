import type {
  CityOverride,
  CityOverrideDraft,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  Place,
  Trip,
  TripDraft,
  TripItem,
} from './types';

export interface TripRow {
  id: string;
  owner_id: string;
  title: string;
  destination: string;
  cover_image: string | null;
  cover_gradient: string;
  start_date: string;
  end_date: string;
  travelers: string[];
}

export interface TripItemRow {
  id: string;
  trip_id: string;
  kind: TripItem['kind'];
  title: string;
  starts_at: string;
  ends_at: string | null;
  from_place: Place | null;
  to_place: Place | null;
  transport_mode: string | null;
  notes: string | null;
  expense: { amount: number; currency: string } | null;
}

export function rowToItem(row: TripItemRow): TripItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    from: row.from_place ?? undefined,
    to: row.to_place ?? undefined,
    transportMode:
      (row.transport_mode as TripItem['transportMode']) ?? undefined,
    notes: row.notes ?? undefined,
    expense: row.expense ?? undefined,
  };
}

export function rowToTrip(
  row: TripRow,
  items: TripItemRow[] | null | undefined,
): Trip {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    coverImage: row.cover_image ?? undefined,
    coverGradient: row.cover_gradient,
    startDate: row.start_date,
    endDate: row.end_date,
    travelers: row.travelers ?? [],
    items: (items ?? [])
      .map(rowToItem)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
  };
}

export function tripDraftToInsert(
  draft: TripDraft,
): Omit<TripRow, 'id' | 'owner_id'> {
  return {
    title: draft.title,
    destination: draft.destination,
    cover_image: draft.coverImage ?? null,
    cover_gradient: draft.coverGradient,
    start_date: draft.startDate,
    end_date: draft.endDate,
    travelers: draft.travelers,
  };
}

export function tripPatchToUpdate(
  patch: Partial<TripDraft>,
): Partial<Omit<TripRow, 'id' | 'owner_id'>> {
  const out: Partial<Omit<TripRow, 'id' | 'owner_id'>> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.destination !== undefined) out.destination = patch.destination;
  if (patch.coverImage !== undefined)
    out.cover_image = patch.coverImage ?? null;
  if (patch.coverGradient !== undefined)
    out.cover_gradient = patch.coverGradient;
  if (patch.startDate !== undefined) out.start_date = patch.startDate;
  if (patch.endDate !== undefined) out.end_date = patch.endDate;
  if (patch.travelers !== undefined) out.travelers = patch.travelers;
  return out;
}

export function itemDraftToInsert(
  tripId: string,
  draft: ItemDraft,
): Omit<TripItemRow, 'id'> {
  return {
    trip_id: tripId,
    kind: draft.kind,
    title: draft.title,
    starts_at: draft.startsAt,
    ends_at: draft.endsAt ?? null,
    from_place: draft.from ?? null,
    to_place: draft.to ?? null,
    transport_mode: draft.transportMode ?? null,
    notes: draft.notes ?? null,
    expense: draft.expense ?? null,
  };
}

export interface FoodPlaceRow {
  id: string;
  trip_id: string;
  city_label: string;
  city_place_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  notes: string | null;
  category: string | null;
}

export interface CityOverrideRow {
  id: string;
  trip_id: string;
  day_key: string;
  city_label: string;
  city_place_id: string | null;
}

export function rowToFoodPlace(row: FoodPlaceRow): FoodPlace {
  return {
    id: row.id,
    tripId: row.trip_id,
    cityLabel: row.city_label,
    cityPlaceId: row.city_place_id ?? undefined,
    name: row.name,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    placeId: row.place_id ?? undefined,
    notes: row.notes ?? undefined,
    category: (row.category as FoodPlace['category']) ?? undefined,
  };
}

export function foodPlaceDraftToInsert(
  draft: FoodPlaceDraft,
): Omit<FoodPlaceRow, 'id'> {
  return {
    trip_id: draft.tripId,
    city_label: draft.cityLabel,
    city_place_id: draft.cityPlaceId ?? null,
    name: draft.name,
    address: draft.address ?? null,
    lat: draft.lat ?? null,
    lng: draft.lng ?? null,
    place_id: draft.placeId ?? null,
    notes: draft.notes ?? null,
    category: draft.category ?? null,
  };
}

export function foodPlacePatchToUpdate(
  patch: Partial<FoodPlaceDraft>,
): Partial<Omit<FoodPlaceRow, 'id' | 'trip_id'>> {
  const out: Partial<Omit<FoodPlaceRow, 'id' | 'trip_id'>> = {};
  if (patch.cityLabel !== undefined) out.city_label = patch.cityLabel;
  if (patch.cityPlaceId !== undefined)
    out.city_place_id = patch.cityPlaceId ?? null;
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.address !== undefined) out.address = patch.address ?? null;
  if (patch.lat !== undefined) out.lat = patch.lat ?? null;
  if (patch.lng !== undefined) out.lng = patch.lng ?? null;
  if (patch.placeId !== undefined) out.place_id = patch.placeId ?? null;
  if (patch.notes !== undefined) out.notes = patch.notes ?? null;
  if (patch.category !== undefined) out.category = patch.category ?? null;
  return out;
}

export function rowToCityOverride(row: CityOverrideRow): CityOverride {
  return {
    id: row.id,
    tripId: row.trip_id,
    dayKey: row.day_key,
    cityLabel: row.city_label,
    cityPlaceId: row.city_place_id ?? undefined,
  };
}

export function cityOverrideDraftToInsert(
  draft: CityOverrideDraft,
): Omit<CityOverrideRow, 'id'> {
  return {
    trip_id: draft.tripId,
    day_key: draft.dayKey,
    city_label: draft.cityLabel,
    city_place_id: draft.cityPlaceId ?? null,
  };
}

export function itemPatchToUpdate(
  patch: ItemPatch,
): Partial<Omit<TripItemRow, 'id' | 'trip_id'>> {
  const out: Partial<Omit<TripItemRow, 'id' | 'trip_id'>> = {};
  if (patch.kind !== undefined) out.kind = patch.kind;
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.startsAt !== undefined) out.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) out.ends_at = patch.endsAt ?? null;
  if (patch.from !== undefined) out.from_place = patch.from ?? null;
  if (patch.to !== undefined) out.to_place = patch.to ?? null;
  if (patch.transportMode !== undefined)
    out.transport_mode = patch.transportMode ?? null;
  if (patch.notes !== undefined) out.notes = patch.notes ?? null;
  if (patch.expense !== undefined) out.expense = patch.expense ?? null;
  return out;
}
