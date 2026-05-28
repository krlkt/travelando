import type { ExpenseCategory, ItemKind } from './types';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'accommodation',
  'entertainment',
  'groceries',
  'restaurants',
  'shopping',
  'transport',
  'other',
] as const;

export const categoryLabels: Record<ExpenseCategory, string> = {
  accommodation: 'Accommodation',
  entertainment: 'Entertainment',
  groceries: 'Groceries',
  restaurants: 'Restaurants',
  shopping: 'Shopping',
  transport: 'Transport',
  other: 'Other',
};

export const categoryAccents: Record<ExpenseCategory, string> = {
  accommodation: 'var(--kind-lodging)',
  entertainment: 'var(--kind-activity)',
  groceries: 'oklch(72% 0.16 145)',
  restaurants: 'var(--kind-meal)',
  shopping: 'oklch(70% 0.18 320)',
  transport: 'var(--kind-transport)',
  other: 'oklch(60% 0.02 250)',
};

export function defaultCategoryForKind(kind: ItemKind): ExpenseCategory {
  switch (kind) {
    case 'lodging':
      return 'accommodation';
    case 'transport':
      return 'transport';
    case 'meal':
      return 'restaurants';
    case 'activity':
      return 'entertainment';
    case 'note':
    default:
      return 'other';
  }
}

export function defaultExpenseTitleForItem(
  kind: ItemKind,
  itemTitle: string,
): string {
  if (kind === 'lodging') return `Lodging: ${itemTitle}`;
  return itemTitle;
}
