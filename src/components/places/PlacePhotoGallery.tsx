'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Larger fetch width for gallery tiles than the card thumbnail (retina-safe). */
const TILE_FETCH_W = 640;

interface PlacePhotoGalleryProps {
  /** Photo resource names (`places/{id}/photos/{ref}`) to display. */
  photoNames: string[];
  /** Place name, for the dialog title and image alt text. */
  placeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * On-demand photo grid for a place. Rendered inside a {@link Dialog}, so it only
 * mounts — and only fires its per-image `/api/places/photo` requests — once the
 * user opens it. The photo *references* come free with the already-cached place
 * details; the billed media fetches happen here, lazily, on open.
 *
 * The grid scales 2→3→4 columns across breakpoints so tiles stay a comfortable
 * size on phones (roomy, not cramped) without ballooning on wide screens.
 */
export function PlacePhotoGallery({
  photoNames,
  placeName,
  open,
  onOpenChange,
}: PlacePhotoGalleryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="truncate">{placeName}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photoNames.map((name, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={name}
              src={`/api/places/photo?name=${encodeURIComponent(name)}&w=${TILE_FETCH_W}`}
              alt={`${placeName} — photo ${index + 1}`}
              width={TILE_FETCH_W}
              height={TILE_FETCH_W}
              loading="lazy"
              className="border-border/40 aspect-square w-full rounded-[var(--radius-md)] border object-cover"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
