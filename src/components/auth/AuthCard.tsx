import Link from 'next/link';
import type { ReactNode } from 'react';
import { Plane } from 'lucide-react';

interface AuthCardProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="relative isolate w-full max-w-md">
      <div
        aria-hidden
        className="absolute -top-24 -left-16 -z-10 size-72 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, oklch(72% 0.13 38 / 0.45), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="absolute -right-20 -bottom-24 -z-10 size-72 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, oklch(58% 0.16 295 / 0.4), transparent 70%)',
        }}
      />

      <Link
        href="/"
        className="group mb-8 inline-flex items-center gap-2 text-sm"
      >
        <span className="bg-foreground text-background grid size-9 place-items-center rounded-full transition-transform group-hover:rotate-[8deg]">
          <Plane className="size-4 -rotate-45" />
        </span>
        <span className="font-display text-xl tracking-tight">Travelando</span>
      </Link>

      <div className="border-border/70 bg-card relative overflow-hidden rounded-[var(--radius-xl)] border p-8 shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_24px_60px_-32px_oklch(20%_0.02_250_/_0.2)]">
        <div
          aria-hidden
          className="grain absolute inset-0 opacity-30 mix-blend-overlay"
        />

        <div className="relative">
          <div className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
            {eyebrow}
          </div>
          <h1 className="font-display mt-2 text-[clamp(1.75rem,1rem+2.5vw,2.5rem)] leading-tight tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {description}
            </p>
          )}

          <div className="mt-8">{children}</div>
        </div>
      </div>

      {footer && (
        <div className="text-muted-foreground mt-6 text-center text-sm">
          {footer}
        </div>
      )}
    </div>
  );
}
