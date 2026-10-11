// @vitest-environment node
import { createTestDatabase } from '../test-support/test-database';
import { SCHEMA_VERSION } from './schema';

function indexes(db: ReturnType<typeof createTestDatabase>, table: string) {
  return db.table(table).schema.indexes.map((i) => ({
    name: i.name,
    unique: !!i.unique,
    multi: !!i.multi,
  }));
}

describe('AppDatabase', () => {
  it('opens at the initial schema version', async () => {
    const db = createTestDatabase();
    await db.open();
    expect(SCHEMA_VERSION).toBe(1);
    expect(db.verno).toBe(1);
    db.close();
  });

  it('has a table for every persistent entity', async () => {
    const db = createTestDatabase();
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      [
        'allocations',
        'assets',
        'budgets',
        'categories',
        'goals',
        'goldHoldingRecords',
        'goldPriceRecords',
        'monthlySnapshots',
        'recurringRules',
        'settings',
        'transactions',
        'wishlistItems',
      ].sort(),
    );
    db.close();
  });

  it('keeps the Gemini key out of the schema', async () => {
    const db = createTestDatabase();
    await db.open();
    expect(db.tables.map((t) => t.name).join(' ')).not.toMatch(/gemini|ai/i);
    db.close();
  });

  it('enforces one budget per category+month with a unique compound index', () => {
    const db = createTestDatabase();
    expect(indexes(db, 'budgets')).toContainEqual({
      name: '[categoryId+month]',
      unique: true,
      multi: false,
    });
  });

  it('enforces one snapshot per month with a unique index', () => {
    const db = createTestDatabase();
    expect(indexes(db, 'monthlySnapshots')).toContainEqual({
      name: 'month',
      unique: true,
      multi: false,
    });
  });

  it('indexes the canonical transaction asset fields, plain and non-unique', () => {
    const db = createTestDatabase();
    const found = indexes(db, 'transactions');
    for (const name of ['assetId', 'sourceAssetId', 'destinationAssetId']) {
      expect(found).toContainEqual({ name, unique: false, multi: false });
    }
  });

  it('has no derived asset index: no multi-entry index on transactions', () => {
    const db = createTestDatabase();
    const found = indexes(db, 'transactions');
    expect(found.map((i) => i.name)).not.toContain('assetIds');
    expect(found.some((i) => i.multi)).toBe(false);
  });

  it('adds no uniqueness the spec does not require', () => {
    const db = createTestDatabase();
    const unique = db.tables.flatMap((t) =>
      t.schema.indexes
        .filter((i) => i.unique)
        .map((i) => `${t.name}.${i.name}`),
    );
    expect(unique.sort()).toEqual([
      'budgets.[categoryId+month]',
      'monthlySnapshots.month',
    ]);
  });

  it('can be imported as the shared singleton without opening IndexedDB', async () => {
    const { db } = await import('./db');
    expect(db.name).toBe('personal-financial-intelligence-system');
  });
});
