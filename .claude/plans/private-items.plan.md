# Plan: Private Timeline Items

**Complexity:** Large  
**Status:** Ready to implement

---

## Feature Summary

In a collaborative trip, members can mark any timeline item as **private** — visible and editable only by a chosen subset of members. A locked item is invisible to everyone not in its private access list. The creator picks which other trip members share the item; those members can edit it or leave it. The feature uses a `private_to_user_ids uuid[]` column enforced by Supabase RLS so privacy is guaranteed at the database layer, not just the UI.

---

## App Context (read this before touching code)

### Stack
- **Next.js** app router, TypeScript, Tailwind, shadcn/ui components, Supabase (Postgres + RLS + Auth), Framer Motion.
- All client mutations go through API routes under `/src/app/api/` and the `TripsContext` in `/src/lib/trips/context.tsx`.
- The Supabase client used in API routes is the **server client** (`createClient` from `/src/lib/supabase/server.ts`) — it carries the user's session cookie, so RLS applies correctly.

### Key files to understand
| File | Role |
|---|---|
| `src/lib/trips/types.ts` | All domain types (`TripItem`, `ItemDraft`, `ItemPatch`, etc.) |
| `src/lib/trips/schemas.ts` | Zod schemas used to validate API request bodies |
| `src/lib/trips/mappers.ts` | DB row ↔ domain type conversions; raw insert/update shapes |
| `src/lib/trips/supabaseRepository.ts` | All Supabase queries; implements `TripsRepository` |
| `src/lib/trips/context.tsx` | Client-side state + optimistic updates via `TripsProvider` |
| `src/app/api/trips/[id]/items/route.ts` | POST — create item |
| `src/app/api/trips/[id]/items/[itemId]/route.ts` | PATCH / DELETE — update or delete item |
| `src/components/trips/editor/ItemEditorSheet.tsx` | Sheet for creating/editing trip items |
| `src/components/trips/TimelineItem.tsx` | Single row in the day timeline |
| `src/components/trips/ItemDetailSheet.tsx` | Read-only detail sheet with Edit/Delete/Add Expense actions |
| `src/components/trips/expenses/ExpenseSheet.tsx` | Create/edit expense; member share split |
| `supabase/migrations/` | Ordered SQL migrations applied to Supabase |

### Existing RLS architecture
The helper function `public.can_access_trip(p_trip_id uuid)` (SECURITY DEFINER) returns true if `auth.uid()` is the trip owner or is in `trip_members.user_id`. All four item policies (`select`, `insert`, `update`, `delete`) use this function. We will extend each policy with an additional privacy check.

### Trip members with vs. without accounts
`trip_members` has a nullable `user_id uuid` column. Members invited by email who have signed up get a `user_id`; name-only members (offline people) have `user_id = NULL`. **Only members with a non-null `user_id` can be added to a private item's access list** — there is no `auth.uid()` to match against for offline members.

---

## Data Model Change

### New column on `trip_items`

```
private_to_user_ids  uuid[]  NULL
```

- `NULL` → public (visible to all trip members, current default)  
- Non-null array → private; only users whose `auth.uid()` is in the array can see or write the item  
- The array stores **`auth.users.id`** values (same as `profiles.id` and `trip_members.user_id`)  
- An empty array `'{}'` is treated the same as NULL (public) — the API never writes an empty array; it always writes NULL when making an item public

### Why an array, not a junction table
The private access set is tiny (≤ trip size, typically 2–8 people). PostgreSQL `= any(array)` on a small array is fast. No extra table means simpler RLS, simpler queries, simpler mapper code. If we ever need richer metadata (roles, join timestamps) we can migrate to a junction table later.

---

## SQL Migration

**Filename:** `supabase/migrations/20260608000000_private_items.sql`

```sql
-- Private timeline items
-- private_to_user_ids: NULL = public, non-null array = private to those auth UIDs only.

alter table public.trip_items
  add column if not exists private_to_user_ids uuid[];

-- GIN index for fast `= any(array)` lookups
create index if not exists trip_items_private_users_idx
  on public.trip_items using gin (private_to_user_ids)
  where private_to_user_ids is not null;

-- Rewrite all four item RLS policies ----------------------------------------
drop policy if exists "trip_items member read"   on public.trip_items;
drop policy if exists "trip_items member insert" on public.trip_items;
drop policy if exists "trip_items member update" on public.trip_items;
drop policy if exists "trip_items member delete" on public.trip_items;

-- SELECT: must be a trip member AND (item is public OR you are in the private list)
create policy "trip_items member read"
  on public.trip_items for select
  using (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );

-- INSERT: same visibility check (can't create a private item you wouldn't be able to see)
create policy "trip_items member insert"
  on public.trip_items for insert
  with check (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );

-- UPDATE: can only update items you can see
create policy "trip_items member update"
  on public.trip_items for update
  using (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  )
  with check (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );

-- DELETE: can only delete items you can see
create policy "trip_items member delete"
  on public.trip_items for delete
  using (
    public.can_access_trip(trip_id)
    and (
      private_to_user_ids is null
      or auth.uid() = any(private_to_user_ids)
    )
  );
```

