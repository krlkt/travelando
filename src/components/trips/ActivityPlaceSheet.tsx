'use client';

import { useState } from 'react';
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
import { WantLevel } from './WantLevel';
import { useTrips } from '@/lib/trips/context';
import type {
  ActivityPlace,
  ActivityPlaceCategory,
  ActivityPlaceDraft,
  Place,
} from '@/lib/trips/types';

const CATEGORIES: { value: ActivityPlaceCategory; label: string }[] = [
  { value: 'sightseeing', label: 'Sightseeing' },
  { value: 'museum', label: 'Museum' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'tour', label: 'Tour' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'other', label: 'Other' },
];

interface ActivityPlaceSheetProps {
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  item?: ActivityPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityPlaceSheet({
  tripId,
  cityLabel,
  cityPlaceId,
  item,
  open,
  onOpenChange,
}: ActivityPlaceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[420px]">
        {open && (
          <ActivityPlaceBody
            tripId={tripId}
            cityLabel={cityLabel}
            cityPlaceId={cityPlaceId}
            item={item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ActivityPlaceBodyProps {
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  item?: ActivityPlace | null;
  onClose: () => void;
}

function ActivityPlaceBody({
  tripId,
  cityLabel,
  cityPlaceId,
  item,
  onClose,
}: ActivityPlaceBodyProps) {
  const { addActivityPlace, updateActivityPlace } = useTrips();
  const isEdit = !!item;

  const [name, setName] = useState<string>(item?.name ?? '');
  const [addressValue, setAddressValue] = useState<string>(item?.address ?? '');
  const [addressPlace, setAddressPlace] = useState<Place | undefined>(
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
  const [category, setCategory] = useState<ActivityPlaceCategory>(
    item?.category ?? 'sightseeing',
  );
  const [wantLevel, setWantLevel] = useState<number | undefined>(
    item?.wantLevel,
  );
  const [notes, setNotes] = useState<string>(item?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Add a name.');
      return;
    }

    const draft: ActivityPlaceDraft = {
      tripId,
      cityLabel,
      cityPlaceId,
      name: name.trim(),
      address: addressValue.trim() || undefined,
      lat: addressPlace?.lat,
      lng: addressPlace?.lng,
      placeId: addressPlace?.placeId,
      category,
      wantLevel,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && item) {
        await updateActivityPlace(item.id, draft);
        toast.success('Activity updated');
      } else {
        await addActivityPlace(draft);
        toast.success('Activity added to wishlist');
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(`Couldn't save activity: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div>
        <SheetTitle>{isEdit ? 'Edit activity' : 'Add to wishlist'}</SheetTitle>
        <SheetDescription>{cityLabel} · Things you want to do</SheetDescription>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="ap-name">Name</Label>
          <Input
            id="ap-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Castelo de São Jorge"
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
            onValueChange={(v) => setCategory(v as ActivityPlaceCategory)}
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
          <Label>How much you want this</Label>
          <WantLevel variant="star" value={wantLevel} onChange={setWantLevel} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ap-notes">Notes</Label>
          <Textarea
            id="ap-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Book tickets ahead · Go at sunset"
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
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add activity'}
        </Button>
      </SheetFooter>
    </>
  );
}
