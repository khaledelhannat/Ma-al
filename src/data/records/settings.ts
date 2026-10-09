import { START_PAGES } from '../../domain';
import { validateSettings } from '../../domain';
import type { Settings } from '../../domain';
import { requireEnum } from './codec';
import { assertValid } from './validate';

/** Settings is a singleton with no id in the domain; stored under one key. */
export const SETTINGS_KEY = 'app';

export interface SettingsRecord {
  key: typeof SETTINGS_KEY;
  baseCurrency: string;
  defaultViews: { startPage: string };
}

export function toSettingsRecord(settings: Settings): SettingsRecord {
  return {
    key: SETTINGS_KEY,
    baseCurrency: settings.baseCurrency,
    defaultViews: { startPage: settings.defaultViews.startPage },
  };
}

export function fromSettingsRecord(record: SettingsRecord): Settings {
  const value: Settings = {
    baseCurrency: requireEnum(
      ['EGP'] as const,
      record.baseCurrency,
      'baseCurrency',
    ),
    defaultViews: {
      startPage: requireEnum(
        START_PAGES,
        record.defaultViews.startPage,
        'defaultViews.startPage',
      ),
    },
  };
  return assertValid('Settings', value, validateSettings);
}
