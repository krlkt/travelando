import { Check } from 'lucide-react';

/**
 * Tab indicator shown when a day is marked "planned enough". Replaces the
 * red/amber/green fill dot ({@link DayFillDot}) with a clear "done" check.
 */
export function DayFinishedMark() {
  return (
    <span
      aria-hidden
      className="ml-1.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
    >
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  );
}
