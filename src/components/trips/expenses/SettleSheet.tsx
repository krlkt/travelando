'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
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
import { useTrips } from '@/lib/trips/context';
import { formatAmountInput, parseAmountInput } from '@/lib/trips/grouping';
import type { Trip, TripMember } from '@/lib/trips/types';

interface SettleSheetProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMemberId: string;
  otherMember: TripMember | null;
  currency: string;
  /** Positive = current user is owed; negative = current user owes. */
  signedNet: number;
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function SettleSheet({
  trip,
  open,
  onOpenChange,
  currentMemberId,
  otherMember,
  currency,
  signedNet,
}: SettleSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[420px]">
        {open && otherMember && (
          <SettleBody
            key={`${otherMember.id}-${currency}`}
            trip={trip}
            onClose={() => onOpenChange(false)}
            currentMemberId={currentMemberId}
            otherMember={otherMember}
            currency={currency}
            signedNet={signedNet}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SettleBodyProps {
  trip: Trip;
  onClose: () => void;
  currentMemberId: string;
  otherMember: TripMember;
  currency: string;
  signedNet: number;
}

function SettleBody({
  trip,
  onClose,
  currentMemberId,
  otherMember,
  currency,
  signedNet,
}: SettleBodyProps) {
  const { addSettlement } = useTrips();
  const me = useMemo(
    () => trip.members.find((m) => m.id === currentMemberId) ?? null,
    [trip.members, currentMemberId],
  );

  // Direction defaults from the sign of the net:
  //  signedNet < 0 → I owe them → I paid them (fromMe = true)
  //  signedNet > 0 → They owe me → They paid me (fromMe = false)
  const initialFromMe = signedNet <= 0;
  const [fromMe, setFromMe] = useState(initialFromMe);
  const [amountInput, setAmountInput] = useState(
    formatAmountInput(Math.abs(signedNet)),
  );
  const [settledOn, setSettledOn] = useState(todayLocalDate());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amount = parseAmountInput(amountInput);
  const canSubmit = !!me && amount !== null && amount > 0 && !submitting;

  const fromMember = fromMe ? me : otherMember;
  const toMember = fromMe ? otherMember : me;

  async function handleSubmit() {
    if (!canSubmit || !me || amount === null) return;
    setSubmitting(true);
    try {
      await addSettlement({
        tripId: trip.id,
        fromMemberId: fromMe ? me.id : otherMember.id,
        toMemberId: fromMe ? otherMember.id : me.id,
        amount,
        currency,
        settledOn,
        note: note.trim() || undefined,
      });
      toast.success('Settlement recorded');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to settle');
    } finally {
      setSubmitting(false);
    }
  }

  if (!me) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Sign in as a trip member to record a settlement.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 border-b px-6 py-5">
        <SheetTitle className="text-lg">Settle up</SheetTitle>
        <SheetDescription className="text-muted-foreground mt-1 text-xs">
          Record a real-world money transfer to close out the balance.
        </SheetDescription>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5">
          <section className="border-border/70 bg-card overflow-hidden rounded-[var(--radius-lg)] border">
            <button
              type="button"
              onClick={() => setFromMe(!fromMe)}
              className="hover:bg-secondary/40 flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {fromMember?.displayName ?? '—'}
                </span>
                <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 truncate text-sm font-medium">
                  {toMember?.displayName ?? '—'}
                </span>
              </div>
              <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
                Switch
              </span>
            </button>
          </section>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settle-amount">Amount</Label>
              <Input
                id="settle-amount"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <div className="border-input bg-card flex h-9 items-center rounded-md border px-3 text-sm font-medium tabular-nums">
                {currency}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settle-date">Date</Label>
            <Input
              id="settle-date"
              type="date"
              value={settledOn}
              onChange={(e) => setSettledOn(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settle-note">Note (optional)</Label>
            <Input
              id="settle-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. cash, bank transfer"
              maxLength={280}
            />
          </div>
        </div>
      </div>

      <SheetFooter className="border-border/60 border-t px-6 py-4">
        <SheetClose asChild>
          <Button variant="ghost" type="button">
            Cancel
          </Button>
        </SheetClose>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving…' : 'Record settlement'}
        </Button>
      </SheetFooter>
    </div>
  );
}
