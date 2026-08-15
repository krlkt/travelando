import { isFrankfurterSupported } from './currencies';

export type EurRates = Record<string, number>;

const STORAGE_KEY = 'travelando.eurRates.v1';
const TTL_MS = 24 * 60 * 60 * 1000;
const ENDPOINT = 'https://api.frankfurter.dev/v1/latest?base=EUR';

const FALLBACK_RATES: EurRates = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.84,
  AUD: 1.65,
  CAD: 1.47,
  CHF: 0.95,
  CNY: 7.81,
  CZK: 25.3,
  DKK: 7.46,
  HKD: 8.4,
  HUF: 395.0,
  IDR: 17500.0,
  ILS: 4.0,
  INR: 90.0,
  ISK: 150.0,
  JPY: 165.0,
  KRW: 1450.0,
  MXN: 19.5,
  MYR: 5.05,
  NOK: 11.5,
  NZD: 1.8,
  PHP: 61.0,
  PLN: 4.3,
  RON: 4.97,
  SEK: 11.4,
  SGD: 1.45,
  THB: 38.5,
  TRY: 35.0,
  ZAR: 20.5,
  BGN: 1.96,
  BRL: 5.5,
};

interface CachedRates {
  fetchedAt: number;
  rates: EurRates;
}

let inFlight: Promise<EurRates> | null = null;

function readCache(): CachedRates | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (
      typeof parsed?.fetchedAt !== 'number' ||
      typeof parsed?.rates !== 'object'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: EurRates): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedRates = { fetchedAt: Date.now(), rates };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage quota or disabled; ignore
  }
}

export async function getEurRates(): Promise<EurRates> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { ...cached.rates, EUR: 1 };
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (!data.rates) throw new Error('FX response missing rates');
      const rates: EurRates = { ...data.rates, EUR: 1 };
      writeCache(rates);
      return rates;
    } catch {
      if (cached) return { ...cached.rates, EUR: 1 };
      return { ...FALLBACK_RATES };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function convertToEur(
  amount: number,
  code: string,
  rates: EurRates,
): number | null {
  const upper = code.toUpperCase();
  if (upper === 'EUR') return amount;
  const rate = rates[upper];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  return amount / rate;
}

/**
 * Convert an amount between any two currencies by routing through EUR (all
 * rates are EUR-based). Returns null when either leg is non-convertible, so
 * callers can exclude the amount rather than show a wrong figure.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: EurRates,
): number | null {
  const eur = convertToEur(amount, from, rates);
  if (eur === null) return null;
  const target = to.toUpperCase();
  if (target === 'EUR') return eur;
  const rate = rates[target];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  return eur * rate;
}

export function isConvertible(code: string, rates: EurRates): boolean {
  const upper = code.toUpperCase();
  if (upper === 'EUR') return true;
  if (!isFrankfurterSupported(upper)) return false;
  const rate = rates[upper];
  return Boolean(rate && Number.isFinite(rate) && rate > 0);
}