**Apply this migration first before any code changes.**

---

## Phase 1 — Types (`src/lib/trips/types.ts`)

### Changes to `TripItem`
Add one new optional field:

```typescript
export interface TripItem {
  id: string;
  tripId: string;
  kind: ItemKind;
  title: string;
  startsAt: string;
  endsAt?: string;
  fromCity?: Place;
  toCity?: Place;
  from?: Place;
  to?: Place;
  transportMode?: TransportMode;
  notes?: string;
  // NEW — undefined means public; array of auth UIDs means private
  privateToUserIds?: string[];
}
```

### Changes to `ItemDraft`
`ItemDraft` is currently `Omit<TripItem, 'id' | 'tripId'>`. Since `privateToUserIds` is now part of `TripItem`, it is automatically included in `ItemDraft`. No change needed to the type alias.

### Changes to `ItemPatch`
Add the new field:

```typescript
export interface ItemPatch {
  kind?: ItemKind;
  title?: string;
  startsAt?: string;
  endsAt?: string | null;
  fromCity?: Place | null;
  toCity?: Place | null;
  from?: Place | null;
  to?: Place | null;
  transportMode?: TransportMode | null;
  notes?: string | null;
  // NEW — null clears privacy (makes public); array sets private members
  privateToUserIds?: string[] | null;
}
```

---

## Phase 2 — Mappers (`src/lib/trips/mappers.ts`)

### `TripItemRow` interface
Add the column:

```typescript
export interface TripItemRow {
  id: string;
  trip_id: string;
  kind: TripItem['kind'];
  title: string;
  starts_at: string;
  ends_at: string | null;
  from_city: Place | null;
  to_city: Place | null;
  from_place: Place | null;
  to_place: Place | null;
  transport_mode: string | null;
  notes: string | null;
  private_to_user_ids: string[] | null;  // NEW
}
```

### `rowToItem`
```typescript
export function rowToItem(row: TripItemRow): TripItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    fromCity: row.from_city ?? undefined,
    toCity: row.to_city ?? undefined,
    from: row.from_place ?? undefined,
    to: row.to_place ?? undefined,
    transportMode: (row.transport_mode as TripItem['transportMode']) ?? undefined,
    notes: row.notes ?? undefined,
    privateToUserIds: row.private_to_user_ids ?? undefined,  // NEW
  };
}
```

### `itemDraftToInsert`
```typescript
export function itemDraftToInsert(
  tripId: string,
  draft: ItemDraft,
): Omit<TripItemRow, 'id'> {
  return {
    trip_id: tripId,
    kind: draft.kind,
    title: draft.title,
    starts_at: draft.startsAt,
    ends_at: draft.endsAt ?? null,
    from_city: draft.fromCity ?? null,
    to_city: draft.toCity ?? null,
    from_place: draft.from ?? null,
    to_place: draft.to ?? null,
    transport_mode: draft.transportMode ?? null,
    notes: draft.notes ?? null,
    private_to_user_ids:                                      // NEW
      draft.privateToUserIds && draft.privateToUserIds.length > 0
        ? draft.privateToUserIds
        : null,
  };
}
```

### `itemPatchToUpdate`
```typescript
export function itemPatchToUpdate(
  patch: ItemPatch,
): Partial<Omit<TripItemRow, 'id' | 'trip_id'>> {
  const out: Partial<Omit<TripItemRow, 'id' | 'trip_id'>> = {};
  if (patch.kind !== undefined) out.kind = patch.kind;
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.startsAt !== undefined) out.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) out.ends_at = patch.endsAt ?? null;
  if (patch.fromCity !== undefined) out.from_city = patch.fromCity ?? null;
  if (patch.toCity !== undefined) out.to_city = patch.toCity ?? null;
  if (patch.from !== undefined) out.from_place = patch.from ?? null;
  if (patch.to !== undefined) out.to_place = patch.to ?? null;
  if (patch.transportMode !== undefined) out.transport_mode = patch.transportMode ?? null;
  if (patch.notes !== undefined) out.notes = patch.notes ?? null;
  // NEW
  if (patch.privateToUserIds !== undefined) {
    out.private_to_user_ids =
      patch.privateToUserIds && patch.privateToUserIds.length > 0
        ? patch.privateToUserIds
        : null;
  }
  return out;
}
```

