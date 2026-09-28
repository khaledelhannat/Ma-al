declare const brandSymbol: unique symbol;

/**
 * Nominal ("branded") typing. A `Brand<string, 'X'>` is a string at runtime
 * but cannot be mixed up with other strings or other brands at compile time,
 * e.g. an AssetId can never be passed where a CategoryId is expected.
 */
export type Brand<Base, Name extends string> = Base & {
  readonly [brandSymbol]: Name;
};
