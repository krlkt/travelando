'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/trips/grouping';
import { fadeUp } from '@/lib/motion/presets';
import type { Settlement, TripMember } from '@/lib/trips/types';

interface SettlementsLogProps {
  settlements: Settlement[];
  members: TripMember[];
  onEdit: (settlement: Settlement) => void;
  onRemove: (id: string) => Promise<void>;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SettlementsLog({
  settlements,
  members,
  onEdit,
  onRemove,
}: SettlementsLogProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  if (settlements.length === 0) return null;

  const memberById = new Map(members.map((m) => [m.id, m]));
  const sorted = [...settlements].sort((a, b) =>
    b.settledOn.localeCompare(a.settledOn),
  );

  async function handleDelete(id: string) {
    setPendingId(id);
    try {
      await onRemove(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <motion.section variants={fadeUp}>
      <h3 className="text-muted-foreground mb-2 px-1 text-[10px] tracking-[0.18em] uppercase">
        Settlements
      </h3>
      <div className="border-border/70 bg-card overflow-hidden rounded-[var(--radius-lg)] border">
        {sorted.map((s, idx) => {
          const from = memberById.get(s.fromMemberId);
          const to = memberById.get(s.toMemberId);
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx > 0 ? 'border-border/40 border-t' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 leading-tight">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {from?.displayName ?? 'Unknown'}
                  </span>
                  <ArrowRight className="text-muted-foreground size-3 shrink-0" />
                  <span className="min-w-0 truncate text-sm font-medium">
                    {to?.displayName ?? 'Unknown'}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                  <span>{formatDate(s.settledOn)}</span>
                  {s.note && (
                    <>
                      <span>·</span>
                      <span className="truncate">{s.note}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right text-sm font-medium tabular-nums">
                {formatMoney(s.amount, s.currency)}
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-7"
                  disabled={pendingId === s.id}
                  onClick={() => onEdit(s)}
                  aria-label="Edit settlement"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-7"
                  disabled={pendingId === s.id}
                  onClick={() => handleDelete(s.id)}
                  aria-label="Delete settlement"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
