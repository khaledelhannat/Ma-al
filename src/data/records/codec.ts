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
 * `null` counts as absent (transfers store `categoryId: null`).
 */
export function forbidFields(
  record: object,
  fields: readonly string[],
  context: string,
): void {
  const present = Object.entries(record)
    .filter(([key, value]) => fields.includes(key) && value != null)
    .map(([key]) => key);
  if (present.length > 0) {
    throw new RangeError(
      `${context} must not have: ${present.join(', ')} (stored on the row)`,
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
