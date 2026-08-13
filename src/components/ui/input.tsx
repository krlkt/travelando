import * as React from 'react';
import { cn } from '@/lib/utils';

const DATE_TIME_TYPES = new Set([
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
]);

// Lucide "calendar" glyph as an inline data URI so date/time inputs show a
// consistent icon across browsers (iOS Safari/Chrome hide the native one).
const CALENDAR_ICON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='4' rx='2'/%3E%3Cpath d='M8 2v4M16 2v4M3 10h18'/%3E%3C/svg%3E\")";

// iOS applies native -webkit-appearance to date/time inputs, which ignores our
// height and adds its own intrinsic padding (making the field taller than
// sibling inputs) and hides the calendar icon. Reset appearance so `h-11` is
// honored, neutralize the value pseudo-element's margins, and render our own
// icon with the native picker indicator kept as a transparent tap target.
const dateTimeClasses = cn(
  'relative appearance-none bg-no-repeat pr-11',
  '[background-position:right_0.85rem_center] [background-size:1.15rem]',
  '[&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-date-and-time-value]:leading-[1.5em]',
  '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-y-0 [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
);

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, style, ...props }, ref) => {
  const isDateTime = type ? DATE_TIME_TYPES.has(type) : false;

  return (
    <input
      ref={ref}
      type={type}
      style={isDateTime ? { backgroundImage: CALENDAR_ICON, ...style } : style}
      className={cn(
        'border-input bg-background/60 placeholder:text-muted-foreground/70 focus-visible:ring-ring/60 focus-visible:border-ring flex h-11 w-full rounded-[var(--radius)] border px-4 py-2 text-base transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        isDateTime && dateTimeClasses,
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
