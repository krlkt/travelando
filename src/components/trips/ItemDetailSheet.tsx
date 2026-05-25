'use client';

import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDateLong, formatTime } from '@/lib/time/formatDate';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { formatMoney } from '@/lib/trips/grouping';
import { useTrips } from '@/lib/trips/context';
import type { TripItem } from '@/lib/trips/types';

interface ItemDetailSheetProps {
  item: TripItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ItemDetailSheet({
  item,
  open,
  onOpenChange,
  onEdit,
}: ItemDetailSheetProps) {
  const { removeItem } = useTrips();
  if (!item) return null;

  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <div className="flex items-start gap-3">
          <span
            className="text-background grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: meta.accent }}
          >
            <Icon className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <Badge variant={meta.badge}>{meta.label}</Badge>
            <SheetTitle className="mt-2">{item.title}</SheetTitle>
            <SheetDescription>{formatDateLong(item.startsAt)}</SheetDescription>
          </div>
        </div>

        <Separator />

        <dl className="grid gap-4">
          <Row icon={Clock} label="Time">
            {formatTime(item.startsAt)}
            {item.endsAt && <> → {formatTime(item.endsAt)}</>}
          </Row>

          {(item.from || item.to) && (
            <Row icon={MapPin} label="Place">
              <div className="flex flex-wrap items-center gap-2">
                {item.from && (
                  <span>
                    {item.from.label}
                    {item.from.address && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {item.from.address}
                      </span>
                    )}
                  </span>
                )}
                {item.from && item.to && (
                  <ArrowRight className="text-muted-foreground size-3.5" />
                )}
                {item.to && (
                  <span>
                    {item.to.label}
                    {item.to.address && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {item.to.address}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </Row>
          )}

          {item.expense && (
            <Row icon={Wallet} label="Expense">
              <span className="tabular-nums">
                {formatMoney(item.expense.amount, item.expense.currency)}
              </span>
            </Row>
          )}

          {item.notes && (
            <Row icon={Calendar} label="Notes">
              <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                {item.notes}
              </p>
            </Row>
          )}
        </dl>

        <Separator />

        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              removeItem(item.tripId, item.id);
              onOpenChange(false);
            }}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.25rem_1fr] gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4" />
      <div>
        <dt className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          {label}
        </dt>
        <dd className="mt-1 text-sm leading-relaxed">{children}</dd>
      </div>
    </div>
  );
}