---

## Phase 3 — Zod Schemas (`src/lib/trips/schemas.ts`)

### `itemDraftSchema`
Add at the end of the object:
```typescript
privateToUserIds: z.array(z.string().uuid()).optional(),
```

### `itemPatchSchema`
Add:
```typescript
privateToUserIds: z.array(z.string().uuid()).nullish(),
```

Full updated schemas for reference:

```typescript
export const itemDraftSchema = z.object({
  kind: itemKindSchema,
  title: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  fromCity: placeSchema.optional(),
  toCity: placeSchema.optional(),
  from: placeSchema.optional(),
  to: placeSchema.optional(),
  transportMode: transportModeSchema.optional(),
  notes: z.string().optional(),
  privateToUserIds: z.array(z.string().uuid()).optional(),  // NEW
});

export const itemPatchSchema = z.object({
  kind: itemKindSchema.optional(),
  title: z.string().min(1).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().nullish(),
  fromCity: placeSchema.nullish(),
  toCity: placeSchema.nullish(),
  from: placeSchema.nullish(),
  to: placeSchema.nullish(),
  transportMode: transportModeSchema.nullish(),
  notes: z.string().nullish(),
  privateToUserIds: z.array(z.string().uuid()).nullish(),  // NEW
});
```

---

## Phase 4 — Repository (`src/lib/trips/supabaseRepository.ts`)

### Extend `ITEM_COLUMNS`
```typescript
const ITEM_COLUMNS =
  'id, trip_id, kind, title, starts_at, ends_at, from_city, to_city, from_place, to_place, transport_mode, notes, private_to_user_ids';
```

No other changes needed to the repository — `itemDraftToInsert` and `itemPatchToUpdate` already handle the new field after the mapper changes above. The Supabase client's session-based auth means RLS automatically enforces the privacy rules on all queries.

---

## Phase 5 — Context (`src/lib/trips/context.tsx`)

### Update `applyItemPatch`
```typescript
function applyItemPatch(item: TripItem, patch: ItemPatch): TripItem {
  const next: TripItem = { ...item };
  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.startsAt !== undefined) next.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) next.endsAt = patch.endsAt ?? undefined;
  if (patch.fromCity !== undefined) next.fromCity = patch.fromCity ?? undefined;
  if (patch.toCity !== undefined) next.toCity = patch.toCity ?? undefined;
  if (patch.from !== undefined) next.from = patch.from ?? undefined;
  if (patch.to !== undefined) next.to = patch.to ?? undefined;
  if (patch.transportMode !== undefined)
    next.transportMode = patch.transportMode ?? undefined;
  if (patch.notes !== undefined) next.notes = patch.notes ?? undefined;
  // NEW — optimistically update; server response carries the real value
  if (patch.privateToUserIds !== undefined)
    next.privateToUserIds =
      patch.privateToUserIds && patch.privateToUserIds.length > 0
        ? patch.privateToUserIds
        : undefined;
  return next;
}
```

No other changes to context are required. The existing `addItem`, `updateItem`, and `removeItem` flows pass the draft/patch straight through to the API and replace the optimistic item with the server response.

---

## Phase 6 — API Routes

### `src/app/api/trips/[id]/items/route.ts` (POST)
No changes needed. The body is validated with `itemDraftSchema` (which now includes `privateToUserIds`), and the parsed data flows to `repo.addItem` → `itemDraftToInsert`. The new field is handled automatically.

**One important guard to add**: The API should verify that all `privateToUserIds` values are actual members of this trip. If a caller sends arbitrary UUIDs, the DB insert would succeed (the FK is to `auth.users`, not `trip_members`) but would create nonsensical private access. Add this check after schema validation:

```typescript
// In the POST handler, after const parsed = itemDraftSchema.safeParse(body)
if (parsed.data.privateToUserIds && parsed.data.privateToUserIds.length > 0) {
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .not('user_id', 'is', null);

  const validUserIds = new Set((members ?? []).map((m) => m.user_id as string));
  const invalid = parsed.data.privateToUserIds.filter((uid) => !validUserIds.has(uid));
  if (invalid.length > 0) {
    return NextResponse.json(
      { success: false, error: 'invalid_private_member_ids' },
      { status: 400 },
    );
  }
}
```

