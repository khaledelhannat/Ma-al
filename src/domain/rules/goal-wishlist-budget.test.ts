import { describe, expect, it } from 'vitest';
import {
  asMonth,
  asMoney,
  validateBudget,
  validateBudgetReferences,
  validateBudgetUniqueness,
  validateGoal,
  validateWishlistItem,
  validateWishlistItemReferences,
} from '..';
import type { WishlistItem } from '..';
import {
  buildBudget,
  buildCategory,
  buildGoal,
  buildWishlistItem,
  categoryLookup,
  ids,
  untyped,
} from '../test-support/builders';
import { codes } from '../test-support/codes';

describe('validateGoal', () => {
  it('accepts a valid goal', () => {
    expect(validateGoal(buildGoal())).toEqual([]);
  });

  it('requires a positive target', () => {
    expect(
      codes(validateGoal(buildGoal({ targetAmount: asMoney(0) }))),
    ).toEqual(['AMOUNT_NOT_POSITIVE']);
    expect(
      codes(validateGoal(buildGoal({ targetAmount: asMoney(-1) }))),
    ).toEqual(['AMOUNT_NOT_POSITIVE']);
  });

  it('requires a real deadline, a name and a known priority', () => {
    const bad = buildGoal({
      name: '',
      deadline: untyped('2027-02-29'),
      priority: untyped('urgent'),
    });
    expect(codes(validateGoal(bad))).toEqual([
      'BLANK_TEXT',
      'INVALID_DATE',
      'INVALID_ENUM_VALUE',
    ]);
  });
});

describe('validateWishlistItem', () => {
  it('accepts pending and purchased items', () => {
    expect(validateWishlistItem(buildWishlistItem())).toEqual([]);
    expect(
      validateWishlistItem(buildWishlistItem({ status: 'purchased' })),
    ).toEqual([]);
  });

  it('accepts an item with a category and one without', () => {
    expect(
      validateWishlistItem(buildWishlistItem({ categoryId: ids.food })),
    ).toEqual([]);
  });

  it('rejects a status other than pending/purchased', () => {
    const bad = untyped<WishlistItem>({
      ...buildWishlistItem(),
      status: 'cancelled',
    });
    expect(codes(validateWishlistItem(bad))).toEqual(['INVALID_ENUM_VALUE']);
  });

  it('requires a positive estimated price', () => {
    const result = validateWishlistItem(
      buildWishlistItem({ estimatedPrice: asMoney(0) }),
    );
    expect(codes(result)).toEqual(['AMOUNT_NOT_POSITIVE']);
  });

  it('rejects a category that does not exist', () => {
    const result = validateWishlistItemReferences(
      buildWishlistItem({ categoryId: ids.food }),
      { categories: categoryLookup() },
    );
    expect(codes(result)).toEqual(['CATEGORY_NOT_FOUND']);
  });

  it('does not require a category', () => {
    expect(
      validateWishlistItemReferences(buildWishlistItem(), {
        categories: categoryLookup(),
      }),
    ).toEqual([]);
  });
});

describe('Budget', () => {
  it('accepts a valid budget', () => {
    expect(validateBudget(buildBudget())).toEqual([]);
  });

  it('requires a positive amount and a real month', () => {
    const bad = buildBudget({ amount: asMoney(0), month: untyped('2026-13') });
    expect(codes(validateBudget(bad))).toEqual([
      'INVALID_MONTH',
      'AMOUNT_NOT_POSITIVE',
    ]);
  });

  it('can only be set on an existing expense category', () => {
    const refs = (category?: ReturnType<typeof buildCategory>) => ({
      categories: category ? categoryLookup(category) : categoryLookup(),
    });
    expect(
      validateBudgetReferences(buildBudget(), refs(buildCategory())),
    ).toEqual([]);
    expect(codes(validateBudgetReferences(buildBudget(), refs()))).toEqual([
      'CATEGORY_NOT_FOUND',
    ]);
    expect(
      codes(
        validateBudgetReferences(
          buildBudget(),
          refs(buildCategory({ type: 'income' })),
        ),
      ),
    ).toEqual(['CATEGORY_TYPE_MISMATCH']);
  });

  describe('one budget per category per month', () => {
    it('rejects two budgets for the same category and month', () => {
      const result = validateBudgetUniqueness([buildBudget(), buildBudget()]);
      expect(codes(result)).toEqual(['DUPLICATE_BUDGET']);
    });

    it('allows the same category in different months, and different categories in one month', () => {
      const otherCategory = buildCategory({ id: ids.salary });
      expect(
        validateBudgetUniqueness([
          buildBudget({ month: asMonth('2026-09') }),
          buildBudget({ month: asMonth('2026-10') }),
          buildBudget({ categoryId: otherCategory.id }),
        ]),
      ).toEqual([]);
    });
  });
});
