'use client';

import type { MouseEvent, ReactNode } from 'react';
import { buildMapsUrl, isKnownPlace } from '@/lib/places/maps-link';
import type { Place } from '@/lib/trips/types';

interface PlaceAddressLinkProps {
  place: Pick<Place, 'label' | 'address' | 'lat' | 'lng' | 'placeId'>;
  children: ReactNode;
  className?: string;
}

export function PlaceAddressLink({
  place,
  children,
  className,
}: PlaceAddressLinkProps) {
  if (!isKnownPlace(place)) {
    return <span className={className}>{children}</span>;
  }

  const url = buildMapsUrl(place);
  if (!url) {
    return <span className={className}>{children}</span>;
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
      window.location.href = url!;
    } else {
      window.open(url!, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Open ${place.label} in Google Maps`}
      className={`cursor-pointer text-left underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
