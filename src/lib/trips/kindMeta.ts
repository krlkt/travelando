import {
  Bed,
  Camera,
  Plane,
  Train,
  Car,
  Bus,
  Ship,
  Footprints,
  TramFront,
  UtensilsCrossed,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import type { ItemKind, TransportMode } from './types';

interface KindMeta {
  label: string;
  badge: 'transport' | 'activity' | 'lodging' | 'meal' | 'note';
  icon: LucideIcon;
  accent: string;
}

export const kindMeta: Record<ItemKind, KindMeta> = {
  transport: {
    label: 'Transport',
    badge: 'transport',
    icon: Plane,
    accent: 'var(--kind-transport)',
  },
  activity: {
    label: 'Activity',
    badge: 'activity',
    icon: Camera,
    accent: 'var(--kind-activity)',
  },
  lodging: {
    label: 'Lodging',
    badge: 'lodging',
    icon: Bed,
    accent: 'var(--kind-lodging)',
  },
  meal: {
    label: 'Meal',
    badge: 'meal',
    icon: UtensilsCrossed,
    accent: 'var(--kind-meal)',
  },
  note: {
    label: 'Note',
    badge: 'note',
    icon: StickyNote,
    accent: 'var(--kind-note)',
  },
};

export const transportIcons: Record<TransportMode, LucideIcon> = {
  flight: Plane,
  train: Train,
  metro: TramFront,
  car: Car,
  taxi: Car,
  bus: Bus,
  ferry: Ship,
  walk: Footprints,
};

export const itemKinds: ItemKind[] = [
  'transport',
  'activity',
  'lodging',
  'meal',
  'note',
];
export const transportModes: TransportMode[] = [
  'flight',
  'train',
  'metro',
  'bus',
  'car',
  'taxi',
  'ferry',
  'walk',
];
