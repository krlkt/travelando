import { describe, expect, it } from 'vitest';
import { rowToItem, itemDraftToInsert, itemPatchToUpdate } from './mappers';
import { itemDraftSchema, itemPatchSchema } from './schemas';
import type { TripItemRow } from './mappers';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseRow: TripItemRow = {
  id: 'item-1',
  trip_id: 'trip-1',
  kind: 'activity',
  title: 'Belém Tower',
  starts_at: '2026-07-01T10:00:00Z',
  ends_at: null,
  from_city: null,
  to_city: null,
  from_place: null,
  to_place: null,
  transport_mode: null,
  notes: null,
  private_to_user_ids: null,
};

// RFC 4122 v4 UUIDs: third group starts with [1-8], fourth group starts with [89ab]
const validUuid1 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const validUuid2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const baseDraft = {
  kind: 'activity' as const,
  title: 'Belém Tower',
  startsAt: '2026-07-01T10:00:00Z',
};

// ---------------------------------------------------------------------------
// rowToItem — private_to_user_ids → privateToUserIds
// ---------------------------------------------------------------------------

describe('rowToItem — privateToUserIds mapping', () => {
  it('returns undefined when private_to_user_ids is null', () => {
    const item = rowToItem({ ...baseRow, private_to_user_ids: null });
    expect(item.privateToUserIds).toBeUndefined();
  });

  it('maps a non-empty array straight through', () => {
    const item = rowToItem({
      ...baseRow,
      private_to_user_ids: [validUuid1, validUuid2],
    });
    expect(item.privateToUserIds).toEqual([validUuid1, validUuid2]);
  });

  it('preserves a single-element array', () => {
    const item = rowToItem({
      ...baseRow,
      private_to_user_ids: [validUuid1],
    });
    expect(item.privateToUserIds).toEqual([validUuid1]);
  });
});

// ---------------------------------------------------------------------------
// itemDraftToInsert — empty array / undefined → null invariant
// ---------------------------------------------------------------------------

describe('itemDraftToInsert — private_to_user_ids coercion', () => {
  it('sets private_to_user_ids to null when privateToUserIds is undefined', () => {
    const row = itemDraftToInsert('trip-1', baseDraft);
    expect(row.private_to_user_ids).toBeNull();
  });

  it('sets private_to_user_ids to null when privateToUserIds is an empty array', () => {
    const row = itemDraftToInsert('trip-1', {
      ...baseDraft,
      privateToUserIds: [],
    });
    expect(row.private_to_user_ids).toBeNull();
  });

  it('preserves the array when privateToUserIds is non-empty', () => {
    const row = itemDraftToInsert('trip-1', {
      ...baseDraft,
      privateToUserIds: [validUuid1, validUuid2],
    });
    expect(row.private_to_user_ids).toEqual([validUuid1, validUuid2]);
  });
});

// ---------------------------------------------------------------------------
// itemPatchToUpdate — selective update + empty array → null invariant
// ---------------------------------------------------------------------------

describe('itemPatchToUpdate — private_to_user_ids coercion', () => {
  it('omits private_to_user_ids entirely when not present in the patch', () => {
    const update = itemPatchToUpdate({ title: 'New title' });
    expect('private_to_user_ids' in update).toBe(false);
  });

  it('sets private_to_user_ids to null when patch has null (make-public)', () => {
    const update = itemPatchToUpdate({ privateToUserIds: null });
    expect(update.private_to_user_ids).toBeNull();
  });

  it('sets private_to_user_ids to null when patch has an empty array', () => {
    const update = itemPatchToUpdate({ privateToUserIds: [] });
    expect(update.private_to_user_ids).toBeNull();
  });

  it('preserves a non-empty array', () => {
    const update = itemPatchToUpdate({
      privateToUserIds: [validUuid1, validUuid2],
    });
    expect(update.private_to_user_ids).toEqual([validUuid1, validUuid2]);
  });

  it('does not touch other fields when only privateToUserIds is patched', () => {
    const update = itemPatchToUpdate({ privateToUserIds: [validUuid1] });
    expect(Object.keys(update)).toEqual(['private_to_user_ids']);
  });
});

// ---------------------------------------------------------------------------
// itemDraftSchema — Zod validation
// ---------------------------------------------------------------------------

describe('itemDraftSchema — privateToUserIds', () => {
  it('accepts a draft without privateToUserIds', () => {
    const result = itemDraftSchema.safeParse({
      kind: 'activity',
      title: 'Belém Tower',
      startsAt: '2026-07-01T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a draft with a valid UUID array', () => {
    const result = itemDraftSchema.safeParse({
      kind: 'activity',
      title: 'Belém Tower',
      startsAt: '2026-07-01T10:00:00Z',
      privateToUserIds: [validUuid1, validUuid2],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privateToUserIds).toEqual([validUuid1, validUuid2]);
    }
  });

  it('accepts an empty array (coercion to null happens in the mapper, not the schema)', () => {
    const result = itemDraftSchema.safeParse({
      kind: 'activity',
      title: 'Belém Tower',
      startsAt: '2026-07-01T10:00:00Z',
      privateToUserIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID strings in the array', () => {
    const result = itemDraftSchema.safeParse({
      kind: 'activity',
      title: 'Belém Tower',
      startsAt: '2026-07-01T10:00:00Z',
      privateToUserIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a plain string instead of an array', () => {
    const result = itemDraftSchema.safeParse({
      kind: 'activity',
      title: 'Belém Tower',
      startsAt: '2026-07-01T10:00:00Z',
      privateToUserIds: validUuid1,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// itemPatchSchema — Zod validation
// ---------------------------------------------------------------------------

describe('itemPatchSchema — privateToUserIds', () => {
  it('accepts a patch without privateToUserIds', () => {
    const result = itemPatchSchema.safeParse({ title: 'Updated title' });
    expect(result.success).toBe(true);
  });

  it('accepts null to explicitly clear privacy', () => {
    const result = itemPatchSchema.safeParse({ privateToUserIds: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privateToUserIds).toBeNull();
    }
  });

  it('accepts a valid UUID array', () => {
    const result = itemPatchSchema.safeParse({
      privateToUserIds: [validUuid1],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privateToUserIds).toEqual([validUuid1]);
    }
  });

  it('rejects non-UUID strings', () => {
    const result = itemPatchSchema.safeParse({
      privateToUserIds: ['not-a-uuid', validUuid1],
    });
    expect(result.success).toBe(false);
  });

  it('accepts undefined (field omitted)', () => {
    const result = itemPatchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privateToUserIds).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Round-trip invariant: DB → domain → DB never writes an empty array
// ---------------------------------------------------------------------------

describe('empty-array invariant: private_to_user_ids is never written as []', () => {
  it('draft with empty privateToUserIds round-trips to null in the DB row', () => {
    const row = itemDraftToInsert('trip-1', {
      ...baseDraft,
      privateToUserIds: [],
    });
    expect(row.private_to_user_ids).not.toEqual([]);
    expect(row.private_to_user_ids).toBeNull();
  });

  it('patch with empty privateToUserIds round-trips to null in the DB update', () => {
    const update = itemPatchToUpdate({ privateToUserIds: [] });
    expect(update.private_to_user_ids).not.toEqual([]);
    expect(update.private_to_user_ids).toBeNull();
  });

  it('patch with null privateToUserIds round-trips to null in the DB update', () => {
    const update = itemPatchToUpdate({ privateToUserIds: null });
    expect(update.private_to_user_ids).toBeNull();
  });
});
