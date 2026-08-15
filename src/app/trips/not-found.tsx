import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Trip not found — Travelando',
};

// Boundary for every /trips/[id] route. Because it lives one level above the
// [id] segment, notFound() bubbles past [id]/layout.tsx — so the trip nav bars
// (which key off the URL id) never render for a trip that isn't there.
export default function TripNotFound() {
  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 md:px-10 md:pt-14">
      <div className="mx-auto max-w-[var(--container-page)]">
        <div className="border-border/70 bg-secondary/20 mt-12 grid place-items-center rounded-[var(--radius-xl)] border border-dashed px-6 py-20 text-center">
          <MapPinOff className="text-primary size-6" />
          <h1 className="font-display mt-4 text-3xl tracking-tight">
            Trip not found
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            This trip doesn&apos;t exist, or it hasn&apos;t been shared with
            your account. Double-check the link, or head back to your trips.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/trips">
              <Compass className="size-4" />
              Back to your trips
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
