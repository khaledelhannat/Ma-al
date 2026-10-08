# Architecture — Steps 1 to 3

This document explains the technical boundaries established in Step 1, the
canonical domain contracts added in Step 2, and the persistence layer added
in Step 3. It
does **not** duplicate the product/domain specification — the Step 0
specification remains the single source of truth for financial concepts,
field definitions, and business rules.

## Conceptual data flow (target, not yet built)

```text
Local Data
    ↓
Financial Engine
    ↓
Calculated Metrics / Business Rules
    ↓
Application UI / Dashboard

Optional:

Calculated Metrics / Business Rules
    ↓
AI Context Builder
    ↓
Gemini
    ↓
Natural-language analysis
```

The Financial Engine is deterministic and local. Gemini, when it exists,
only reads already-calculated metrics — it is never the source of truth
and the app must work without it.

## Layer boundaries

| Layer       | Location                                         | Responsibility                                                                         | Step 1 status                                                    |
| ----------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| UI          | `src/app`, `src/components/ui`, `src/features/*` | React components, layout, navigation, presentation                                     | Implemented (shell + primitives + placeholder pages)             |
| Domain      | `src/domain/*`                                   | Financial entities, primitive value types, validation rules (Financial Engine to come) | Step 2: contracts + validation implemented; calculations not yet |
| Persistence | `src/data/{db,records,repositories}`             | IndexedDB access via Dexie, storage mapping, repository pattern                        | Step 3: schema v1, mappers, repositories implemented             |
| AI          | `src/services/ai`                                | Future Gemini integration, AI context building                                         | Intentionally empty                                              |

**Rule:** the UI never talks to Dexie directly. It goes through
repositories (`src/data/repositories`), which accept and return domain
entities. ESLint enforces this (see "Dependency direction" below). Features never import domain calculation logic
directly into components beyond calling exposed functions — but since no
domain logic exists yet, this is a rule for future steps to honor rather
than something Step 1 can demonstrate.

## Persistence layer (Step 3)

```text
UI / Application
       |
       v
Repositories  (src/data/repositories)   domain objects in / out
       |
       v
Storage records + mappers (src/data/records)   domain <-> IndexedDB shape
       |
       v
Dexie / IndexedDB  (src/data/db)
```

The domain never imports from `src/data`; `src/data` imports the domain.

### Dependency direction (enforced by ESLint)

- `src/domain` may not import React, Dexie, the router, or any of
  `app/components/features/data/services` (Step 2 rule, unchanged).
- `src/data` may not import React, the router, or `app/components/features/services`.
- `app`, `components`, `features`, `services`, `lib`, `types` may not import
  `dexie`, `data/db` or `data/records`. They use the repositories.

### The database (`src/data/db`)

`AppDatabase` is the only Dexie definition; the app uses one shared `db`
instance (`new Dexie` appears nowhere else). Repositories receive it as a
parameter (`createRepositories(db)`), which is also how tests inject an
isolated in-memory database.

| Table                | Primary key | Indexes (purpose)                                                                                                       |
| -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `transactions`       | `id`        | `date`; `[type+date]`; `[categoryId+date]`; `*assetIds` (multi-entry); `[recurringRuleId+date]`; `sourceWishlistItemId` |
| `categories`         | `id`        | `type`; `parentId`; `archived`                                                                                          |
| `assets`             | `id`        | `type`; `liquidity`                                                                                                     |
| `goldPriceRecords`   | `id`        | `[karat+effectiveDate]`; `effectiveDate`                                                                                |
| `goldHoldingRecords` | `id`        | `[assetId+startDate]`; `startDate`                                                                                      |
| `allocations`        | `id`        | `[assetId+startDate]`; `[goalId+startDate]`; `startDate`                                                                |
| `goals`              | `id`        | `deadline`; `priority`                                                                                                  |
| `wishlistItems`      | `id`        | `status`; `targetDate`; `priority`; `categoryId`                                                                        |
| `budgets`            | `id`        | **`&[categoryId+month]` (unique)**; `month`                                                                             |
| `monthlySnapshots`   | `id`        | **`&month` (unique)**; `dirty`                                                                                          |
| `recurringRules`     | `id`        | `active`; `[active+nextRunDate]`                                                                                        |
| `settings`           | `key`       | — (singleton, stored under key `app`)                                                                                   |

