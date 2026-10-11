/**
 * Typed persistence errors. Repositories translate low-level IndexedDB/Dexie
 * failures into these so callers can react without knowing Dexie exists.
 * The original error is always preserved as `cause`; nothing is swallowed.
 */
export class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** A unique index or primary key rejected a write (e.g. duplicate Budget). */
export class ConstraintViolationError extends PersistenceError {
  readonly entity: string;
  constructor(entity: string, options?: { cause?: unknown }) {
    super(
      `${entity}: write rejected by a uniqueness constraint (duplicate id or key).`,
      options,
    );
    this.entity = entity;
  }
}

/** A guarded delete was refused because other records still point at it. */
export class ReferencedRecordError extends PersistenceError {
  readonly entity: string;
  readonly id: string;
  readonly referencedBy: readonly string[];
  constructor(entity: string, id: string, referencedBy: readonly string[]) {
    super(
      `${entity} ${id} is still referenced by: ${referencedBy.join(', ')}. ` +
        'Archive or detach it instead of deleting.',
    );
    this.entity = entity;
    this.id = id;
    this.referencedBy = referencedBy;
  }
}

/** A stored record could not be turned back into a valid domain value. */
export class CorruptRecordError extends PersistenceError {
  readonly entity: string;
  readonly key: string;
  constructor(entity: string, key: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Corrupt ${entity} record "${key}": ${detail}`, { cause });
    this.entity = entity;
    this.key = key;
  }
}

function hasName(value: unknown, name: string): boolean {
  return value instanceof Error && value.name === name;
}

function bulkFailures(value: unknown): readonly unknown[] {
  if (
    hasName(value, 'BulkError') &&
    typeof value === 'object' &&
    value !== null &&
    'failures' in value &&
    Array.isArray(value.failures)
  ) {
    return value.failures;
  }
  return [];
}

/** Maps a Dexie/IndexedDB failure to a typed error; unknown errors pass through. */
export function translateError(entity: string, error: unknown): unknown {
  if (error instanceof PersistenceError) return error;
  if (
    hasName(error, 'ConstraintError') ||
    bulkFailures(error).some((failure) => hasName(failure, 'ConstraintError'))
  ) {
    return new ConstraintViolationError(entity, { cause: error });
  }
  return error;
}

export async function guard<T>(
  entity: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw translateError(entity, error);
  }
}
