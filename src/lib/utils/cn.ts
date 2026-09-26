/**
 * Joins truthy class name fragments with a single space, skipping
 * falsy values. Small utility used across UI primitives.
 */
export function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}
