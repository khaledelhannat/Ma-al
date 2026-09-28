/** MVP is single-currency; the base currency is fixed to EGP. */
export type BaseCurrency = 'EGP';

export const START_PAGES = [
  'dashboard',
  'transactions',
  'assets',
  'goals',
  'wishlist',
  'budgets',
] as const;
export type StartPage = (typeof START_PAGES)[number];

/**
 * Step 0 says only "default views" without enumerating them; the smallest
 * meaningful preference is which page the app opens on.
 */
export interface DefaultViews {
  readonly startPage: StartPage;
}

/**
 * Exportable, non-AI application preferences only. Settings does NOT own
 * categories, and the Gemini API key / AI configuration must never appear
 * here (they are stored and exported separately).
 */
export interface Settings {
  readonly baseCurrency: BaseCurrency;
  readonly defaultViews: DefaultViews;
}

export function createDefaultSettings(): Settings {
  return { baseCurrency: 'EGP', defaultViews: { startPage: 'dashboard' } };
}