### `src/app/api/trips/[id]/items/[itemId]/route.ts` (PATCH)
Add the same membership guard in the PATCH handler:

```typescript
// After schema validation, before calling repo.updateItem
if (parsed.data.privateToUserIds && parsed.data.privateToUserIds.length > 0) {
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .not('user_id', 'is', null);

  const validUserIds = new Set((members ?? []).map((m) => m.user_id as string));
  const invalid = parsed.data.privateToUserIds.filter((uid) => !validUserIds.has(uid));
  if (invalid.length > 0) {
    return NextResponse.json(
      { success: false, error: 'invalid_private_member_ids' },
      { status: 400 },
    );
  }
}
```

---

## Phase 7 — Item Editor UI (`src/components/trips/editor/ItemEditorSheet.tsx`)

### Overview of changes
1. Add `isPrivate` boolean state (derived from `item.privateToUserIds`)
2. Add `privateUserIds` string[] state for the selected private members
3. When `isPrivate` is toggled on, auto-include the current user in `privateUserIds`
4. Render a lock toggle button + collapsible member picker
5. Pass `privateToUserIds` (or `null` to clear) in the save payload

### New state variables
Add these alongside the existing state declarations in `ItemEditorBody`:

```typescript
// Derive initial private state from the item being edited
const { user } = useAuth();  // import useAuth from '@/lib/auth/context'

const [isPrivate, setIsPrivate] = useState<boolean>(
  (item?.privateToUserIds?.length ?? 0) > 0,
);
const [privateUserIds, setPrivateUserIds] = useState<string[]>(
  item?.privateToUserIds ?? [],
);
```

### Toggle handler
```typescript
function handlePrivacyToggle() {
  if (isPrivate) {
    // Make public
    setIsPrivate(false);
    setPrivateUserIds([]);
  } else {
    // Make private — auto-include current user
    setIsPrivate(true);
    if (user?.id && !privateUserIds.includes(user.id)) {
      setPrivateUserIds([user.id]);
    }
  }
}
```

### Private member picker
Only show members who have a linked account (`member.userId` is set). The current user is always checked and cannot be unchecked (they must remain in their own private item or make it public).

```typescript
// Helper: members with accounts, for the private picker
const accountMembers = trip.members.filter((m) => m.userId != null);

function togglePrivateMember(userId: string) {
  if (userId === user?.id) return; // can't remove yourself; use the toggle instead
  setPrivateUserIds((prev) =>
    prev.includes(userId)
      ? prev.filter((id) => id !== userId)
      : [...prev, userId],
  );
}
```

### UI — add after the Notes field, before the error/footer
```tsx
{/* Privacy toggle */}
<div className="flex items-center justify-between">
  <div className="grid gap-0.5">
    <Label>Visibility</Label>
    {isPrivate && accountMembers.length <= 1 && (
      <p className="text-muted-foreground text-xs">
        No other members with accounts to share with.
      </p>
    )}
  </div>
  <button
    type="button"
    onClick={handlePrivacyToggle}
    aria-pressed={isPrivate}
    className={cn(
      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition',
      isPrivate
        ? 'border-foreground/20 bg-secondary text-foreground'
        : 'border-border/60 text-muted-foreground hover:text-foreground',
    )}
  >
    {isPrivate ? (
      <Lock className="size-3.5" />
    ) : (
      <LockOpen className="size-3.5" />
    )}
    {isPrivate ? 'Private' : 'Shared with all'}
  </button>
</div>

{/* Private member picker — only shown when private and there are other account members */}
{isPrivate && accountMembers.length > 1 && (
  <div className="grid gap-1.5">
    <Label className="text-muted-foreground text-xs">
      Who can see this
    </Label>
    <div className="border-border/60 bg-background/40 grid gap-1 rounded-md border p-2">
      {accountMembers.map((member) => {
        const isCurrentUser = member.userId === user?.id;
        const isSelected = isCurrentUser || privateUserIds.includes(member.userId!);
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => togglePrivateMember(member.userId!)}
            disabled={isCurrentUser}
            aria-pressed={isSelected}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition',
              isSelected ? 'opacity-100' : 'opacity-50',
              isCurrentUser ? 'cursor-default' : 'hover:bg-secondary/60',
            )}
          >
            <span
              className={cn(
                'border-border grid size-4 shrink-0 place-items-center rounded border',
                isSelected ? 'bg-primary border-primary text-primary-foreground' : '',
              )}
            >
              {isSelected && (
                <svg viewBox="0 0 16 16" className="size-2.5" fill="currentColor">
                  <path d="M6.2 10.6 3.4 7.8l-.9.9 3.7 3.7 8-8-.9-.9z" />
                </svg>
              )}
            </span>
            <span className="flex-1 truncate">{member.displayName}</span>
            {isCurrentUser && (
              <span className="text-muted-foreground/60 text-[10px]">you</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
)}
```

