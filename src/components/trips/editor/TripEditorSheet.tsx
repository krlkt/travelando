'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Separator } from '@/components/ui/separator';
import { useTrips } from '@/lib/trips/context';
import type { Trip } from '@/lib/trips/types';

interface TripEditorSheetProps {
  trip?: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultGradients = [
  'linear-gradient(135deg, oklch(72% 0.13 38) 0%, oklch(58% 0.16 38) 60%, oklch(40% 0.10 295) 100%)',
  'linear-gradient(135deg, oklch(68% 0.15 220) 0%, oklch(48% 0.12 250) 50%, oklch(30% 0.08 295) 100%)',
  'linear-gradient(135deg, oklch(72% 0.08 220) 0%, oklch(48% 0.06 250) 100%)',
  'linear-gradient(135deg, oklch(74% 0.14 75) 0%, oklch(56% 0.16 38) 100%)',
  'linear-gradient(135deg, oklch(66% 0.13 145) 0%, oklch(44% 0.10 220) 100%)',
];

function toLocalInputDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromLocalInputDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

export function TripEditorSheet({
  trip,
  open,
  onOpenChange,
}: TripEditorSheetProps) {
  const router = useRouter();
  const { createTrip, updateTrip } = useTrips();
  const isEdit = !!trip;

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState('');
  const [gradient, setGradient] = useState(defaultGradients[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(trip?.title ?? '');
    setDestination(trip?.destination ?? '');
    setStartDate(trip ? toLocalInputDate(trip.startDate) : '');
    setEndDate(trip ? toLocalInputDate(trip.endDate) : '');
    setTravelers(trip?.travelers.join(', ') ?? '');
    setGradient(
      trip?.coverGradient ??
        defaultGradients[Math.floor(Math.random() * defaultGradients.length)],
    );
    setError(null);
  }, [open, trip]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('Give your trip a name first.');
      return;
    }
    if (!destination.trim()) {
      setError('Where are you headed?');
      return;
    }
    if (!startDate || !endDate) {
      setError('Pick a start and end date.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date can't be before the start.");
      return;
    }

    const draft = {
      title: title.trim(),
      destination: destination.trim(),
      startDate: fromLocalInputDate(startDate),
      endDate: fromLocalInputDate(endDate),
      travelers: travelers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      coverGradient: gradient,
    };

    if (isEdit && trip) {
      updateTrip(trip.id, draft);
      toast.success('Trip updated');
      onOpenChange(false);
    } else {
      const created = createTrip(draft);
      toast.success('Trip created');
      onOpenChange(false);
      router.push(`/trips/${created.id}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[480px]">
        <div>
          <SheetTitle>{isEdit ? 'Edit trip' : 'New trip'}</SheetTitle>
          <SheetDescription>
            Give it bones now, fill in the days later.
          </SheetDescription>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="trip-title">Title</Label>
            <Input
              id="trip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lisbon Long Weekend"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="trip-dest">Destination</Label>
            <Input
              id="trip-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Lisbon, Portugal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="trip-start">Start</Label>
              <Input
                id="trip-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="trip-end">End</Label>
              <Input
                id="trip-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="trip-travelers">Travelers</Label>
            <Input
              id="trip-travelers"
              value={travelers}
              onChange={(e) => setTravelers(e.target.value)}
              placeholder="Karel, Marta"
            />
            <p className="text-muted-foreground text-xs">
              Comma-separated. Optional.
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Cover</Label>
            <div className="grid grid-cols-5 gap-2">
              {defaultGradients.map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGradient(g)}
                  aria-label="Choose cover"
                  aria-pressed={g === gradient}
                  className={`aspect-square rounded-[var(--radius)] transition-transform ${g === gradient ? 'ring-foreground/80 ring-offset-card ring-2 ring-offset-2' : 'hover:scale-[0.97]'}`}
                  style={{ background: g }}
                />
              ))}
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
          <Button onClick={handleSave}>
            {isEdit ? 'Save changes' : 'Create trip'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
