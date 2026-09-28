/**
 * Runtime membership check for a closed set of string literals.
 * Lets each enumeration be declared once (as a const tuple) and yield both
 * the union type and a type guard, without type assertions.
 */
export function isOneOf<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return values.some((candidate) => candidate === value);
}
