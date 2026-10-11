import type { ValidationIssue } from '../../domain';

/**
 * Raised when a reconstructed domain object fails its Step 2 intrinsic
 * validator. Carries the original issues; repositories wrap it in a
 * CorruptRecordError (with this error as `cause`), so callers never see a raw
 * `ValidationIssue[]` and never receive an invalid object.
 */
export class RecordValidationError extends Error {
  readonly entity: string;
  readonly issues: readonly ValidationIssue[];
  constructor(entity: string, issues: readonly ValidationIssue[]) {
    const detail = issues
      .map((i) => `${i.path}: ${i.message} [${i.code}]`)
      .join('; ');
    super(`${entity} failed domain validation: ${detail}`);
    this.name = 'RecordValidationError';
    this.entity = entity;
    this.issues = issues;
  }
}

/**
 * Runs an existing Step 2 INTRINSIC validator on a reconstructed object and
 * returns it unchanged when valid. Cross-entity reference rules are never run
 * here: decoding a row must not need other rows.
 */
export function assertValid<T>(
  entity: string,
  value: T,
  validate: (value: T) => ValidationIssue[],
): T {
  const issues = validate(value);
  if (issues.length > 0) throw new RecordValidationError(entity, issues);
  return value;
}
