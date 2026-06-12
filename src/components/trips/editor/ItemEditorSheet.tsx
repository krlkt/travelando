'use client';

import { useMemo, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PlaceAutocomplete } from '@/components/places/PlaceAutocomplete';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TimeField } from '@/components/ui/TimeField';
import { useTrips } from '@/lib/trips/context';
import { cn } from '@/lib/utils';
import { itemKinds, transportModes, kindMeta } from '@/lib/trips/kindMeta';
import {
  latestCityBefore,
  foodPlaceCitiesForDay,
  findLodgingConflict,
} from '@/lib/trips/cities';
import { dayKey, formatDate } from '@/lib/time/formatDate';
import {
  toLocalInput,
  fromLocalInput,
  getDatePart,
  getTimePart,
  todayLocalDate,
} from '@/lib/time/timeInput';
import { parseNaive, toNaiveString } from '@/lib/time/naive';
import type {
  ActivityPlace,
  FoodPlace,
  ItemDraft,
  ItemKind,
  ItemPatch,
  Place,
  TransportMode,
  Trip,
  TripItem,
} from '@/lib/trips/types';
import type { TransportPrefill } from '@/lib/trips/legGap';

interface ItemEditorSheetProps {
  trip: Trip;
  item?: TripItem | null;
  defaultDate?: Date | null;
  /** Seeds a brand-new item (e.g. quick-add transport between two stops). */
  prefill?: TransportPrefill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initialStartsAt(
  item: TripItem | null | undefined,
  defaultDate: Date | null | undefined,
  prefill: TransportPrefill | null | undefined,
): string {
  if (item) return toLocalInput(item.startsAt);
  if (prefill?.startsAt) return toLocalInput(prefill.startsAt);
  if (defaultDate) {
    const start = new Date(defaultDate);
    start.setHours(9, 0, 0, 0);
    return toNaiveString(start);
  }
  return '';
}

function initialEndsAt(
  item: TripItem | null | undefined,
  defaultDate: Date | null | undefined,
  prefill: TransportPrefill | null | undefined,
): string {
  if (item) return toLocalInput(item.endsAt);
  if (prefill?.endsAt) return toLocalInput(prefill.endsAt);
  if (defaultDate) {
    const end = new Date(defaultDate);
    end.setHours(10, 0, 0, 0);
    return toNaiveString(end);
  }
  return '';
}

export function ItemEditorSheet({
  trip,
  item,
  defaultDate,
  prefill,
  open,
  onOpenChange,
}: ItemEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[480px]">
        {open && (
          <ItemEditorBody
            trip={trip}
            item={item}
            defaultDate={defaultDate}
            prefill={prefill}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ItemEditorBodyProps {
  trip: Trip;
  item?: TripItem | null;
  defaultDate?: Date | null;
  prefill?: TransportPrefill | null;
  onClose: () => void;
}

function ItemEditorBody({
  trip,
  item,
  defaultDate,
  prefill,
  onClose,
}: ItemEditorBodyProps) {
  const { addItem, updateItem, foodPlaces, activityPlaces, cityOverrides } =
    useTrips();
  const { user } = useAuth();
  const tripId = trip.id;
  const isEdit = !!item;

  // A transport prefill (quick-add between two stops) seeds the leg's cities
  // from wherever the trip places you at that time, mirroring handleKindChange.
  const prefillCity =
    !item && prefill?.kind === 'transport'
      ? (() => {
          const isoTs =
            prefill.startsAt ?? prefill.endsAt ?? toNaiveString(new Date());
          const city = latestCityBefore(
            trip,
            cityOverrides[tripId] ?? [],
            isoTs,
          );
          return { label: city.cityLabel, placeId: city.cityPlaceId };
        })()
      : null;

  const [kind, setKind] = useState<ItemKind>(
    item?.kind ?? prefill?.kind ?? 'activity',
  );
  const [isPrivate, setIsPrivate] = useState<boolean>(
    (item?.privateToUserIds?.length ?? 0) > 0,
  );
  const [privateUserIds, setPrivateUserIds] = useState<string[]>(
    item?.privateToUserIds ?? [],
  );
  const [title, setTitle] = useState<string>(item?.title ?? '');
  const [startsAt, setStartsAt] = useState<string>(
    initialStartsAt(item, defaultDate, prefill),
  );
  const [endsAt, setEndsAt] = useState<string>(
    initialEndsAt(item, defaultDate, prefill),
  );
  const [fromCityValue, setFromCityValue] = useState<string>(
    item?.fromCity?.label ?? prefillCity?.label ?? '',
  );
  const [fromCityPlace, setFromCityPlace] = useState<Place | undefined>(
    item?.fromCity ?? prefillCity ?? undefined,
  );
  const [toCityValue, setToCityValue] = useState<string>(
    item?.toCity?.label ?? '',
  );
  const [toCityPlace, setToCityPlace] = useState<Place | undefined>(
    item?.toCity ?? undefined,
  );
  const [fromValue, setFromValue] = useState<string>(
    item?.from?.label ?? prefill?.from.label ?? '',
  );
  const [fromPlace, setFromPlace] = useState<Place | undefined>(
    item?.from ?? prefill?.from ?? undefined,
  );
  const [toValue, setToValue] = useState<string>(
    item?.to?.label ?? prefill?.to.label ?? '',
  );
  const [toPlace, setToPlace] = useState<Place | undefined>(
    item?.to ?? prefill?.to ?? undefined,
  );
  const [transportMode, setTransportMode] = useState<TransportMode>(
    (item?.transportMode as TransportMode) ?? 'flight',
  );
  const [notes, setNotes] = useState<string>(item?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [privacyConfirmOpen, setPrivacyConfirmOpen] = useState(false);
  const pendingSave = useRef<(() => Promise<void>) | null>(null);

  function handleKindChange(newKind: ItemKind) {
    setKind(newKind);
    if (newKind === 'transport' && !isEdit) {
      const isoTs = startsAt
        ? fromLocalInput(startsAt)
        : toNaiveString(new Date());
      const city = latestCityBefore(trip, cityOverrides[tripId] ?? [], isoTs);
      setFromCityValue(city.cityLabel);
      setFromCityPlace({ label: city.cityLabel, placeId: city.cityPlaceId });
    }
    if (newKind === 'lodging' && !isEdit) {
      const base = startsAt ? parseNaive(startsAt) : new Date();
      const checkIn = new Date(base);
      checkIn.setHours(15, 0, 0, 0);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
      checkOut.setHours(11, 0, 0, 0);
      setStartsAt(toNaiveString(checkIn));
      setEndsAt(toNaiveString(checkOut));
      setFromValue('');
      setFromPlace(undefined);
    }
  }

  const dayCities = useMemo(() => {
    if (!startsAt) return null;
    return foodPlaceCitiesForDay(
      trip,
      cityOverrides[tripId] ?? [],
      dayKey(fromLocalInput(startsAt)),
    );
  }, [startsAt, cityOverrides, tripId, trip]);

  const wishlistByCity = useMemo(() => {
    const all: Array<FoodPlace | ActivityPlace> =
      kind === 'activity'
        ? (activityPlaces[tripId] ?? [])
        : (foodPlaces[tripId] ?? []);
    const cities = dayCities ?? [{ cityLabel: trip.destination }];
    return cities.map((city) => {
      const places = all.filter((fp) =>
        fp.cityPlaceId && city.cityPlaceId
          ? fp.cityPlaceId === city.cityPlaceId
          : fp.cityLabel === city.cityLabel,
      );
      return { city, places };
    });
  }, [kind, foodPlaces, activityPlaces, tripId, dayCities, trip.destination]);

  const totalWishlistCount = useMemo(
    () => wishlistByCity.reduce((sum, group) => sum + group.places.length, 0),
    [wishlistByCity],
  );

  function handleWishlistSelect(fp: FoodPlace | ActivityPlace) {
    setTitle(fp.name);
    setToValue(fp.address ?? fp.name);
    setToPlace({
      label: fp.name,
      address: fp.address,
      lat: fp.lat,
      lng: fp.lng,
      placeId: fp.placeId,
    });
  }

  const accountMembers = trip.members.filter((m) => m.userId != null);

  function handlePrivacyToggle() {
    if (isPrivate) {
      setIsPrivate(false);
      setPrivateUserIds([]);
    } else {
      setIsPrivate(true);
      if (user?.id && !privateUserIds.includes(user.id)) {
        setPrivateUserIds([user.id]);
      }
    }
  }

  function togglePrivateMember(userId: string) {
    if (userId === user?.id) return;
    setPrivateUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  const handleSave = async () => {
    const effectiveTitle =
      kind === 'lodging' ? (toPlace?.label ?? toValue.trim()) : title.trim();
    if (kind === 'lodging' && !effectiveTitle) {
      setError('Add where you are staying.');
      return;
    }
    if (!effectiveTitle) {
      setError('Add a title.');
      return;
    }
    if (!startsAt) {
      setError('Pick a start time.');
      return;
    }
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      setError("End time can't be before the start.");
      return;
    }
    if (kind === 'lodging') {
      if (!endsAt) {
        setError('Lodging needs a check-out time.');
        return;
      }
      const conflict = findLodgingConflict(
        trip,
        fromLocalInput(startsAt),
        fromLocalInput(endsAt),
        item?.id,
      );
      if (conflict) {
        const range = conflict.endsAt
          ? `${formatDate(conflict.startsAt)} → ${formatDate(conflict.endsAt)}`
          : formatDate(conflict.startsAt);
        setError(
          `Overlaps with "${conflict.title}" (${range}). Only one lodging per night.`,
        );
        return;
      }
    }

    const resolvedFromCity: Place | undefined =
      kind === 'transport'
        ? (fromCityPlace ??
          (fromCityValue.trim() ? { label: fromCityValue.trim() } : undefined))
        : undefined;
    const resolvedToCity: Place | undefined =
      kind === 'transport'
        ? (toCityPlace ??
          (toCityValue.trim() ? { label: toCityValue.trim() } : undefined))
        : undefined;

    const resolvedFrom: Place | undefined =
      kind === 'meal' || kind === 'lodging'
        ? undefined
        : (fromPlace ??
          (fromValue.trim() ? { label: fromValue.trim() } : undefined));
    const resolvedTo: Place | undefined =
      toPlace ?? (toValue.trim() ? { label: toValue.trim() } : undefined);

    const doSave = async () => {
      setSaving(true);
      try {
        if (isEdit && item) {
          const patch: ItemPatch = {
            kind,
            title: effectiveTitle,
            startsAt: fromLocalInput(startsAt),
            endsAt: endsAt ? fromLocalInput(endsAt) : null,
            fromCity: resolvedFromCity ?? null,
            toCity: resolvedToCity ?? null,
            from: resolvedFrom ?? null,
            to: resolvedTo ?? null,
            transportMode: kind === 'transport' ? transportMode : null,
            notes: notes.trim() || null,
            privateToUserIds:
              isPrivate && privateUserIds.length > 0 ? privateUserIds : null,
          };
          await updateItem(tripId, item.id, patch);
          toast.success('Item updated');
        } else {
          const draft: ItemDraft = {
            kind,
            title: effectiveTitle,
            startsAt: fromLocalInput(startsAt),
            endsAt: endsAt ? fromLocalInput(endsAt) : undefined,
            fromCity: resolvedFromCity,
            toCity: resolvedToCity,
            from: resolvedFrom,
            to: resolvedTo,
            transportMode: kind === 'transport' ? transportMode : undefined,
            notes: notes.trim() || undefined,
            privateToUserIds:
              isPrivate && privateUserIds.length > 0
                ? privateUserIds
                : undefined,
          };
          await addItem(tripId, draft);
          toast.success('Item added');
        }
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        setError(message);
        toast.error(`Couldn't save item: ${message}`);
      } finally {
        setSaving(false);
      }
    };

    if (isEdit && item && !item.privateToUserIds?.length && isPrivate) {
      pendingSave.current = doSave;
      setPrivacyConfirmOpen(true);
      return;
    }

    await doSave();
  };

  return (
    <>
      <div>
        <SheetTitle>{isEdit ? 'Edit item' : 'Add to trip'}</SheetTitle>
        <SheetDescription>
          Pick a type, drop in what you know. Everything else can wait.
        </SheetDescription>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Type</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {itemKinds.map((k) => {
              const meta = kindMeta[k];
              const Icon = meta.icon;
              const active = k === kind;
              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => handleKindChange(k)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-[var(--radius)] border px-2 py-2.5 text-[11px] transition ${
                    active
                      ? 'border-foreground/20 bg-secondary'
                      : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  <span
                    className="text-background grid size-7 place-items-center rounded-full"
                    style={{ background: meta.accent }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {kind !== 'lodging' && (
          <div className="grid gap-1.5">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dinner at Cervejaria Ramiro"
              autoFocus
            />
          </div>
        )}

        {(kind === 'meal' || kind === 'activity') && (
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              Pick from wishlist
            </Label>
            {totalWishlistCount > 0 ? (
              <div className="border-border/60 bg-background/40 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-1">
                {wishlistByCity.map((group, idx) => {
                  const cityKey =
                    group.city.cityPlaceId ?? group.city.cityLabel;
                  return (
                    <div key={cityKey} className="flex flex-col gap-0.5">
                      {wishlistByCity.length > 1 && (
                        <div
                          className={`text-muted-foreground/70 px-2 pt-1 pb-0.5 text-[10px] tracking-[0.14em] uppercase ${
                            idx === 0 ? '' : 'border-border/30 mt-1 border-t'
                          }`}
                        >
                          {group.city.cityLabel}
                        </div>
                      )}
                      {group.places.length === 0 ? (
                        <p className="text-muted-foreground/60 px-2 py-1 text-xs">
                          No places saved yet.
                        </p>
                      ) : (
                        group.places.map((fp) => {
                          const selected = toPlace?.placeId
                            ? toPlace.placeId === fp.placeId
                            : title === fp.name;
                          return (
                            <button
                              key={fp.id}
                              type="button"
                              onClick={() => handleWishlistSelect(fp)}
                              aria-pressed={selected}
                              className={`flex flex-col rounded px-2 py-1.5 text-left transition focus:outline-none ${
                                selected
                                  ? 'bg-secondary'
                                  : 'hover:bg-white/5 focus:bg-white/5'
                              }`}
                            >
                              <span className="text-sm font-medium">
                                {fp.name}
                              </span>
                              {fp.address && (
                                <span className="text-muted-foreground text-xs">
                                  {fp.address}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="border-border/60 bg-background/40 text-muted-foreground rounded-md border px-3 py-2 text-xs">
                No places saved
                {dayCities && dayCities.length === 1
                  ? ` in ${dayCities[0].cityLabel}`
                  : ''}{' '}
                yet. Add some from the{' '}
                {kind === 'activity' ? 'Activity' : 'Food'} wishlist on the trip
                page.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="item-start-date">
              {kind === 'lodging' ? 'Check-in' : 'Starts'}
            </Label>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-2">
              <Input
                id="item-start-date"
                type="date"
                value={getDatePart(startsAt)}
                onChange={(e) => {
                  const date = e.target.value;
                  if (!date) {
                    setStartsAt('');
                    return;
                  }
                  const time = getTimePart(startsAt) || '09:00';
                  setStartsAt(`${date}T${time}`);
                }}
                className="min-w-0 appearance-none [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:min-h-[1.25em] [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-none"
              />
              <TimeField
                ariaLabel={kind === 'lodging' ? 'Check-in time' : 'Start time'}
                value={getTimePart(startsAt)}
                onCommit={(time) => {
                  if (!time) {
                    setStartsAt('');
                    return;
                  }
                  const date = getDatePart(startsAt) || todayLocalDate();
                  setStartsAt(`${date}T${time}`);
                }}
              />
            </div>
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="item-end-date">
              {kind === 'lodging' ? 'Check-out' : 'Ends'}
            </Label>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-2">
              <Input
                id="item-end-date"
                type="date"
                value={getDatePart(endsAt)}
                min={getDatePart(startsAt) || undefined}
                onChange={(e) => {
                  const date = e.target.value;
                  if (!date) {
                    setEndsAt('');
                    return;
                  }
                  const time = getTimePart(endsAt) || '10:00';
                  setEndsAt(`${date}T${time}`);
                }}
                className="min-w-0 appearance-none [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:min-h-[1.25em] [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-none"
              />
              <TimeField
                ariaLabel={kind === 'lodging' ? 'Check-out time' : 'End time'}
                value={getTimePart(endsAt)}
                onCommit={(time) => {
                  if (!time) {
                    setEndsAt('');
                    return;
                  }
                  const date =
                    getDatePart(endsAt) ||
                    getDatePart(startsAt) ||
                    todayLocalDate();
                  setEndsAt(`${date}T${time}`);
                }}
              />
            </div>
          </div>
        </div>

        {kind === 'transport' && (
          <div className="grid gap-1.5">
            <Label>Mode</Label>
            <Select
              value={transportMode}
              onValueChange={(v) => setTransportMode(v as TransportMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transportModes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {kind === 'transport' ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1.5">
                  From city
                  <span className="text-muted-foreground text-[10px]">
                    optional
                  </span>
                </Label>
                <PlaceAutocomplete
                  value={fromCityValue}
                  onChange={(v) => {
                    setFromCityValue(v);
                    setFromCityPlace(undefined);
                  }}
                  onSelect={(place) => {
                    setFromCityValue(place.label);
                    setFromCityPlace(place);
                  }}
                  placeholder="Amsterdam"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1.5">
                  To city
                  <span className="text-muted-foreground text-[10px]">
                    optional
                  </span>
                </Label>
                <PlaceAutocomplete
                  value={toCityValue}
                  onChange={(v) => {
                    setToCityValue(v);
                    setToCityPlace(undefined);
                  }}
                  onSelect={(place) => {
                    setToCityValue(place.label);
                    setToCityPlace(place);
                  }}
                  placeholder="Lisbon"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1.5">
                  Depart from
                  <span className="text-muted-foreground text-[10px]">
                    optional
                  </span>
                </Label>
                <PlaceAutocomplete
                  value={fromValue}
                  onChange={(v) => {
                    setFromValue(v);
                    setFromPlace(undefined);
                  }}
                  onSelect={(place) => {
                    setFromValue(place.label);
                    setFromPlace(place);
                  }}
                  placeholder="AMS Schiphol"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1.5">
                  Arrive at
                  <span className="text-muted-foreground text-[10px]">
                    optional
                  </span>
                </Label>
                <PlaceAutocomplete
                  value={toValue}
                  onChange={(v) => {
                    setToValue(v);
                    setToPlace(undefined);
                  }}
                  onSelect={(place) => {
                    setToValue(place.label);
                    setToPlace(place);
                  }}
                  placeholder="Humberto Delgado"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Cities set where you are on the trip. Stations or airports are
              optional and only used to route the map view.
            </p>
          </div>
        ) : (
          <div
            className={
              kind === 'meal' || kind === 'lodging'
                ? 'grid gap-3'
                : 'grid grid-cols-2 gap-3'
            }
          >
            {kind !== 'meal' && kind !== 'lodging' && (
              <div className="grid gap-1.5">
                <Label>From</Label>
                <PlaceAutocomplete
                  value={fromValue}
                  onChange={(v) => {
                    setFromValue(v);
                    setFromPlace(undefined);
                  }}
                  onSelect={(place) => {
                    setFromValue(place.label);
                    setFromPlace(place);
                  }}
                  placeholder="(optional)"
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>{kind === 'lodging' ? 'Where' : 'Place'}</Label>
              <PlaceAutocomplete
                value={toValue}
                onChange={(v) => {
                  setToValue(v);
                  setToPlace(undefined);
                }}
                onSelect={(place) => {
                  setToValue(place.label);
                  setToPlace(place);
                }}
                placeholder={
                  kind === 'lodging' ? 'Casa do Príncipe' : 'Cervejaria Ramiro'
                }
              />
            </div>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="item-notes">Notes</Label>
          <Textarea
            id="item-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Flight KL 1693 · Seat 14A · Gate D4"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="grid gap-0.5">
            <Label>Visibility</Label>
            {isPrivate && accountMembers.length <= 1 && (
              <p className="text-muted-foreground text-xs">
                No other members with accounts to share with.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handlePrivacyToggle}
            aria-pressed={isPrivate}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition',
              isPrivate
                ? 'border-foreground/20 bg-secondary text-foreground'
                : 'border-border/60 text-muted-foreground hover:text-foreground',
            )}
          >
            {isPrivate ? (
              <Lock className="size-3.5" />
            ) : (
              <LockOpen className="size-3.5" />
            )}
            {isPrivate ? 'Private' : 'Shared with all'}
          </button>
        </div>

        {isPrivate && accountMembers.length > 1 && (
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              Who can see this
            </Label>
            <div className="border-border/60 bg-background/40 grid gap-1 rounded-md border p-2">
              {accountMembers.map((member) => {
                const isCurrentUser = member.userId === user?.id;
                const isSelected =
                  isCurrentUser || privateUserIds.includes(member.userId!);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => togglePrivateMember(member.userId!)}
                    disabled={isCurrentUser}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition',
                      isSelected ? 'opacity-100' : 'opacity-50',
                      isCurrentUser
                        ? 'cursor-default'
                        : 'hover:bg-secondary/60',
                    )}
                  >
                    <span
                      className={cn(
                        'border-border grid size-4 shrink-0 place-items-center rounded border',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : '',
                      )}
                    >
                      {isSelected && (
                        <svg
                          viewBox="0 0 16 16"
                          className="size-2.5"
                          fill="currentColor"
                        >
                          <path d="M6.2 10.6 3.4 7.8l-.9.9 3.7 3.7 8-8-.9-.9z" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate">
                      {member.displayName}
                    </span>
                    {isCurrentUser && (
                      <span className="text-muted-foreground/60 text-[10px]">
                        you
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>

      <SheetFooter>
        <SheetClose asChild>
          <Button variant="ghost">Cancel</Button>
        </SheetClose>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
        </Button>
      </SheetFooter>

      <ConfirmDialog
        open={privacyConfirmOpen}
        onOpenChange={setPrivacyConfirmOpen}
        title="Make item private?"
        description="This item will be hidden from members not in your private list. Linked expenses stay shared with everyone."
        confirmLabel="Make private"
        onConfirm={() => {
          setPrivacyConfirmOpen(false);
          if (pendingSave.current) void pendingSave.current();
        }}
      />
    </>
  );
}
