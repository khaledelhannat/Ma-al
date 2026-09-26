# Repositories

This directory is where data-access repositories will live once the Step 0
domain entities exist (e.g. `TransactionRepository`, `AssetRepository`,
`GoalRepository`).

Repositories should be the only code that talks to `src/data/db` directly.
UI components and features should never import Dexie or IndexedDB APIs
directly — they should go through a repository.

No repositories are implemented yet. They arrive in **Step 3 — Data Model +
Local Persistence**, once the actual entity schema is defined.