### Confirmation for making existing public items private
In `handleSave`, before calling `updateItem`, add:

```typescript
if (isEdit && item && !item.privateToUserIds?.length && isPrivate) {
  // Item was public, now going private — soft-confirm
  const ok = window.confirm(
    'This item will be hidden from members not in your private list. Linked expenses stay shared with everyone.',
  );
  if (!ok) return;
}
```

### Save payload changes
In `handleSave`, update the `ItemDraft` and `ItemPatch` construction:

```typescript
// For new items (draft):
const draft: ItemDraft = {
  // ... existing fields ...
  privateToUserIds: isPrivate && privateUserIds.length > 0 ? privateUserIds : undefined,
};

// For edits (patch):
const patch: ItemPatch = {
  // ... existing fields ...
  privateToUserIds: isPrivate && privateUserIds.length > 0
    ? privateUserIds
    : null,  // null explicitly clears privacy
};
```

**Import `Lock` and `LockOpen`** from `lucide-react` (already present in the codebase in ExpenseSheet, so confirmed available).

---

## Phase 8 — Timeline Item Display (`src/components/trips/TimelineItem.tsx`)

### Add lock badge
In the right-side badge area (alongside the "Now" and "overlaps" badges), add:

```tsx
{item.privateToUserIds && item.privateToUserIds.length > 0 && (
  <Badge variant="muted" className="gap-1 text-[10px]">
    <Lock className="size-2.5" />
    {item.privateToUserIds.length === 1 ? 'Private' : `Private · ${item.privateToUserIds.length}`}
  </Badge>
)}
```

Import `Lock` from `lucide-react`.

The number indicator lets the creator quickly see how many people share this private item.

---

## Phase 9 — Item Detail Sheet (`src/components/trips/ItemDetailSheet.tsx`)

Read this file fully before editing — it contains the "Edit" and "Delete" actions. We need to add a **"Leave private item"** action.

### New "Leave" button logic
Add this inside the sheet body, visible only when:
- The item is private (`item.privateToUserIds?.length > 0`)
- The current user is in the private list
- The current user is **not** the only remaining member (last member must make it public or delete)

```tsx
const { user } = useAuth();
const isInPrivateItem =
  item.privateToUserIds?.includes(user?.id ?? '') ?? false;
const isLastPrivateMember =
  isInPrivateItem && (item.privateToUserIds?.length ?? 0) === 1;

// In the action buttons area:
{isInPrivateItem && !isLastPrivateMember && (
  <Button
    variant="ghost"
    size="sm"
    className="text-muted-foreground hover:text-foreground"
    onClick={handleLeave}
  >
    <LockOpen className="size-4" />
    Leave private item
  </Button>
)}
{isLastPrivateMember && (
  <p className="text-muted-foreground text-xs">
    You're the only one with access. Edit to make it public or delete it.
  </p>
)}
```

### `handleLeave` implementation
```typescript
async function handleLeave() {
  if (!item || !user?.id) return;
  const newIds = (item.privateToUserIds ?? []).filter((id) => id !== user.id);
  try {
    await updateItem(trip.id, item.id, {
      privateToUserIds: newIds.length > 0 ? newIds : null,
    });
    onOpenChange(false);
    toast.success('Left private item');
  } catch {
    toast.error("Couldn't leave item");
  }
}
```

`updateItem` is available from `useTrips()`. `useAuth` from `'@/lib/auth/context'`.

---

## Phase 10 — Expense Sheet (`src/components/trips/expenses/ExpenseSheet.tsx`)

### The behavior
When an expense is created linked to a **private item**, the default share selection should include **only the private item members** (not all trip members). This reflects the solo/small-group nature of private items.

### New prop
Add `privateToUserIds?: string[]` to both `ExpenseSheetProps` and `ExpenseBodyProps`.

Pass it from `ItemDetailSheet` when opening the expense sheet from a private item.

