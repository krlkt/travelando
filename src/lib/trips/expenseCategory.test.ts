import { describe, expect, it } from 'vitest';
import {
  defaultCategoryForKind,
  defaultExpenseTitleForItem,
} from './expenseCategory';

describe('defaultCategoryForKind', () => {
  it('maps lodging to accommodation', () => {
    expect(defaultCategoryForKind('lodging')).toBe('accommodation');
  });
  it('maps transport to transport', () => {
    expect(defaultCategoryForKind('transport')).toBe('transport');
  });
  it('maps meal to restaurants', () => {
    expect(defaultCategoryForKind('meal')).toBe('restaurants');
  });
  it('maps activity to entertainment', () => {
    expect(defaultCategoryForKind('activity')).toBe('entertainment');
  });
  it('maps note to other', () => {
    expect(defaultCategoryForKind('note')).toBe('other');
  });
});

describe('defaultExpenseTitleForItem', () => {
  it('prefixes lodging titles with "Lodging:"', () => {
    expect(defaultExpenseTitleForItem('lodging', 'Casa do Príncipe')).toBe(
      'Lodging: Casa do Príncipe',
    );
  });
  it('passes through other kinds unchanged', () => {
    expect(defaultExpenseTitleForItem('transport', 'KL 1693')).toBe('KL 1693');
    expect(defaultExpenseTitleForItem('meal', 'Ramiro')).toBe('Ramiro');
    expect(defaultExpenseTitleForItem('activity', 'Belém Tower')).toBe(
      'Belém Tower',
    );
  });
});
