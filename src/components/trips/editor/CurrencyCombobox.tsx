'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  ISO_4217_CURRENCIES,
  isFrankfurterSupported,
  isKnownCurrencyCode,
  type CurrencyMeta,
} from '@/lib/trips/currencies';

interface CurrencyComboboxProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

const MAX_ROWS = 8;

function rankRows(query: string): {
  supported: CurrencyMeta[];
  others: CurrencyMeta[];
} {
  const q = query.trim().toLowerCase();
  const all = q
    ? ISO_4217_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
      )
    : ISO_4217_CURRENCIES;

  const supported: CurrencyMeta[] = [];
  const others: CurrencyMeta[] = [];
  for (const c of all) {
    if (isFrankfurterSupported(c.code)) supported.push(c);
    else others.push(c);
  }
  return { supported, others };
}

export function CurrencyCombobox({
  id,
  value,
  onChange,
  placeholder = 'EUR',
}: CurrencyComboboxProps) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const { supported, others } = rankRows(draft);
  const visibleSupported = supported.slice(0, MAX_ROWS);
  const remainingSlots = Math.max(0, MAX_ROWS - visibleSupported.length);
  const visibleOthers = others.slice(0, remainingSlots);
  const flatRows = [...visibleSupported, ...visibleOthers];

  function commit(next: string) {
    const upper = next.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(upper)) {
      onChange(upper);
      setDraft(upper);
    } else {
      setDraft(value);
    }
    setOpen(false);
  }

  function selectRow(meta: CurrencyMeta) {
    onChange(meta.code);
    setDraft(meta.code);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, flatRows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && flatRows[activeIndex]) {
        e.preventDefault();
        selectRow(flatRows[activeIndex]);
      } else {
        e.preventDefault();
        commit(draft);
        (e.currentTarget as HTMLInputElement).blur();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setDraft(value);
    }
  }

  const showFreeTextHint =
    draft.trim().length > 0 &&
    /^[A-Za-z]{3}$/.test(draft.trim()) &&
    !isKnownCurrencyCode(draft);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={draft}
        onChange={(e) => {
          const next = e.target.value
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .slice(0, 3);
          setDraft(next);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => commit(draft)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 max-w-[80vw] rounded-md border border-white/10 bg-zinc-900 py-1 shadow-xl">
          {flatRows.length === 0 ? (
            <div className="px-3 py-2 text-xs text-white/60">
              {showFreeTextHint
                ? `Press Enter to use "${draft.toUpperCase()}" (not converted to %).`
                : 'No matches. Type a 3-letter code.'}
            </div>
          ) : (
            <ul role="listbox" className="max-h-72 overflow-y-auto">
              {visibleSupported.length > 0 && (
                <li
                  role="presentation"
                  className="px-3 pt-1.5 pb-1 text-[10px] tracking-[0.14em] text-white/40 uppercase"
                >
                  Live FX · counts toward %
                </li>
              )}
              {visibleSupported.map((meta) => (
                <Row
                  key={meta.code}
                  meta={meta}
                  supported
                  active={flatRows[activeIndex]?.code === meta.code}
                  onSelect={() => selectRow(meta)}
                />
              ))}
              {visibleOthers.length > 0 && (
                <li
                  role="presentation"
                  className="px-3 pt-2 pb-1 text-[10px] tracking-[0.14em] text-white/40 uppercase"
                >
                  Display only
                </li>
              )}
              {visibleOthers.map((meta) => (
                <Row
                  key={meta.code}
                  meta={meta}
                  supported={false}
                  active={flatRows[activeIndex]?.code === meta.code}
                  onSelect={() => selectRow(meta)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  meta: CurrencyMeta;
  supported: boolean;
  active: boolean;
  onSelect: () => void;
}

function Row({ meta, supported, active, onSelect }: RowProps) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition focus:outline-none ${
          active ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-white">{meta.code}</span>
          <span className="truncate text-white/60">{meta.name}</span>
        </span>
        {supported && (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-emerald-300 uppercase">
            %
          </span>
        )}
      </button>
    </li>
  );
}
