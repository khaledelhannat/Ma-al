import Dexie from 'dexie';
import type { Table } from 'dexie';
import { ReferencedRecordError } from '../errors';

/** Counts records whose compound index `[prefix+x]` starts with `prefix`. */
export function countByCompoundPrefix<T>(
  table: Table<T, string>,
  index: string,
  prefix: string,
): Promise<number> {
  return table
    .where(index)
    .between([prefix, Dexie.minKey], [prefix, Dexie.maxKey], true, true)
    .count();
}

export interface ReferenceCheck {
  readonly label: string;
  readonly count: () => Promise<number>;
}

/**
 * Throws ReferencedRecordError listing every source that still references the
 * record. Must be called inside the same rw transaction as the delete.
 */
export async function assertUnreferenced(
  entity: string,
  id: string,
  checks: readonly ReferenceCheck[],
): Promise<void> {
  const blockers: string[] = [];
  for (const check of checks) {
    if ((await check.count()) > 0) blockers.push(check.label);
  }
  if (blockers.length > 0)
    throw new ReferencedRecordError(entity, id, blockers);
}
