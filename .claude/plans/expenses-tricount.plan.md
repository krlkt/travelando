# Plan: Tricount-Style Expenses

**Status**: Slice A complete (tsc + lint + 15 vitest tests green). Next session: Slice B (UI + bottom-nav + remove legacy `TripItem.expense` references).
**Complexity**: Large

## Locked Decisions

- New first-class `Expense` entity, **independent** of `TripItem`. User can add expenses without creating a trip item.
- Legacy `TripItem.expense` field is **removed entirely** (type, schema, mapper, UI, demo data). Migration already drops the DB column. User will re-enter data.
- Display currency for reconciliation: **EUR only** (use existing `convertToEur` + `getEurRates`).
- "Settle up" / suggested payments: **deferred**, not in this scope.
- Expense rows do **not** show their own date — the date is the day-group header above the rows.
- Two tabs on the new page: **Expenses** | **Balances**.
- Header card on the page shows: **My Expenses** (current user's share total, EUR) and **Total Expenses** (whole trip total, EUR).

## What's Done

- [x] Google Maps universal-link click feature (separate, unrelated to expenses) — `src/lib/places/maps-link.ts`, `src/components/places/PlaceAddressLink.tsx`, wired into `ItemDetailSheet.tsx` and `FoodWishlist.tsx`. Ship-ready.
- [x] **Migration**: `supabase/migrations/20260530000000_expenses.sql`
  - Creates `public.expenses` (id, trip_id, title, amount numeric(14,2), currency text(3), payer_member_id, spent_on date, mode check ('equally','parts','amounts'), timestamps).
  - Creates `public.expense_shares` (id, expense_id, member_id, value numeric(14,4) nullable, locked boolean, unique(expense_id, member_id)).
  - RLS via `public.can_access_trip(trip_id)` for both tables (mirror pattern from `20260529000000_trip_members.sql`).
  - Drops legacy `public.trip_items.expense` column at the bottom.

## What's Left (Slice A — data layer only, no UI)

- [x] **Types** (`src/lib/trips/types.ts`)
- [x] **Schemas** (`src/lib/trips/schemas.ts`)
- [x] **Mappers** (`src/lib/trips/mappers.ts`)
- [x] **Repository interface** (`src/lib/trips/repository.ts`)
- [x] **In-memory repository** (`src/lib/trips/inMemoryRepository.ts`)
- [x] **Supabase repository** (`src/lib/trips/supabaseRepository.ts`) — best-effort write strategy as planned
- [x] **API routes** (`src/app/api/trips/[id]/expenses/route.ts`, `src/app/api/expenses/[id]/route.ts`)
- [x] **Pure compute** (`src/lib/trips/balances.ts` + `src/lib/trips/balances.test.ts` — 15 tests passing)
- [x] **Verification** — `pnpm tsc --noEmit` clean, `pnpm lint` clean, vitest 15/15 green. `vitest` added as devDep, `pnpm test` script wired.

**Slice B** (separate next session, after Slice A is verified): all UI + bottom-nav + remove legacy `TripItem.expense` references from types/mappers/repos/schemas/context/grouping/UI/demo data.

## Data Model (canonical)

```ts
// src/lib/trips/types.ts — add:
export type ExpenseSplitMode = 'equally' | 'parts' | 'amounts';

export interface ExpenseShare {
  memberId: string;
  // equally: null
  // parts:   integer multiplier (>= 1)
  // amounts: locked amount when locked === true, else null (auto-distributed)
  value: number | null;
  locked: boolean;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;       // 3-letter uppercase
  payerMemberId: string;
  spentOn: string;        // 'YYYY-MM-DD'
  mode: ExpenseSplitMode;
  shares: ExpenseShare[]; // one row per *included* member
}

export type ExpenseDraft = Omit<Expense, 'id'>;
export interface ExpensePatch {
  title?: string;
  amount?: number;
  currency?: string;
  payerMemberId?: string;
  spentOn?: string;
  mode?: ExpenseSplitMode;
  shares?: ExpenseShare[];
}
```

## Split Math (single source of truth — implement in `balances.ts`)

`expandShares(expense): Array<{ memberId, share: number }>`

- **equally**: each selected member gets `amount / count(shares)`.
- **parts**: let `total = sum(share.value)` (all multipliers). Each gets `(share.value / total) * amount`.
- **amounts**:
  - `pinnedTotal = sum(share.value where locked === true)`.
  - `unlocked = shares.filter(s => !s.locked)`.
  - Each locked row gets its `value`.
  - Each unlocked row gets `(amount - pinnedTotal) / unlocked.length`.
  - If `unlocked.length === 0` (every row pinned), the editor must validate `pinnedTotal === amount` (epsilon ≤ 0.005) before save; this function just returns the locked values.

`computeBalances(expenses, members, rates, currentUserId)`:
- For each member: `paid` (sum of `expense.amount` where `payerMemberId === member.id`, converted to EUR) minus `owed` (sum of `expandShares(expense)` where `memberId === member.id`, converted to EUR).
- Net positive = is owed; net negative = owes.
- Track `excluded` set for currencies not in EUR rates (mirror `ExpensesPanel.tsx:33-49`).

`summarizeForUser(balances, currentUserId)`:
- Returns `{ kind: 'owed' | 'owes' | 'settled', amount: number, counterpartyCount: number }` for the Balances tab heading sentence.

## Patterns to Mirror

| Category | Source | What to follow |
|---|---|---|
| Domain shape | `src/lib/trips/types.ts:95-107` (FoodPlace) | Same field-naming style; include `tripId` on entity |
| Zod schema | `src/lib/trips/schemas.ts:95-108` (foodPlaceDraftSchema) | `.partial()` for patch; 3-letter currency regex at `:13-17` |
| Mappers | `src/lib/trips/mappers.ts:182-230` (FoodPlace row↔domain) | Build `rowToExpense` reading `expense_shares` array; `expenseDraftToInsert` returns just the parent row; shares inserted separately |
| Repository interface | `src/lib/trips/repository.ts:30-36` | Add `listExpenses(tripId)`, `addExpense(draft)`, `updateExpense(id, patch)`, `removeExpense(id)` |
| In-memory repo | `src/lib/trips/inMemoryRepository.ts:115-137` (food places) | Same shape — module-level `expenses: Expense[]` array, filter by `tripId` |
| Supabase repo | `src/lib/trips/supabaseRepository.ts:189-233` (food places) | Use `EXPENSE_COLUMNS` + nested select `expense_shares(*)` for `listExpenses`. For `addExpense`/`updateExpense` see "Supabase write strategy" below |
| Demo trip guard | `supabaseRepository.ts:200` | `if (isDemoTrip(draft.tripId)) throw new Error(DEMO_TRIP_PROTECTED_ERROR);` |
| API route (GET/POST) | `src/app/api/trips/[id]/food-places/route.ts` | Same envelope `{ success, data?, error?, details? }`, same auth check, same `validation_failed` shape |
| API route (PATCH/DELETE) | `src/app/api/food-places/[id]/route.ts` | Same shape |
| Auth pattern | `src/app/api/trips/[id]/food-places/route.ts:11-19` | `await supabase.auth.getUser()` → 401 envelope |

## Supabase Write Strategy

PostgREST has no per-request transactions, so the repo does best-effort writes with cleanup on share-insert failure.

**addExpense(draft)**:
1. Insert into `expenses` (no shares yet) → returns `expense.id`.
2. Bulk-insert `expense_shares` rows mapped from `draft.shares`.
3. If step 2 fails, `delete from expenses where id = expense.id` (best-effort) and rethrow.
4. Return `rowToExpense(...)` with the freshly-inserted shares.

**updateExpense(id, patch)**:
1. If non-shares fields change, `update expenses set ... where id = ...`.
2. If `patch.shares` is present, `delete from expense_shares where expense_id = id` then bulk-insert the new set. (Editing a Tricount-style split is a full replacement; keeping diff logic out of scope.)
3. Fetch and return the updated expense with shares.

**removeExpense(id)**:
- `delete from expenses where id = ...`. CASCADE on `expense_shares` removes the children.

## Validation Schemas (key bits)

```ts
const expenseShareSchema = z.object({
  memberId: z.string().min(1),
  value: z.number().nullable(),
  locked: z.boolean(),
});

export const expenseDraftSchema = z.object({
  tripId: z.string().min(1),
  title: z.string().min(1).max(120),
  amount: z.number().positive(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  payerMemberId: z.string().min(1),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(['equally', 'parts', 'amounts']),
  shares: z.array(expenseShareSchema).min(1),
});

export const expensePatchSchema = expenseDraftSchema.partial().omit({ tripId: true });
```

## API Surface

- `GET  /api/trips/[id]/expenses` → list expenses for trip
- `POST /api/trips/[id]/expenses` → create; merges `tripId` from path before parsing (see `food-places/route.ts:59-62`)
- `PATCH /api/expenses/[id]` → update
- `DELETE /api/expenses/[id]` → remove

## Tests for `balances.ts` (must cover)

1. `equally` with 3 selected members → each gets `amount/3`.
2. `equally` with a deselected member → that member's `share` is 0, others split.
3. `parts` 1×/2×/1× → totals = 25%/50%/25% of amount.
4. `amounts` mode:
   - 1 pinned (A=10, total=30, 3 members) → B,C each get 10.
   - 2 pinned (A=10, B=15, total=30) → C gets 5.
   - All pinned and `sum === amount` → returns locked values (validator is happy).
   - All pinned and `sum !== amount` within epsilon 0.005 → `expandShares` still returns; the **editor**, not `expandShares`, is responsible for blocking save with an inline error.
5. Multi-currency balances:
   - One EUR expense + one USD expense with known rate → both contribute to balances.
   - One expense in an unknown currency → that expense is skipped, currency added to an `excluded` set returned alongside balances.
6. `summarizeForUser`:
   - All balances zero → `settled`.
   - Current user net positive → `owed`.
   - Current user net negative → `owes`.

## Risks (still active)

- **Float drift in `amounts` mode**: compare with `Math.abs(sum - amount) < 0.005`; round at save to 2 decimals.
- **RLS regression**: a non-member must get 0 rows for an unrelated trip. Smoke-test before declaring done.
- **`currentUserId ↔ TripMember`**: map by `members.find(m => m.userId === currentUserId)`. If no match, "My Expenses" shows 0 (acceptable for now).

## Validation Commands

```bash
pnpm tsc --noEmit --pretty false
pnpm lint
pnpm test -- src/lib/trips/balances.test.ts
```

## When Slice A Is Done

Update this file's **Status** line, mark the relevant items done, and start a new session for Slice B (UI + nav + legacy cleanup). Slice B's first read should be `src/components/trips/FoodPlaceSheet.tsx` (sheet editor pattern), `src/components/shell/TripBottomNav.tsx`, and `src/lib/trips/grouping.ts` (the per-currency totals that still reference `item.expense` and need a rewrite to read from `expenses[]`).
