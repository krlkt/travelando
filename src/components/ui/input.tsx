import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'border-input bg-background/60 placeholder:text-muted-foreground/70 focus-visible:ring-ring/60 focus-visible:border-ring flex h-11 w-full rounded-[var(--radius)] border px-4 py-2 text-base transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
