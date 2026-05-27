'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useTrips } from '@/lib/trips/context';
import { itemKinds, transportModes, kindMeta } from '@/lib/trips/kindMeta';
import { latestCityBefore } from '@/lib/trips/cities';
import type {
  FoodPlace,
  ItemDraft,
  ItemKind,
  ItemPatch,
  Place,
  TransportMode,
  Trip,
  TripItem,
} from '@/lib/trips/types';

interface ItemEditorSheetProps {
  trip: Trip;
  item?: TripItem | null;
  defaultDate?: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function ItemEditorSheet({
  trip,
  item,
  defaultDate,
  open,
  onOpenChange,
}: ItemEditorSheetProps) {
  const { addItem, updateItem, foodPlaces, cityOverrides } = useTrips();
  const tripId = trip.id;
  const isEdit = !!item;

  const [kind, setKind] = useState<ItemKind>('activity');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [fromValue, setFromValue] = useState('');
  const [fromPlace, setFromPlace] = useState<Place | undefined>();
  const [toValue, setToValue] = useState('');
  const [toPlace, setToPlace] = useState<Place | undefined>();
  const [transportMode, setTransportMode] = useState<TransportMode>('flight');
  const [notes, setNotes] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState('EUR');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(item?.kind ?? 'activity');
    setTitle(item?.title ?? '');
    if (item) {
      setStartsAt(toLocalInput(item.startsAt));
      setEndsAt(toLocalInput(item.endsAt));
    } else if (defaultDate) {
      const start = new Date(defaultDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(defaultDate);
      end.setHours(10, 0, 0, 0);
      setStartsAt(toLocalInput(start.toISOString()));
      setEndsAt(toLocalInput(end.toISOString()));
    } else {
      setStartsAt('');
      setEndsAt('');
    }
    setFromValue(item?.from?.label ?? '');
    setFromPlace(item?.from ?? undefined);
    setToValue(item?.to?.label ?? '');
    setToPlace(item?.to ?? undefined);
    setTransportMode((item?.transportMode as TransportMode) ?? 'flight');
    setNotes(item?.notes ?? '');
    setExpenseAmount(item?.expense ? String(item.expense.amount) : '');
    setExpenseCurrency(item?.expense?.currency ?? 'EUR');
    setError(null);
  }, [open, item, defaultDate]);

  function handleKindChange(newKind: ItemKind) {
    setKind(newKind);
    if (newKind === 'transport' && !isEdit) {
      const isoTs = startsAt
        ? fromLocalInput(startsAt)
        : new Date().toISOString();
      const city = latestCityBefore(trip, cityOverrides[tripId] ?? [], isoTs);
      setFromValue(city.cityLabel);
      setFromPlace({ label: city.cityLabel, placeId: city.cityPlaceId });
    }
  }

  const currentCity = useMemo(() => {
    if (!startsAt) return null;
    return latestCityBefore(
      trip,
      cityOverrides[tripId] ?? [],
      fromLocalInput(startsAt),
    );
  }, [startsAt, cityOverrides, tripId, trip]);

  const wishlistPlaces = useMemo((): FoodPlace[] => {
    const all = foodPlaces[tripId] ?? [];
    if (!currentCity) return all;
    return all.filter((fp) =>
      fp.cityPlaceId && currentCity.cityPlaceId
        ? fp.cityPlaceId === currentCity.cityPlaceId
        : fp.cityLabel === currentCity.cityLabel,
    );
  }, [foodPlaces, tripId, currentCity]);

  function handleWishlistSelect(fp: FoodPlace) {
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

  const handleSave = async () => {
    if (!title.trim()) {
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

    const resolvedFrom: Place | undefined =
      fromPlace ?? (fromValue.trim() ? { label: fromValue.trim() } : undefined);
    const resolvedTo: Place | undefined =
      toPlace ?? (toValue.trim() ? { label: toValue.trim() } : undefined);
    const resolvedExpense =
      expenseAmount && !Number.isNaN(Number(expenseAmount))
        ? {
            amount: Number(expenseAmount),
            currency: expenseCurrency.toUpperCase(),
          }
        : undefined;

    setSaving(true);
    try {
      if (isEdit && item) {
        const patch: ItemPatch = {
          kind,
          title: title.trim(),
          startsAt: fromLocalInput(startsAt),
          endsAt: endsAt ? fromLocalInput(endsAt) : null,
          from: resolvedFrom ?? null,
          to: resolvedTo ?? null,
          transportMode: kind === 'transport' ? transportMode : null,
          notes: notes.trim() || null,
          expense: resolvedExpense ?? null,
        };
        await updateItem(tripId, item.id, patch);
        toast.success('Item updated');
      } else {
        const draft: ItemDraft = {
          kind,
          title: title.trim(),
          startsAt: fromLocalInput(startsAt),
          endsAt: endsAt ? fromLocalInput(endsAt) : undefined,
          from: resolvedFrom,
          to: resolvedTo,
          transportMode: kind === 'transport' ? transportMode : undefined,
          notes: notes.trim() || undefined,
          expense: resolvedExpense,
        };
        await addItem(tripId, draft);
        toast.success('Item added');
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(`Couldn't save item: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[480px]">
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

          {kind === 'meal' && wishlistPlaces.length > 0 && (
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">
                {currentCity
                  ? `Wishlist · ${currentCity.cityLabel}`
                  : 'Wishlist'}
              </Label>
              <div className="border-border/60 bg-background/40 flex max-h-36 flex-col gap-0.5 overflow-y-auto rounded-md border p-1">
                {wishlistPlaces.map((fp) => (
                  <button
                    key={fp.id}
                    type="button"
                    onClick={() => handleWishlistSelect(fp)}
                    className="flex flex-col rounded px-2 py-1.5 text-left hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                  >
                    <span className="text-sm font-medium">{fp.name}</span>
                    {fp.address && (
                      <span className="text-muted-foreground text-xs">
                        {fp.address}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="item-start">Starts</Label>
              <Input
                id="item-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="min-w-0"
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="item-end">Ends</Label>
              <Input
                id="item-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={startsAt}
                className="min-w-0"
              />
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

          <div className="grid grid-cols-2 gap-3">
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
                placeholder={
                  kind === 'transport' ? 'AMS Schiphol' : '(optional)'
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{kind === 'transport' ? 'To' : 'Place'}</Label>
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
                  kind === 'transport' ? 'LIS Lisbon' : 'Cervejaria Ramiro'
                }
              />
            </div>
          </div>

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

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-amount">Expense</Label>
              <Input
                id="item-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-currency">Currency</Label>
              <Input
                id="item-currency"
                value={expenseCurrency}
                onChange={(e) =>
                  setExpenseCurrency(e.target.value.toUpperCase().slice(0, 3))
                }
                placeholder="EUR"
              />
            </div>
          </div>

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
      </SheetContent>
    </Sheet>
  );
}
