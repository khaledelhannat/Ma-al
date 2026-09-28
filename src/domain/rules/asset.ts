import { ASSET_TYPES, LIQUIDITIES } from '../entities/asset';
import type { Asset } from '../entities/asset';
import {
  checkDate,
  checkEnum,
  checkId,
  checkKarat,
  checkMoney,
  checkNonBlank,
  checkTimestampPair,
  hasValue,
} from './checks';
import { issue } from './issue';
import type { ValidationIssue } from './issue';

/**
 * Gold-specific data (karat) is required on gold assets and forbidden on
 * every other asset type. openingBalance may be any whole piastre amount.
 */
export function validateAsset(asset: Asset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkId(issues, 'id', asset.id);
  checkNonBlank(issues, 'name', asset.name);
  checkEnum(issues, 'type', ASSET_TYPES, asset.type);
  checkEnum(issues, 'liquidity', LIQUIDITIES, asset.liquidity);
  checkMoney(issues, 'openingBalance', asset.openingBalance);
  checkDate(issues, 'openingBalanceDate', asset.openingBalanceDate);
  checkTimestampPair(issues, asset.createdAt, asset.updatedAt);

  if (asset.type === 'gold') {
    checkKarat(issues, 'karat', asset.karat);
  } else if (hasValue(asset, 'karat')) {
    issues.push(
      issue(
        'GOLD_DATA_ON_NON_GOLD_ASSET',
        'karat',
        'Only a gold asset can have a karat.',
      ),
    );
  }
  return issues;
}
