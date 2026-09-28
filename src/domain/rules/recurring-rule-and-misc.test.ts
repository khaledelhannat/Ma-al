import { describe, expect, it } from 'vitest';
import {
  asId,
  asMoney,
  createDefaultSettings,
  validateCategory,
  validateCategoryHierarchy,
  validateMonthlySnapshot,
  validateRecurringRule,
  validateRecurringRuleReferences,
  validateSettings,
} from '..';
import type { CategoryId, RecurringRule, Settings } from '..';
import {
  assetLookup,
  buildAsset,
  buildCategory,
  buildRecurringRule,
  buildSnapshot,
  categoryLookup,
  ids,
  untyped,
} from '../test-support/builders';
import { codes } from '../test-support/codes';

const transferTemplate = (extra: object = {}) =>
  buildRecurringRule({
    transactionTemplate: untyped({
      type: 'transfer',
      amount: asMoney(100_000),
      sourceAssetId: ids.bank,
      destinationAssetId: ids.cash,
      description: 'Monthly savings',
      ...extra,
    }),
  });

describe('validateRecurringRule', () => {
  it('accepts an income template and a transfer template', () => {
    expect(validateRecurringRule(buildRecurringRule())).toEqual([]);
    expect(validateRecurringRule(transferTemplate())).toEqual([]);
  });

  it('applies transaction rules to the template, with prefixed paths', () => {
    const rule = buildRecurringRule({
      transactionTemplate: {
        ...buildRecurringRule().transactionTemplate,
        amount: asMoney(0),
      },
    });
    const result = validateRecurringRule(rule);
    expect(codes(result)).toEqual(['AMOUNT_NOT_POSITIVE']);
    expect(result[0]?.path).toBe('transactionTemplate.amount');
  });

  it('rejects a transfer template with a category or identical assets', () => {
    expect(
      codes(validateRecurringRule(transferTemplate({ categoryId: ids.food }))),
    ).toEqual(['TRANSFER_HAS_CATEGORY']);
    expect(
      codes(
        validateRecurringRule(
          transferTemplate({ destinationAssetId: ids.bank }),
        ),
      ),
    ).toEqual(['TRANSFER_SAME_ASSET']);
  });

  it('requires a known frequency and a real next run date', () => {
    const bad = untyped<RecurringRule>({
      ...buildRecurringRule(),
      frequency: 'hourly',
      nextRunDate: '2026-02-30',
    });
    expect(codes(validateRecurringRule(bad))).toEqual([
      'INVALID_ENUM_VALUE',
      'INVALID_DATE',
    ]);
  });

  it('checks the template against real assets and category types', () => {
    const refs = {
      assets: assetLookup(buildAsset()),
      categories: categoryLookup(
        buildCategory({ id: ids.salary, type: 'expense' }),
      ),
    };
    const result = validateRecurringRuleReferences(buildRecurringRule(), refs);
    expect(codes(result)).toEqual(['CATEGORY_TYPE_MISMATCH']);
    expect(result[0]?.path).toBe('transactionTemplate.categoryId');
  });
});

describe('validateCategory', () => {
  it('accepts a valid category, with or without a parent', () => {
    expect(validateCategory(buildCategory())).toEqual([]);
    expect(validateCategory(buildCategory({ parentId: ids.salary }))).toEqual(
      [],
    );
  });

  it('rejects a blank name and a category that is its own parent', () => {
    const bad = buildCategory({ name: ' ', parentId: ids.food });
    expect(codes(validateCategory(bad))).toEqual([
      'BLANK_TEXT',
      'CATEGORY_SELF_PARENT',
    ]);
  });

  it('rejects a type other than income/expense', () => {
    const bad = buildCategory({ type: untyped('transfer') });
    expect(codes(validateCategory(bad))).toEqual(['INVALID_ENUM_VALUE']);
  });
});

describe('validateCategoryHierarchy', () => {
  const catId = (n: number) =>
    asId<'Category'>(`00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
  const [a, b, c, d] = [catId(101), catId(102), catId(103), catId(104)] as [
    CategoryId,
    CategoryId,
    CategoryId,
    CategoryId,
  ];
  const node = (id: CategoryId, parentId?: CategoryId) =>
    buildCategory(parentId === undefined ? { id } : { id, parentId });

  it('accepts an empty collection and a valid parent-child hierarchy', () => {
    expect(validateCategoryHierarchy([])).toEqual([]);
    expect(
      validateCategoryHierarchy([node(a), node(b, a), node(c, b)]),
    ).toEqual([]);
  });

  it('accepts multiple independent trees (a forest)', () => {
    expect(
      validateCategoryHierarchy([node(a), node(b, a), node(c), node(d, c)]),
    ).toEqual([]);
  });

  it('rejects a self-cycle (A -> A)', () => {
    const result = validateCategoryHierarchy([node(a, a)]);
    expect(codes(result)).toEqual(['CATEGORY_CYCLE']);
  });

  it('rejects a two-node cycle (A -> B -> A) on both members', () => {
    const result = validateCategoryHierarchy([node(a, b), node(b, a)]);
    expect(codes(result)).toEqual(['CATEGORY_CYCLE', 'CATEGORY_CYCLE']);
  });

  it('rejects a three-node cycle (A -> B -> C -> A) on all members', () => {
    const result = validateCategoryHierarchy([
      node(a, b),
      node(b, c),
      node(c, a),
    ]);
    expect(codes(result)).toEqual([
      'CATEGORY_CYCLE',
      'CATEGORY_CYCLE',
      'CATEGORY_CYCLE',
    ]);
  });

  it('flags only the categories on the cycle, not those hanging off it', () => {
    // d -> a -> b -> a : d descends from the cycle but is not on it.
    const result = validateCategoryHierarchy([
      node(a, b),
      node(b, a),
      node(d, a),
    ]);
    expect(result).toHaveLength(2);
  });

  it('still accepts valid trees alongside a cycle-free branch, and rejects the cycle', () => {
    const result = validateCategoryHierarchy([
      node(a),
      node(b, a),
      node(c, d),
      node(d, c),
    ]);
    expect(codes(result)).toEqual(['CATEGORY_CYCLE', 'CATEGORY_CYCLE']);
  });

  it('treats a parent missing from the collection as the end of the chain', () => {
    expect(validateCategoryHierarchy([node(b, a)])).toEqual([]);
  });
});

describe('validateMonthlySnapshot', () => {
  it('accepts a valid snapshot, dirty or clean', () => {
    expect(validateMonthlySnapshot(buildSnapshot())).toEqual([]);
    expect(
      validateMonthlySnapshot({ ...buildSnapshot(), dirty: true }),
    ).toEqual([]);
  });

  it('rejects a malformed month', () => {
    const bad = { ...buildSnapshot(), month: untyped<never>('2026-9') };
    expect(codes(validateMonthlySnapshot(bad))).toEqual(['INVALID_MONTH']);
  });
});

describe('validateSettings', () => {
  it('accepts the defaults (EGP, dashboard start page)', () => {
    expect(createDefaultSettings()).toEqual({
      baseCurrency: 'EGP',
      defaultViews: { startPage: 'dashboard' },
    });
    expect(validateSettings(createDefaultSettings())).toEqual([]);
  });

  it('rejects any base currency other than EGP', () => {
    const bad = untyped<Settings>({
      ...createDefaultSettings(),
      baseCurrency: 'USD',
    });
    expect(codes(validateSettings(bad))).toEqual(['INVALID_ENUM_VALUE']);
  });
});
