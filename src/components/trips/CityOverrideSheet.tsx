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
import { PlaceAutocomplete } from '@/components/places/PlaceAutocomplete';
import { Label } from '@/components/ui/label';
import { useTrips } from '@/lib/trips/context';
import type { CityOverride, Place } from '@/lib/trips/types';

interface CityOverrideSheetProps {
  tripId: string;
  dayKey: string;
  dayLabel: string;
  currentCity: string;
  existing?: CityOverride | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CityOverrideSheet({
  tripId,
  dayKey,
  dayLabel,
  currentCity,
  existing,
  open,
  onOpenChange,
}: CityOverrideSheetProps) {
  const { upsertCityOverride, removeCityOverride } = useTrips();

  const [cityValue, setCityValue] = useState('');
  const [cityPlace, setCityPlace] = useState<Place | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCityValue(existing?.cityLabel ?? currentCity);
    setCityPlace(
      existing
        ? { label: existing.cityLabel, placeId: existing.cityPlaceId }
        : undefined,
    );
  }, [open, existing, currentCity]);

  const handleSave = async () => {
    if (!cityValue.trim()) return;
    setSaving(true);
    try {
      await upsertCityOverride({
        tripId,
        dayKey,
        cityLabel: cityValue.trim(),
        cityPlaceId: cityPlace?.placeId,
      });
      toast.success('City updated');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast.error(`Couldn't update city: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await removeCityOverride(tripId, existing.id);
      toast.success('City reset to auto-detected');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      toast.error(`Couldn't reset city: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[380px]">
        <div>
          <SheetTitle>Set city for {dayLabel}</SheetTitle>
          <SheetDescription>
            Override the auto-detected city for this day.
          </SheetDescription>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>City</Label>
            <PlaceAutocomplete
              value={cityValue}
              onChange={(v) => {
                setCityValue(v);
                setCityPlace(undefined);
              }}
              onSelect={(place) => {
                setCityValue(place.label);
                setCityPlace(place);
              }}
              placeholder="Lisbon, Portugal"
            />
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-row">
          {existing && (
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={saving}
              className="text-muted-foreground"
            >
              Reset to auto
            </Button>
          )}
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={saving || !cityValue.trim()}>
            {saving ? 'Saving…' : 'Set city'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
