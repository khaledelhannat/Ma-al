import type { Brand } from './brand';

/**
 * Convention: every entity id is a lowercase-or-uppercase UUID string
 * (8-4-4-4-12 hex). Ids are branded per entity, so `Id<'Asset'>` and
 * `Id<'Category'>` are different types.
 */
export type Id<Entity extends string> = Brand<string, `${Entity}Id`>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isId(value: unknown): value is Id<string> {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Validates and brands an existing string as an id. Throws if malformed. */
export function asId<Entity extends string>(value: string): Id<Entity> {
  if (!isId(value)) {
    throw new RangeError(`Invalid id (expected UUID): ${value}`);
  }
  // isId narrows to Id<string>; re-brand for the requested entity.
  return value as Id<Entity>;
}

/**
 * Generates a new random (v4) UUID id.
 *
 * Uses crypto.getRandomValues rather than crypto.randomUUID because
 * randomUUID only exists in secure contexts (https/localhost); a local-first
 * app opened over plain http on a LAN address would otherwise break.
 * This is the only non-deterministic function in the domain value layer.
 */
export function newId<Entity extends string>(): Id<Entity> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  const uuid = [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
  return asId<Entity>(uuid);
}
