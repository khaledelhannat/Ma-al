# Repositories

Domain-level data access. Each repository takes the shared `AppDatabase`,
accepts and returns **domain objects** (never Dexie tables, collections or
storage records), and exposes only the operations that make sense for its
entity.

```ts
import { repositories } from '../data';
const sep = await repositories.transactions.listByMonth(month);
```

Rules:

- Only code under `src/data` imports Dexie, `db` or `records` (ESLint enforces
  this for the UI/application folders).
- Repositories are persistence-oriented. They do **not** calculate balances,
  net worth, spendable money, goal progress, budget variance, or snapshots,
  and they do not run workflows (wishlist purchase, recurring generation,
  allocation moves, dirty propagation). That is Financial Engine / later work.
- Failures surface as typed errors from `../errors`
  (`ConstraintViolationError`, `ReferencedRecordError`, `CorruptRecordError`)
  with the original error kept as `cause`.
- Tests use `createTestRepositories()` from `../test-support`, which gives
  every test its own in-memory IndexedDB.
