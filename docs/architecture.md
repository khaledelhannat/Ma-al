# Architecture — Step 1

This document explains the technical boundaries established in Step 1. It
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

| Layer       | Location                                         | Responsibility                                                | Step 1 status                                        |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------- |
| UI          | `src/app`, `src/components/ui`, `src/features/*` | React components, layout, navigation, presentation            | Implemented (shell + primitives + placeholder pages) |
| Domain      | `src/domain/*`                                   | Financial entities, calculations, rules, the Financial Engine | Intentionally empty                                  |
| Persistence | `src/data/db`, `src/data/repositories`           | IndexedDB access via Dexie, repository pattern                | Boundary only, no schema                             |
| AI          | `src/services/ai`                                | Future Gemini integration, AI context building                | Intentionally empty                                  |

**Rule:** the UI never talks to Dexie directly. It goes through
repositories (`src/data/repositories`), which will wrap the domain
entities once they exist. Features never import domain calculation logic
directly into components beyond calling exposed functions — but since no
domain logic exists yet, this is a rule for future steps to honor rather
than something Step 1 can demonstrate.

## Why the persistence layer has no schema yet

`src/data/db/db.ts` defines a Dexie subclass with **zero versioned
stores**. This is deliberate: the Step 0 entities (Transaction, Category,
Asset, GoldPriceRecord, GoldHoldingRecord, Allocation, Goal,
WishlistItem, Budget, MonthlySnapshot, RecurringRule, Settings) have real
field definitions and relationships that belong to **Step 3 — Data Model

- Local Persistence**. Defining a placeholder schema now would mean
  either guessing at fields (risking contradiction with Step 0) or
  building throwaway migrations. `version(1)` is reserved for the real
  schema.

## Why the domain layer is empty

Per the Step 0 specification, financial calculations (net worth,
spendable money, goal progress, budget rollups, etc.) must be
deterministic and are the responsibility of the Financial Engine. None
of that logic exists yet. Creating placeholder types or fake
calculations now would risk diverging from the real definitions in Step
0, so `src/domain/*` currently only contains a README describing what
will live there.

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

## Known limitations / things to revisit before Step 2

- **State management** for real financial data is deferred; revisit once
  the domain layer exists.
- **Dexie version 1** is reserved but not yet defined — Step 3 needs to
  design the actual schema against the Step 0 spec, including how
  historical/time-aware records (allocations, gold prices, gold
  holdings) are modeled.
- **Design system** is minimal on purpose. Expect to add more primitives
  (e.g. Tabs, Table, Tooltip) as real features are built, rather than
  front-loading them now.
- **Bundle size** — the production build is a single ~263 KB JS chunk.
  Not a problem at Step 1's scope, but worth splitting by route once
  features have real weight.