### New initializer
```typescript
function privateSelectionState(
  members: TripMember[],
  privateUserIds: string[],
): SelectionState {
  // Only members whose userId is in the private list
  const privateSet = new Set(privateUserIds);
  const selected = new Set(
    members
      .filter((m) => m.userId && privateSet.has(m.userId))
      .map((m) => m.id),
  );
  const parts: Record<string, number> = {};
  const amounts: Record<string, { value: number | null; locked: boolean }> = {};
  for (const m of members) {
    parts[m.id] = 1;
    amounts[m.id] = { value: null, locked: false };
  }
  return { selected, parts, amounts };
}
```

### Wire it into state initialization
```typescript
const [selection, setSelection] = useState<SelectionState>(() => {
  if (expense) return hydrateFromExpense(expense, members);
  if (privateToUserIds && privateToUserIds.length > 0)
    return privateSelectionState(members, privateToUserIds);
  return defaultSelectionState(members);
});
```

### How `ItemDetailSheet` passes the prop
In `ItemDetailSheet`, when the "Add expense" button is pressed for a private item:

```tsx
<ExpenseSheet
  trip={trip}
  open={expenseOpen}
  onOpenChange={setExpenseOpen}
  itemId={item.id}
  privateToUserIds={item.privateToUserIds}  // NEW
  defaultCategory={kindToExpenseCategory(item.kind)}
  defaultTitle={item.title}
  lockTitle
/>
```

---

## Edge Cases & Decisions (already settled — do not re-litigate)

| Scenario | Decision |
|---|---|
| Public item made private — item disappears for others | Accepted. Show one `window.confirm` in the editor. |
| Private item made public | Fine, no confirmation needed. |
| Public transport/lodging item made private | Other members lose city detection / lodging strip. Accepted — power user action. |
| Item has linked expenses and goes private | Expenses stay fully public to all members; item ID link just shows blank for non-members. This is correct. |
| Member removed from trip while in a private item's list | Their UID stays in the array but is unreachable via auth. Item may become unseeable if they were the last member. Acceptable for MVP. |
| Last private member tries to leave | Block the leave action; show message: "Edit to make it public or delete it." |
| Non-app members (no user_id) | Cannot be added to private items. Show only account members in the picker. No error, just hide them from the picker. |
| Another member tries to read/write a private item they are not in | Blocked at RLS — returns empty result or 403. No special UI handling needed; the item is simply absent from their `trip.items`. |
| Empty `privateToUserIds` array written to DB | API and mapper both coerce `[]` → `null`. DB should never have an empty array. |

---

## Implementation Order

Follow this order strictly — each phase depends on the previous one being correct.

1. **Apply the SQL migration** — test in Supabase dashboard that the column exists and policies are correct before writing any code.
2. **Phase 1 — types.ts** — type safety first.
3. **Phase 2 — mappers.ts** — DB ↔ domain layer.
4. **Phase 3 — schemas.ts** — API validation.
5. **Phase 4 — supabaseRepository.ts** — extend `ITEM_COLUMNS` only; mapper changes handle the rest.
6. **Phase 5 — context.tsx** — `applyItemPatch` update.
7. **Phase 6 — API routes** — add membership validation guard in POST and PATCH handlers.
8. **Phase 7 — ItemEditorSheet** — lock toggle + member picker + save payload.
9. **Phase 8 — TimelineItem** — lock badge.
10. **Phase 9 — ItemDetailSheet** — Leave button + last-member guard.
11. **Phase 10 — ExpenseSheet** — private-aware default share state.

---

## Validation Checklist

After implementation, manually verify all of these with two browser sessions (two different logged-in users who are both members of the same trip):

- [ ] Create a new item as User A — it appears for both A and B (public by default)
- [ ] Edit the item, toggle private, include only User A — item disappears from User B's timeline and map
- [ ] Confirm `window.confirm` fires when making an existing public item private
- [ ] User A sees lock badge on the item; User B does not see the item at all
- [ ] Edit item, add User B to private list — item reappears for User B, still hidden from others
- [ ] User B opens item detail — sees "Leave private item" button
- [ ] User B leaves — item disappears from User B, still visible to User A
- [ ] User A is alone in private item — detail sheet shows "Edit to make it public or delete it", no Leave button
- [ ] User A edits, clears privacy (toggle off) — item becomes public again for everyone
- [ ] Create expense from a private item — only private members are checked in the split by default
- [ ] Non-app members (no account) are absent from the private member picker in the editor
- [ ] Deleting a private item works; it is removed from the DB
- [ ] `privateToUserIds` is never written as an empty array to the DB (check via Supabase table view)
