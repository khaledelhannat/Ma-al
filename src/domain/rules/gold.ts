import type { GoldHoldingRecord, GoldPriceRecord } from '../entities/gold';
import { compareCalendarDates } from '../values';
import {
  checkDate,
  checkId,
  checkInterval,
  checkKarat,
  checkTimestamp,
} from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';
import type { AssetLookup } from './references';
import { isMoney } from '../values';

/** Gold price must be a whole number of piastres per gram, strictly greater than zero. */
export function validateGoldPriceRecord(
  record: GoldPriceRecord,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', record.id);
  checkKarat(issues, 'karat', record.karat);
  if (!isMoney(record.pricePerGram) || record.pricePerGram <= 0) {
    issues.push(
      issue(
        'INVALID_GOLD_PRICE',
        'pricePerGram',
        'pricePerGram must be a whole number of piastres greater than zero.',
      ),
    );
  }
  checkDate(issues, 'effectiveDate', record.effectiveDate);
  checkTimestamp(issues, 'createdAt', record.createdAt);
  return issues;
}

/** Weight must be a finite number of grams and not negative (zero allowed). */
export function validateGoldHoldingRecord(
  record: GoldHoldingRecord,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', record.id);
  checkId(issues, 'assetId', record.assetId);
  if (
    typeof record.weightGrams !== 'number' ||
    !Number.isFinite(record.weightGrams) ||
    record.weightGrams < 0
  ) {
    issues.push(
      issue(
        'INVALID_GOLD_WEIGHT',
        'weightGrams',
        'weightGrams must be a finite number and not negative.',
      ),
    );
  }
  checkInterval(issues, record.startDate, record.endDate);
  checkTimestamp(issues, 'createdAt', record.createdAt);
  return issues;
}

/** Holdings may only belong to an existing gold asset. */
export function validateGoldHoldingReferences(
  record: GoldHoldingRecord,
  refs: { readonly assets: AssetLookup },
): ValidationIssue[] {
  const asset = refs.assets(record.assetId);
  if (!asset) {
    return [issue('ASSET_NOT_FOUND', 'assetId', 'Asset does not exist.')];
  }
  if (asset.type !== 'gold') {
    return [
      issue(
        'ASSET_NOT_GOLD',
        'assetId',
        'Gold holdings can only belong to a gold asset.',
      ),
    ];
  }
  return [];
}

/**
 * Collection rule: for one asset, holding intervals must not overlap, so
 * an as-of-date lookup always finds at most one record. Because each
 * interval is [startDate, endDate), a record closed on the day its
 * successor starts does not overlap it.
 */
export function validateGoldHoldingHistory(
  records: readonly GoldHoldingRecord[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byAsset = new Map<string, GoldHoldingRecord[]>();
  for (const record of records) {
    const group = byAsset.get(record.assetId) ?? [];
    group.push(record);
    byAsset.set(record.assetId, group);
  }
  for (const group of byAsset.values()) {
    const ordered = [...group].sort((a, b) =>
      compareCalendarDates(a.startDate, b.startDate),
    );
    for (let i = 1; i < ordered.length; i += 1) {
      const previous = ordered[i - 1];
      const current = ordered[i];
      if (!previous || !current) continue;
      const overlaps =
        previous.endDate === undefined ||
        compareCalendarDates(previous.endDate, current.startDate) > 0;
      if (overlaps) {
        issues.push(
          issue(
            'OVERLAPPING_GOLD_HOLDINGS',
            'startDate',
            `Gold holding ${current.id} overlaps holding ${previous.id} for the same asset.`,
          ),
        );
      }
    }
  }
  return issues;
}
