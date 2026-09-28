# Domain

Canonical, pure TypeScript model of the Step 0 specification. Independent of
React, Dexie and every other layer (enforced by ESLint).

- `values/` — primitive value types and their conventions: `Id`, `Money`
  (integer piastres), `CalendarDate` (`YYYY-MM-DD`), `Month` (`YYYY-MM`),
  `Timestamp` (canonical UTC ISO 8601).
- `entities/` — one file per Step 0 entity: Transaction, Category, Asset,
  GoldPriceRecord, GoldHoldingRecord, Allocation, Goal, WishlistItem, Budget,
  MonthlySnapshot, RecurringRule, Settings.
- `rules/` — pure validation and invariants, plus `isActiveOn` for the
  `[startDate, endDate)` interval.
- `test-support/` — test-only builders; never imported by application code.

`calculations/` and `financial/` are still empty: the Financial Engine
(net worth, spendable money, goal progress, budget variance, snapshots) is a
later step and will operate on these contracts. Do not add derived values to
the entities; stored state and derived state are kept apart on purpose.

See `docs/architecture.md` for conventions, design rationale and the spec
gaps that were resolved. Step 0 remains the source of truth for business
rules.
