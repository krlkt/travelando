import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground border-border/60',
        primary: 'bg-primary/12 text-primary border-primary/20',
        accent: 'bg-accent/15 text-foreground border-accent/30',
        outline: 'border-border text-foreground/80',
        muted: 'bg-muted text-muted-foreground border-border/50',
        transport:
          'bg-[oklch(72%_0.12_220_/_0.14)] text-[oklch(38%_0.10_220)] border-[oklch(72%_0.12_220_/_0.3)]',
        activity:
          'bg-[oklch(64%_0.16_38_/_0.14)] text-[oklch(38%_0.13_38)] border-[oklch(64%_0.16_38_/_0.3)]',
        lodging:
          'bg-[oklch(60%_0.13_295_/_0.14)] text-[oklch(36%_0.10_295)] border-[oklch(60%_0.13_295_/_0.3)]',
        meal: 'bg-[oklch(70%_0.15_75_/_0.16)] text-[oklch(38%_0.12_75)] border-[oklch(70%_0.15_75_/_0.3)]',
        note: 'bg-muted text-muted-foreground border-border/50',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
