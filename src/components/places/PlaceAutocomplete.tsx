'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  getPlacesProvider,
  type PlaceDetail,
  type PlaceSuggestion,
} from '@/lib/places/provider';
import type { Place } from '@/lib/trips/types';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: Place) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  className,
}: PlaceAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const provider = getPlacesProvider();

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (query.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        const results = await provider.autocomplete(query, sessionToken);
        setSuggestions(results);
        setOpen(results.length > 0);
        setLoading(false);
      }, 300);
    },
    [provider, sessionToken],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelect(suggestion: PlaceSuggestion) {
    onChange(suggestion.description);
    setOpen(false);
    setSuggestions([]);

    const detail: PlaceDetail | null = await provider.getDetails(
      suggestion.placeId,
      sessionToken,
    );
    if (detail) {
      onSelect({
        label: detail.label,
        address: detail.address,
        lat: detail.lat,
        lng: detail.lng,
        placeId: detail.placeId,
      });
    } else {
      onSelect({ label: suggestion.label, address: suggestion.description });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-zinc-900 py-1 shadow-xl">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
              >
                <span className="font-medium text-white">{s.label}</span>
                {s.description !== s.label && (
                  <span className="ml-1 text-white/50">
                    {s.description.slice(s.label.length)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
