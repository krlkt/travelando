'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseTimeInput } from '@/lib/time/timeInput';

interface TimeFieldProps {
  value: string;
  ariaLabel: string;
  onCommit: (time: string) => void;
}

/**
 * Free-text time entry that accepts loose input (`9`, `930`, `9:30`) and
 * commits a normalized `HH:MM` on blur/Enter. Shows a live draft while focused
 * and falls back to the committed value otherwise.
 */
export function TimeField({ value, ariaLabel, onCommit }: TimeFieldProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const display = focused ? draft : value;

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      onCommit('');
    } else {
      const parsed = parseTimeInput(trimmed);
      if (parsed !== null) onCommit(parsed);
    }
    setFocused(false);
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder="HH:MM"
      value={display}
      onFocus={(e) => {
        setDraft(value);
        setFocused(true);
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className="text-center tabular-nums"
    />
  );
}
