'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { useTrips } from '@/lib/trips/context';
import {
  defaultCategoryForKind,
  defaultExpenseTitleForItem,
  categoryLabels,
} from '@/lib/trips/expenseCategory';
import { formatMoney } from '@/lib/trips/grouping';
import type { Expense, Trip, TripItem } from '@/lib/trips/types';
import { PlaceAddressLink } from '@/components/places/PlaceAddressLink';
import { ExpenseSheet } from './expenses/ExpenseSheet';

interface ItemDetailSheetProps {
  trip: Trip;
  item: TripItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ItemDetailSheet({
  trip,
  item,
  open,
  onOpenChange,
  onEdit,
}: ItemDetailSheetProps) {
  const { removeItem, expenses } = useTrips();
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const itemExpenses = useMemo(() => {
    if (!item) return [];
    return (expenses[item.tripId] ?? []).filter((e) => e.itemId === item.id);
  }, [expenses, item]);

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
            <SheetTitle className="mt-2 [overflow-wrap:anywhere]">
              {item.title}
            </SheetTitle>
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
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
                {item.from && (
                  <PlaceAddressLink place={item.from}>
                    {item.from.label}
                    {item.from.address && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {item.from.address}
                      </span>
                    )}
                  </PlaceAddressLink>
                )}
                {item.from && item.to && (
                  <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                )}
                {item.to && (
                  <PlaceAddressLink place={item.to}>
                    {item.to.label}
                    {item.to.address && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {item.to.address}
                      </span>
                    )}
                  </PlaceAddressLink>
                )}
              </div>
            </Row>
          )}

          {item.notes && (
            <Row icon={Calendar} label="Notes">
              <p className="text-foreground/90 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                {item.notes}
              </p>
            </Row>
          )}

          {item.kind !== 'note' && (
            <Row icon={Wallet} label="Expenses">
              <div className="flex flex-col gap-2">
                {itemExpenses.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No expense yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {itemExpenses.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpense(e);
                            setExpenseSheetOpen(true);
                          }}
                          className="hover:bg-secondary/40 flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {e.title}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {categoryLabels[e.category]}
                            </span>
                          </span>
                          <span className="text-sm tabular-nums">
                            {formatMoney(e.amount, e.currency)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseSheetOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Add expense
                </Button>
              </div>
            </Row>
          )}
        </dl>

        <Separator />

        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const tripId = item.tripId;
              const itemId = item.id;
              onOpenChange(false);
              void (async () => {
                try {
                  await removeItem(tripId, itemId);
                  toast.success('Item deleted');
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : 'Delete failed';
                  toast.error(`Couldn't delete item: ${message}`);
                }
              })();
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

      <ExpenseSheet
        trip={trip}
        expense={editingExpense}
        open={expenseSheetOpen}
        onOpenChange={(o) => {
          setExpenseSheetOpen(o);
          if (!o) setEditingExpense(null);
        }}
        itemId={item.id}
        defaultCategory={defaultCategoryForKind(item.kind)}
        defaultTitle={defaultExpenseTitleForItem(item.kind, item.title)}
        lockTitle={!editingExpense}
      />
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
    <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2 sm:grid-cols-[1.25rem_minmax(0,1fr)] sm:gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4" />
      <div className="min-w-0">
        <dt className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          {label}
        </dt>
        <dd className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere]">
          {children}
        </dd>
      </div>
    </div>
  );
}
