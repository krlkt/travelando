import type { Trip } from './types';
import { dayKey } from '@/lib/time/formatDate';
import { toNaiveString } from '@/lib/time/naive';

const today = new Date();
const iso = (offsetDays: number, hours = 0, minutes = 0): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return toNaiveString(d);
};
const dateOnly = (offsetDays: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return dayKey(d);
};

export const mockTrips: Trip[] = [
  {
    id: 'trip-lisbon',
    title: 'Lisbon Long Weekend',
    destination: 'Lisbon, Portugal',
    coverGradient:
      'linear-gradient(135deg, oklch(72% 0.13 38) 0%, oklch(58% 0.16 38) 60%, oklch(40% 0.10 295) 100%)',
    startDate: dateOnly(-1),
    endDate: dateOnly(2),
    members: [
      {
        id: 'm-l-1',
        tripId: 'trip-lisbon',
        displayName: 'Karel',
        status: 'accepted',
      },
      {
        id: 'm-l-2',
        tripId: 'trip-lisbon',
        displayName: 'Marta',
        status: 'accepted',
      },
    ],
    items: [
      {
        id: 'i-l-1',
        tripId: 'trip-lisbon',
        kind: 'transport',
        title: 'Flight to Lisbon',
        startsAt: iso(-1, 7, 30),
        endsAt: iso(-1, 10, 45),
        transportMode: 'flight',
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Lisbon' },
        from: { label: 'AMS Schiphol', address: 'Amsterdam, NL' },
        to: { label: 'LIS Humberto Delgado', address: 'Lisbon, PT' },
        notes: 'KL 1693 · Gate D4. Seat 14A.',
      },
      {
        id: 'i-l-2',
        tripId: 'trip-lisbon',
        kind: 'lodging',
        title: 'Casa do Príncipe',
        startsAt: iso(-1, 14, 0),
        endsAt: iso(2, 11, 0),
        to: { label: 'Príncipe Real', address: 'R. Dom Pedro V, Lisbon' },
        notes: 'Check-in code: 4422 · Host: Inês',
      },
      {
        id: 'i-l-3',
        tripId: 'trip-lisbon',
        kind: 'meal',
        title: 'Dinner at Cervejaria Ramiro',
        startsAt: iso(-1, 19, 30),
        endsAt: iso(-1, 21, 30),
        to: { label: 'Cervejaria Ramiro', address: 'Av. Almirante Reis 1' },
        notes: 'Garlic prawns, percebes, prego no fim.',
      },
      {
        id: 'i-l-4',
        tripId: 'trip-lisbon',
        kind: 'activity',
        title: 'Tram 28 + Alfama walk',
        startsAt: iso(0, 10, 0),
        endsAt: iso(0, 13, 0),
        from: { label: 'Martim Moniz' },
        to: { label: 'Miradouro de Santa Luzia' },
        notes: 'Pastéis de Belém after.',
      },
      {
        id: 'i-l-5',
        tripId: 'trip-lisbon',
        kind: 'activity',
        title: 'LX Factory shops + sunset',
        startsAt: iso(0, 16, 30),
        endsAt: iso(0, 19, 0),
        to: { label: 'LX Factory', address: 'R. Rodrigues de Faria 103' },
      },
      {
        id: 'i-l-6',
        tripId: 'trip-lisbon',
        kind: 'meal',
        title: 'Dinner — Time Out Market',
        startsAt: iso(0, 20, 0),
        endsAt: iso(0, 22, 0),
        to: { label: 'Time Out Market' },
      },
      {
        id: 'i-l-7',
        tripId: 'trip-lisbon',
        kind: 'transport',
        title: 'Day trip — train to Sintra',
        startsAt: iso(1, 9, 15),
        endsAt: iso(1, 10, 0),
        transportMode: 'train',
        fromCity: { label: 'Lisbon' },
        toCity: { label: 'Sintra' },
        from: { label: 'Rossio Station' },
        to: { label: 'Sintra Station' },
      },
      {
        id: 'i-l-8',
        tripId: 'trip-lisbon',
        kind: 'activity',
        title: 'Pena Palace + Quinta da Regaleira',
        startsAt: iso(1, 10, 30),
        endsAt: iso(1, 16, 0),
        to: { label: 'Sintra' },
      },
      {
        id: 'i-l-9',
        tripId: 'trip-lisbon',
        kind: 'transport',
        title: 'Flight back to Amsterdam',
        startsAt: iso(2, 13, 0),
        endsAt: iso(2, 16, 30),
        transportMode: 'flight',
        fromCity: { label: 'Lisbon' },
        toCity: { label: 'Amsterdam' },
        from: { label: 'LIS Humberto Delgado' },
        to: { label: 'AMS Schiphol' },
      },
    ],
  },
  {
    id: 'trip-japan',
    title: 'Japan · 12 Days',
    destination: 'Tokyo → Kyoto → Osaka',
    coverGradient:
      'linear-gradient(135deg, oklch(68% 0.15 220) 0%, oklch(48% 0.12 250) 50%, oklch(30% 0.08 295) 100%)',
    startDate: dateOnly(28),
    endDate: dateOnly(40),
    members: [
      {
        id: 'm-j-1',
        tripId: 'trip-japan',
        displayName: 'Karel',
        status: 'accepted',
      },
      {
        id: 'm-j-2',
        tripId: 'trip-japan',
        displayName: 'Marta',
        status: 'accepted',
      },
      {
        id: 'm-j-3',
        tripId: 'trip-japan',
        displayName: 'Niels',
        status: 'accepted',
      },
    ],
    items: [
      {
        id: 'i-j-1',
        tripId: 'trip-japan',
        kind: 'transport',
        title: 'KLM 861 → Tokyo Haneda',
        startsAt: iso(28, 13, 40),
        endsAt: iso(29, 9, 30),
        transportMode: 'flight',
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Tokyo' },
        from: { label: 'AMS Schiphol' },
        to: { label: 'HND Tokyo' },
      },
      {
        id: 'i-j-2',
        tripId: 'trip-japan',
        kind: 'lodging',
        title: 'Shibuya Stream Hotel',
        startsAt: iso(29, 14, 0),
        endsAt: iso(32, 11, 0),
        to: { label: 'Shibuya, Tokyo' },
      },
      {
        id: 'i-j-3',
        tripId: 'trip-japan',
        kind: 'activity',
        title: 'TeamLab Planets',
        startsAt: iso(30, 10, 0),
        endsAt: iso(30, 13, 0),
        to: { label: 'Toyosu, Tokyo' },
      },
      {
        id: 'i-j-4',
        tripId: 'trip-japan',
        kind: 'transport',
        title: 'Shinkansen — Tokyo → Kyoto',
        startsAt: iso(32, 12, 30),
        endsAt: iso(32, 15, 0),
        transportMode: 'train',
        fromCity: { label: 'Tokyo' },
        toCity: { label: 'Kyoto' },
        from: { label: 'Tokyo Station' },
        to: { label: 'Kyoto Station' },
      },
    ],
  },
  {
    id: 'trip-iceland',
    title: 'Iceland Ring Road',
    destination: 'Reykjavík → Vík → Höfn',
    coverGradient:
      'linear-gradient(135deg, oklch(72% 0.08 220) 0%, oklch(48% 0.06 250) 100%)',
    startDate: dateOnly(-90),
    endDate: dateOnly(-80),
    members: [
      {
        id: 'm-i-1',
        tripId: 'trip-iceland',
        displayName: 'Karel',
        status: 'accepted',
      },
    ],
    items: [
      {
        id: 'i-ic-1',
        tripId: 'trip-iceland',
        kind: 'transport',
        title: 'Flight KEF',
        startsAt: iso(-90, 8, 0),
        endsAt: iso(-90, 11, 30),
        transportMode: 'flight',
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Reykjavík' },
        from: { label: 'AMS' },
        to: { label: 'KEF Keflavík' },
      },
      {
        id: 'i-ic-2',
        tripId: 'trip-iceland',
        kind: 'activity',
        title: 'Seljalandsfoss + Skógafoss',
        startsAt: iso(-88, 11, 0),
        endsAt: iso(-88, 17, 0),
        to: { label: 'South Iceland' },
      },
    ],
  },
];
