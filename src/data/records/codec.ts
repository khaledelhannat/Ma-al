import { isOneOf } from '../../domain';

/**
 * Persistence-only encodings. IndexedDB cannot index booleans, so flags that
 * need an index are stored as 0/1. These never appear in domain types.
 */
export type Flag = 0 | 1;

export function toFlag(value: boolean): Flag {
  return value ? 1 : 0;
}

export function fromFlag(value: unknown, field: string): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  throw new RangeError(`${field} must be 0 or 1, got: ${String(value)}`);
}

export function requireEnum<const T extends readonly string[]>(
  values: T,
  value: unknown,
  field: string,
): T[number] {
  if (!isOneOf(values, value)) {
    throw new RangeError(`${field} has unexpected value: ${String(value)}`);
  }
  return value;
}

export function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${field} must be a finite number`);
  }
  return value;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${field} must be a string`);
  }
  return value;
}

export function requireDefined<T>(
  value: T | undefined | null,
  field: string,
): T {
  if (value === undefined || value === null) {
    throw new RangeError(`${field} is required`);
  }
  return value;
}

/**
 * Reconstruction drops fields the domain type forbids (`?: never`), so the
 * Step 2 validator could never see them. Reject a stored row that carries
 * such a field instead of silently discarding the evidence of corruption.
 *
 * A forbidden field is rejected whenever the key is an own property of the
 * row, whatever its value (including `null` and `undefined`). There is no
 * null exception here; the one place `null` is legitimate is a required
 * field, see `requireNullField`.
 */
export function forbidFields(
  record: object,
  fields: readonly string[],
  context: string,
): void {
  const present = Object.keys(record).filter((key) => fields.includes(key));
  if (present.length > 0) {
    throw new RangeError(
      `${context} must not have: ${present.join(', ')} (stored on the row)`,
    );
  }
}

/**
 * A field whose persisted form is exactly `null`. The key must be an own
 * property of the row and its value must be `null`: a missing key, an
 * explicit `undefined` and any other value are all corruption. Used for the
 * Transfer Transaction's `categoryId`, which is stored as `null` by design.
 */
export function requireNullField(
  record: object,
  field: string,
  context: string,
): void {
  const value: unknown = Object.entries(record).find(
    ([key]) => key === field,
  )?.[1];
  if (!Object.hasOwn(record, field) || value !== null) {
    throw new RangeError(
      `${context} must store ${field} as null (own property, value null)`,
    );
  }
}

export function requireArray<T>(
  value: readonly T[],
  field: string,
): readonly T[] {
  if (!Array.isArray(value)) {
    throw new RangeError(`${field} must be an array`);
  }
  return value;
}
