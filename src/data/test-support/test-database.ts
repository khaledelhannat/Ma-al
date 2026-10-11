import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { AppDatabase } from '../db';
import { createRepositories } from '../repositories';

let counter = 0;

/**
 * Test-only. A brand-new in-memory IndexedDB per call (its own IDBFactory), so
 * tests are isolated without touching globals or deleting databases.
 */
export function createTestDatabase(): AppDatabase {
  counter += 1;
  return new AppDatabase(`test-db-${counter}`, {
    indexedDB: new IDBFactory(),
    IDBKeyRange,
  });
}

export function createTestRepositories() {
  const db = createTestDatabase();
  return { db, repos: createRepositories(db) };
}
