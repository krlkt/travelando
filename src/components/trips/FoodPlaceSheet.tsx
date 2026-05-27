'use client';

import { useEffect, useState } from 'react';
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
import type {
  FoodPlace,
  FoodPlaceCategory,
  FoodPlaceDraft,
  Place,
} from '@/lib/trips/types';

const CATEGORIES: { value: FoodPlaceCategory; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'food', label: 'Street food' },
  { value: 'drink', label: 'Drinks' },
  { value: 'other', label: 'Other' },
];

interface FoodPlaceSheetProps {
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  item?: FoodPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FoodPlaceSheet({
  tripId,
  cityLabel,
  cityPlaceId,
  item,
  open,
  onOpenChange,
}: FoodPlaceSheetProps) {
  const { addFoodPlace, updateFoodPlace } = useTrips();
  const isEdit = !!item;

  const [name, setName] = useState('');
  const [addressValue, setAddressValue] = useState('');
  const [addressPlace, setAddressPlace] = useState<Place | undefined>();
  const [category, setCategory] = useState<FoodPlaceCategory>('restaurant');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? '');
    setAddressValue(item?.address ?? '');
    setAddressPlace(
      item?.address
        ? {
            label: item.name,
            address: item.address,
            lat: item.lat,
            lng: item.lng,
            placeId: item.placeId,
          }
        : undefined,
    );
    setCategory(item?.category ?? 'restaurant');
    setNotes(item?.notes ?? '');
    setError(null);
  }, [open, item]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Add a name.');
      return;
    }

    const draft: FoodPlaceDraft = {
      tripId,
      cityLabel,
      cityPlaceId,
      name: name.trim(),
      address: addressValue.trim() || undefined,
      lat: addressPlace?.lat,
      lng: addressPlace?.lng,
      placeId: addressPlace?.placeId,
      category,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && item) {
        await updateFoodPlace(item.id, draft);
        toast.success('Place updated');
      } else {
        await addFoodPlace(draft);
        toast.success('Place added to wishlist');
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(`Couldn't save place: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[420px]">
        <div>
          <SheetTitle>{isEdit ? 'Edit place' : 'Add to wishlist'}</SheetTitle>
          <SheetDescription>
            {cityLabel} · Places you want to try
          </SheetDescription>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="fp-name">Name</Label>
            <Input
              id="fp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cervejaria Ramiro"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Address</Label>
            <PlaceAutocomplete
              value={addressValue}
              onChange={(v) => {
                setAddressValue(v);
                setAddressPlace(undefined);
              }}
              onSelect={(place) => {
                setAddressValue(place.address ?? place.label);
                if (!name.trim()) setName(place.label);
                setAddressPlace(place);
              }}
              placeholder="Search or type address"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FoodPlaceCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fp-notes">Notes</Label>
            <Textarea
              id="fp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reservation needed · Best bacalhau in town"
              rows={3}
            />
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add place'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