**Uniqueness.** Only the two constraints Step 0 states are structural:
one Budget per `categoryId + month`, one MonthlySnapshot per `month`. A
duplicate write fails with `ConstraintViolationError`; the domain `id` is kept
as the primary key. Nothing else is unique: gold prices may repeat for a
karat/date (a correction), wishlist-to-transaction is not unique-indexed, and
gold-holding non-overlap stays a domain collection rule.

**IndexedDB facts that drive the design.**

- Records whose indexed value is absent or `null` are left out of that index,
  so optional fields (`goalId`, `recurringRuleId`, ...) produce small sparse
  indexes, and transfers (stored `categoryId: null`) never appear in category
  queries.
- Booleans are not valid keys, so `archived`, `active` and `dirty` are stored
  as `0 | 1` in the record (the domain keeps `boolean`).
- `endDate` is **not** indexed: it is absent on open records. As-of-date
  queries read `startDate <= date` and then apply the domain's `isActiveOn`, so
  the `[startDate, endDate)` rule has exactly one definition.
- A transfer touches two assets, so each transaction record carries a
  persistence-only `assetIds` array (derived on write, dropped on read) with a
  multi-entry index; "everything that touched asset X" is one query.

### Schema versioning

`SCHEMA_VERSION = 1` and `SCHEMA_V1` live in `db/schema.ts`; `db.ts` declares
`version(1).stores(SCHEMA_V1)`. This is the first released schema, so no
migrations exist. To change the schema later: never edit a released version;
add `version(n+1).stores({...changed stores only})` after it, with an
`.upgrade(tx => ...)` callback if existing rows must be rewritten, and add a
test that opens a database seeded at the previous version. Because snapshots
are a rebuildable cache, a change to what they contain only needs them marked
dirty, not migrated.

### Storage records and mapping (`src/data/records`)

Each entity has a `*Record` type (plain strings and numbers) plus
`to*Record` / `from*Record` functions. Repositories never hand Dexie rows to
callers.

