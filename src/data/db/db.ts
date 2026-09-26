import Dexie from 'dexie';

/**
 * Persistence boundary for the application.
 *
 * This is intentionally a placeholder. Step 1 only establishes that
 * IndexedDB access goes through Dexie and lives in `src/data/db`, not
 * scattered across the UI.
 *
 * The real financial schema (transactions, assets, allocations, goals,
 * budgets, wishlist items, monthly snapshots, recurring rules, settings,
 * gold price/holding history, etc.) is defined in Step 3 — Data Model +
 * Local Persistence, per the Step 0 specification. Do not add object
 * stores here until that step.
 */
export class AppDatabase extends Dexie {
  constructor() {
    super('personal-financial-intelligence-system');

    // No stores are versioned yet. `version(1)` is reserved for the
    // Step 3 schema so the very first released schema starts at v1
    // rather than an accidental placeholder version.
  }
}

export const db = new AppDatabase();
