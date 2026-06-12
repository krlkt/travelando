// Helpers for `<input type="date">` + free-text time fields. All values are
// floating wall-time strings (`YYYY-MM-DDTHH:MM`, see `naive.ts`): what the
// user types is what gets stored and shown, on every device, in every
// timezone. No conversion to UTC ever happens.

import { stripOffset } from './naive';

const pad = (n: number): string => String(n).padStart(2, '0');

export function toLocalInput(value?: string): string {
  if (!value) return '';
  return stripOffset(value).slice(0, 16);
}

export function fromLocalInput(value: string): string {
  return stripOffset(value).slice(0, 16);
}

export function getDatePart(value: string): string {
  if (!value) return '';
  const idx = value.indexOf('T');
  return idx === -1 ? value : value.slice(0, idx);
}

export function getTimePart(value: string): string {
  if (!value) return '';
  const idx = value.indexOf('T');
  return idx === -1 ? '' : value.slice(idx + 1, idx + 6);
}

export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Normalizes loose time entry (`9`, `930`, `9:30`, `9.30`) to `HH:MM`, or null. */
export function parseTimeInput(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return null;

  const sepMatch = cleaned.match(/^(\d{1,2})[:.\- ](\d{1,2})$/);
  if (sepMatch) {
    const h = Number(sepMatch[1]);
    const m = Number(sepMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${pad(h)}:${pad(m)}`;
    return null;
  }

  if (/^\d{1,2}$/.test(cleaned)) {
    const h = Number(cleaned);
    if (h >= 0 && h <= 23) return `${pad(h)}:00`;
    return null;
  }

  if (/^\d{3,4}$/.test(cleaned)) {
    const padded = cleaned.padStart(4, '0');
    const h = Number(padded.slice(0, 2));
    const m = Number(padded.slice(2));
    if (h <= 23 && m <= 59) return `${pad(h)}:${pad(m)}`;
    return null;
  }

  return null;
}
