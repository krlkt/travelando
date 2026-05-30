// Helpers for `<input type="date">` + free-text time fields. All values are
// local-time strings (`YYYY-MM-DDTHH:MM`) so what the user types matches what
// they see — conversion to ISO only happens at the boundary via `fromLocalInput`.

const pad = (n: number): string => String(n).padStart(2, '0');

export function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
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