| Domain type           | Stored as                     | Mapping back                                              |
| --------------------- | ----------------------------- | --------------------------------------------------------- |
| `Money`               | the same integer piastres     | `asMoney` (rejects non-safe-integers)                     |
| `CalendarDate`        | the same `YYYY-MM-DD` string  | `asCalendarDate` (rejects impossible dates)               |
| `Month`               | the same `YYYY-MM` string     | `asMonth`                                                 |
| `Timestamp`           | the same canonical ISO string | `asTimestamp`                                             |
| Branded ids           | the underlying UUID string    | `asId<'Entity'>` (validates)                              |
| Unions                | discriminated by `type`       | explicit per-variant construction, no casts               |
| Optional field        | key omitted when absent       | omitted again                                             |
| Transfer `categoryId` | `null`                        | field absent (as Step 2's `TransferTransaction` declares) |
| Booleans (indexed)    | `0` / `1`                     | checked, then `boolean`                                   |

No `any` and no `as DomainType` casts are used to cross the boundary: values
are re-validated by the Step 2 constructors on every read. A record that
cannot be reconstructed raises `CorruptRecordError` (entity, key, original
cause) instead of returning a half-valid object.

### Repositories (`src/data/repositories`)

One repository per entity family, each returning domain objects. They differ
on purpose:

- **Categories** have no delete. `deleteIfUnreferenced` removes a category only
  when no Transaction, Budget, WishlistItem, RecurringRule template or child
  category refers to it (Step 0 rule 5, stricter on recurring rules because a
  rule would later generate transactions with a dangling category). Archiving
  is a normal `put`.
- **Assets** and **Goals** also only offer a guarded `deleteIfUnreferenced`:
  Step 0 gives them no archive state, and deleting an asset with ledger
  history (or a goal with allocations) would break every derived figure.
- **WishlistItems** and **RecurringRules** are freely deletable and never
  cascade: purchase and generated transactions keep their back-references
  permanently (Step 0 rule 6).
- **Budgets** and **MonthlySnapshots** add `upsertForCategoryMonth` /
  `upsertForMonth`: update in place keeping the stored id, never overwrite an
  unrelated record.
- **Allocations** and **GoldHoldings** are time-aware: `listActiveOn(date)` /
  `findActiveOn` use the `[startDate, endDate)` rule; `listOpen` returns
  records with no `endDate`.
- **GoldPrices** offer `findLatestOnOrBefore(karat, date)`. Same-day ties
  resolve to the latest `createdAt`, then greatest id (Step 0 does not define
  this; see "Decisions future steps need to know").
- **Settings** is a singleton: `get()` returns stored settings or the domain
  defaults; the Gemini key/AI config is never stored here.
- Bulk `addMany` / `putMany` run in one IndexedDB transaction: all or nothing.

Errors are typed (`ConstraintViolationError`, `ReferencedRecordError`,
`CorruptRecordError`), keep the original error as `cause`, and unknown
failures pass through unchanged.

### Persistence tests

`fake-indexeddb` (dev dependency; jsdom has no IndexedDB) provides each test
its own in-memory database through `createTestRepositories()`, with no global
state to clean up. Coverage: schema/indexes/unique flags, mapping round trips,
every repository, both uniqueness constraints (including a mutation check that
they fail when the unique flag is removed), atomic bulk writes, guarded
deletes, and boundary dates for ranges and `[startDate, endDate)`.

### Decisions future steps need to know

- `Settings` storage key is the constant `app`.
- `listOpen` means "no endDate". An allocation with a future `startDate` and
  no `endDate` is still returned; the engine decides what "current" means.
- Dirty-snapshot cascading (Step 0 section 7) is **not** encoded in
  persistence. It is business logic that can be built from
  `listFromMonth` + `putMany`.
- Gold price tie-break (same karat and date) is a persistence-level
  determinism choice, not a product rule. The engine may refine it.
- Table scans are used for small, bounded tables (`listOpen` without filters,
  recurring-rule reference checks). Revisit if real data volumes demand it.
- Export/import remains deferred to its own step; the repositories' `list`
  methods are the intended read surface for it.

## Domain contracts (Step 2)

`src/domain` is now the canonical TypeScript model of the Step 0 entities.
It answers "what exactly is each financial object in code, and what must
always be true of it?" It does **not** calculate anything yet: net worth,
spendable money, goal progress, budget variance and snapshot rebuilds belong
to the Financial Engine (later steps), which will operate on these types.

```text
src/domain/
  values/    Primitive value types: Id, Money, CalendarDate, Month, Timestamp
  entities/  One file per Step 0 entity (pure types + enumerations)
  rules/     Pure validation: intrinsic, reference, and collection rules
  test-support/  Test-only builders (not imported by application code)
```

### Independence

The domain imports nothing from React, Dexie, the router, or any other
layer. This is enforced by an ESLint `no-restricted-imports` rule scoped to
`src/domain/**`, not just by convention. Step 3 will _map_ these types into
IndexedDB; the domain never learns that Dexie exists. Cross-entity rules
receive plain lookup functions (`AssetLookup`, `CategoryLookup`,
`GoalLookup`) instead of a database.

### Primitive conventions

| Concept      | Representation                                       | Example                    |
| ------------ | ---------------------------------------------------- | -------------------------- |
| Id           | UUID string, branded per entity (`Id<'Asset'>`)      | `0b1c…-4f3a-…`             |
| Money        | Integer piastres (`number`, safe integer), branded   | 1,250.00 EGP → `125_000`   |
| Calendar day | `YYYY-MM-DD` string, no time zone, real dates only   | `2026-09-10`               |
| Month        | `YYYY-MM` string                                     | `2026-09`                  |
| Timestamp    | Canonical UTC ISO 8601 with milliseconds             | `2026-09-10T12:00:00.000Z` |
| Gold weight  | `number` grams (fractional allowed, ≥ 0)             | `12.5`                     |
| Gold price   | `Money` per gram (piastres/gram, > 0)                | `450_050` = 4,500.50 EGP/g |
| Ratios       | plain `number`, only in derived output (savingsRate) | `0.4`, or `null`           |

**Money.** Integers make addition and subtraction exact, serialize losslessly
to JSON (export/import) and IndexedDB, and stop floating-point drift from
entering the deterministic engine. `number` rather than `bigint` because
`bigint` is not JSON-serializable; the safe-integer ceiling is roughly
9×10¹³ EGP. `Money` can be negative in the type (savings can be negative);
"must be positive" is a validation rule per field (transaction amount, goal
target, allocation, budget), not a property of the type.

**Dates.** Fixed-width, zero-padded formats mean plain string comparison is
chronological comparison, so the domain needs no `Date` objects and no time
zone logic for calendar days. Timestamps are always the exact output of
`toISOString()`, so they are also comparable as strings and byte-stable on
export. `isCalendarDate` validates real calendar dates (leap years included),
not just the pattern.

**Ids.** `newId()` uses `crypto.getRandomValues`, not `crypto.randomUUID`,
because `randomUUID` only exists in secure contexts; a local-first app
opened over plain `http` on a LAN address would otherwise break.

### Making invalid states hard to represent

- `Transaction` is a discriminated union (`income | expense | transfer`).
  Fields that belong to the other variants are declared `?: never`, so
  `{ type: 'transfer', categoryId, assetId }` or an expense carrying
  `sourceAssetId` **does not compile**. The `?: never` guards also catch the
  non-literal case that plain excess-property checking misses.
- `Asset` is a union of `GoldAsset` (requires `karat`) and `NonGoldAsset`
  (forbids it). There is no mutable balance field.
- `RecurringRule.transactionTemplate` is built with `Pick<>` from the
  Transaction variants, so a template can never permit what a Transaction
  forbids.
- Ids and `Money` are branded: an `AssetId` cannot be passed where a
  `CategoryId` is expected, and a bare `number` is not `Money`.
- **Stored vs derived.** `Goal` has no `fundedAmount`, progress, pace, or
  projection; `Asset` has no current value; `Allocation` history is
  close-and-open. `GoalStatus` exists only as a value type for derived
  output.

`entities/type-safety.test.ts` proves these with `@ts-expect-error`: if a
type is later loosened, the directive becomes unused and `typecheck` fails.

### Validation philosophy

Validators are pure functions returning `ValidationIssue[]` (stable `code`,
field `path`, English `message`); an empty array means valid. There are three
levels:

1. **Intrinsic** (`validateTransaction`, `validateAsset`, …): one record,
   no lookups. Runtime checks repeat what the types promise, deliberately,
   because imported/stored data is untrusted and the compiler cannot help
   there.
2. **References** (`validate*References`): needs other records, supplied as
   lookup functions. E.g. category type must match transaction type; gold
   holdings must belong to a gold asset; budgets need an expense category.
3. **Collections** (`validateBudgetUniqueness`,
   `validateGoldHoldingHistory`, `validateCategoryHierarchy`): rules across
   records, e.g. one budget per category per month, non-overlapping gold
   holdings per asset, and no cycles in the category parent hierarchy.

`isActiveOn(interval, date)` is the single definition of the
`[startDate, endDate)` rule: active on `startDate`, inactive on `endDate`.

Validation stays light on purpose: it enforces invariants, not workflow
(e.g. it does not check spendable balance for a transfer; that is engine
territory).

### Spec gaps resolved with the smallest reasonable choice

Step 0 names these but does not define their values. Each is a small closed
set that is cheap to extend later (adding a value is easy; removing one after
data exists needs a migration), so the smaller set was chosen.

| Item                         | Choice                                   | Note                                                      |
| ---------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `paymentMethod`              | Free text, non-blank when present        | Required on income/expense, optional on transfer          |
| Template `paymentMethod`     | Added to `RecurringRule` template        | A concrete income/expense needs one; Step 0 omits it      |
| `Priority`                   | `low \| medium \| high`                  | Goal and WishlistItem                                     |
| `RecurrenceFrequency`        | `weekly \| monthly \| yearly`            | Step 0's only example is monthly                          |
| `Settings.defaultViews`      | `{ startPage }`                          | Smallest meaningful default view                          |
| `MonthlySnapshot.data`       | The fields Step 0 lists                  | Step 0 says "etc."; a cache, so it can grow (mark dirty)  |
| Gold `karat`                 | Integer 1–24                             | Not restricted to 18/21/24                                |
| Category `null` for transfer | Field is absent on `TransferTransaction` | Step 3 maps absent ↔ `null`; the validator accepts `null` |

## Routing

Routes are defined in `src/app/routes/routes.tsx` and derived from a
single navigation source of truth (`src/app/navigation.ts`) shared with
the sidebar, so the nav and the route table cannot drift apart.
Dashboard (`/dashboard`) is the default route; unknown paths redirect to
it.

## Styling foundation

All colors, spacing, typography, radii, and shadows are defined once as
CSS custom properties in `src/styles/tokens.css`. Component styles
(CSS Modules, one file per primitive) reference these tokens rather than
hardcoding values, so the visual language can be refined later without
hunting through every component.

The UI primitives in `src/components/ui` (`Button`, `Input`, `Select`,
`Card`, `Badge`, `Dialog`, `EmptyState`, `PageContainer`) are intentionally
minimal — just enough for consistent placeholder pages and future forms,
not a full design system.

## State management

Step 1 uses only local React state (e.g. the sidebar's open/closed state
on narrow viewports). No global state library is introduced. Once the
Financial Engine and persistence layer exist, this should be revisited —
likely a simple context/selector approach or a lightweight state library
once there's real, shared financial state to manage. That decision is
deferred, not made here.

## Testing

Vitest is configured with a `jsdom` environment and Testing Library. A
single trivial test (`src/lib/utils/cn.test.ts`) proves the test runner,
environment, and jest-dom matchers all work end-to-end. No financial
logic exists yet, so no financial tests are written — those arrive with
the Financial Engine in later steps.

## Known limitations / things to revisit

- **State management** for real financial data is deferred; revisit once
  the domain layer exists.
- **Design system** is minimal on purpose. Expect to add more primitives
  (e.g. Tabs, Table, Tooltip) as real features are built, rather than
  front-loading them now.
- **Bundle size** — the production build is a single ~263 KB JS chunk.
  Not a problem at Step 1's scope, but worth splitting by route once
  features have real weight.

### Carried into Step 4 (Financial Engine)

- **Gold valuation rounding.** Value = `weightGrams × pricePerGram`, where
  weight is fractional and price is integer piastres/gram. The engine must
  define one deterministic rounding rule (e.g. round half up to the nearest
  piastre) so gold value is reproducible.
- `openingBalance`/`openingBalanceDate` are required on gold assets by
  Step 0's uniform Asset shape, but gold value comes from holdings × price;
  the engine must ignore them for gold.
- `savingsRate` and `progressRatio` are floating-point ratios, which is
  acceptable only because they are derived, never summed back into money.
