import type { DayFillLevel } from '@/lib/trips/dayFill';

const dotClass: Record<Exclude<DayFillLevel, 'empty'>, string> = {
  light: 'bg-emerald-500',
  moderate: 'bg-amber-400',
  full: 'bg-rose-500',
};

interface DayFillDotProps {
  level: DayFillLevel;
}

export function DayFillDot({ level }: DayFillDotProps) {
  if (level === 'empty') return null;
  return (
    <span
      aria-hidden
      className={`ml-1.5 inline-block size-1.5 shrink-0 rounded-full ${dotClass[level]}`}
    />
  );
}
