import { createDefaultSettings } from '../../domain';
import type { Settings } from '../../domain';
import type { AppDatabase } from '../db';
import { CorruptRecordError, guard } from '../errors';
import { SETTINGS_KEY, fromSettingsRecord, toSettingsRecord } from '../records';

/**
 * Single-user application preferences, stored under one fixed key. Contains
 * no categories and never the Gemini API key (kept outside the financial data).
 */
export interface SettingsRepository {
  /** Stored settings, or the domain defaults when nothing was saved yet. */
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

export function createSettingsRepository(db: AppDatabase): SettingsRepository {
  const entity = 'Settings';
  return {
    async get() {
      const record = await guard(entity, () => db.settings.get(SETTINGS_KEY));
      if (record === undefined) return createDefaultSettings();
      try {
        return fromSettingsRecord(record);
      } catch (error) {
        throw new CorruptRecordError(entity, SETTINGS_KEY, error);
      }
    },
    async save(settings) {
      await guard(entity, () => db.settings.put(toSettingsRecord(settings)));
    },
  };
}
