# Domain

This is the future home of the deterministic **Financial Engine**: entities,
calculations, and business rules, as defined by the Step 0 specification.

- `entities/` — Transaction, Category, Asset, GoldPriceRecord,
  GoldHoldingRecord, Allocation, Goal, WishlistItem, Budget,
  MonthlySnapshot, RecurringRule, Settings, etc.
- `calculations/` — net worth, spendable money, goal progress/funding,
  budget rollups, and other derived financial metrics.
- `rules/` — business rules such as transfer handling, historical
  allocation/gold-price time-awareness, snapshot dirtying, and recurring
  rule backfill behavior.
- `financial/` — the Financial Engine itself, composing the above.

None of this is implemented in Step 1. It is intentionally empty so the
boundary exists without fake or placeholder domain types. Real
implementation begins in **Step 2** and **Step 3**, per the Step 0
specification, which remains the source of truth for exact field
definitions and business rules.
