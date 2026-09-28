import type { Brand } from './brand';

/**
 * Convention: money is an integer count of piastres (minor units of EGP).
 *
 *   1,250.00 EGP  ->  125_000
 *
 * Why integers: addition/subtraction is exact, values serialize losslessly
 * to JSON (export/import) and IndexedDB, and the deterministic Financial
 * Engine never accumulates floating-point drift. `number` is used (not
 * bigint) because bigint is not JSON-serializable; the safe-integer limit
 * (~9.0e15 piastres, ~9.0e13 EGP) is far beyond any personal balance.
 *
 * `Money` may be negative (e.g. savings when expenses exceed income);
 * whether a particular field must be positive is a validation rule, not a
 * property of the type.
 */
export type Money = Brand<number, 'Money'>;

export const PIASTRES_PER_EGP = 100;

export function isMoney(value: unknown): value is Money {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Brands an integer piastre count as Money. Throws if not a safe integer. */
export function asMoney(piastres: number): Money {
  if (!isMoney(piastres)) {
    throw new RangeError(
      `Money must be a safe integer number of piastres, got: ${piastres}`,
    );
  }
  return piastres;
}

export const ZERO_MONEY: Money = asMoney(0);

export function addMoney(a: Money, b: Money): Money {
  return asMoney(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return asMoney(a - b);
}
