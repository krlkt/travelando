import { describe, expect, it } from 'vitest';
import { rowToDayPlan, dayPlanDraftToInsert } from './mappers';
import { dayPlanDraftSchema } from './schemas';
import { createInMemoryRepository } from './inMemoryRepository';
import type { DayPlanRow } from './mappers';

const baseRow: DayPlanRow = {
  id: 'dp-1',
  trip_id: 'trip-1',
  day_key: '2026-07-01',
};

describe('day plan mappers', () => {
  it('maps a row to a DayPlan', () => {
    expect(rowToDayPlan(baseRow)).toEqual({
      id: 'dp-1',
      tripId: 'trip-1',
      dayKey: '2026-07-01',
    });
  });

  it('maps a draft to an insert payload', () => {
    expect(
      dayPlanDraftToInsert({ tripId: 'trip-1', dayKey: '2026-07-01' }),
    ).toEqual({ trip_id: 'trip-1', day_key: '2026-07-01' });
  });
});

describe('dayPlanDraftSchema', () => {
  it('accepts a valid YYYY-MM-DD day key', () => {
    const result = dayPlanDraftSchema.safeParse({
      tripId: 'trip-1',
      dayKey: '2026-07-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed day key', () => {
    const result = dayPlanDraftSchema.safeParse({
      tripId: 'trip-1',
      dayKey: '07/01/2026',
    });
    expect(result.success).toBe(false);
  });
});

describe('in-memory day plan repository', () => {
  it('starts with no plans for a trip', async () => {
    const repo = createInMemoryRepository();
    expect(await repo.listDayPlans('trip-1')).toEqual([]);
  });

  it('marks a day planned and lists it', async () => {
    const repo = createInMemoryRepository();
    const plan = await repo.upsertDayPlan({
      tripId: 'trip-1',
      dayKey: '2026-07-01',
    });
    expect(plan.dayKey).toBe('2026-07-01');
    expect(await repo.listDayPlans('trip-1')).toHaveLength(1);
  });

  it('is idempotent for the same (trip, day)', async () => {
    const repo = createInMemoryRepository();
    const first = await repo.upsertDayPlan({
      tripId: 'trip-1',
      dayKey: '2026-07-01',
    });
    const second = await repo.upsertDayPlan({
      tripId: 'trip-1',
      dayKey: '2026-07-01',
    });
    expect(second.id).toBe(first.id);
    expect(await repo.listDayPlans('trip-1')).toHaveLength(1);
  });

  it('unmarks a day by removing its plan', async () => {
    const repo = createInMemoryRepository();
    const plan = await repo.upsertDayPlan({
      tripId: 'trip-1',
      dayKey: '2026-07-01',
    });
    await repo.removeDayPlan(plan.id);
    expect(await repo.listDayPlans('trip-1')).toEqual([]);
  });

  it('scopes plans per trip', async () => {
    const repo = createInMemoryRepository();
    await repo.upsertDayPlan({ tripId: 'trip-1', dayKey: '2026-07-01' });
    await repo.upsertDayPlan({ tripId: 'trip-2', dayKey: '2026-07-01' });
    expect(await repo.listDayPlans('trip-1')).toHaveLength(1);
    expect(await repo.listDayPlans('trip-2')).toHaveLength(1);
  });
});
