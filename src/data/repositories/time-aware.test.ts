// @vitest-environment node
import { asCalendarDate, asId, asMoney, asTimestamp } from '../../domain';
import {
  buildAllocation,
  buildGoldHolding,
  buildGoldPrice,
  ids,
} from '../../domain/test-support/builders';
import { createTestRepositories } from '../test-support/test-database';

const d = asCalendarDate;
const otherAsset = asId<'Asset'>('00000000-0000-4000-8000-0000000000a9');
const otherGoal = asId<'Goal'>('00000000-0000-4000-8000-0000000000e9');

describe('AllocationRepository', () => {
  it('adds, gets, updates, deletes and bulk-adds', async () => {
    const { repos } = createTestRepositories();
    const a = buildAllocation();
    await repos.allocations.add(a);
    expect(await repos.allocations.get(a.id)).toStrictEqual(a);

    const closed = { ...a, endDate: d('2026-10-10') };
    await repos.allocations.put(closed);
    expect(await repos.allocations.get(a.id)).toStrictEqual(closed);

    await repos.allocations.delete(a.id);
    expect(await repos.allocations.get(a.id)).toBeUndefined();

    await repos.allocations.addMany([buildAllocation(), buildAllocation()]);
    expect(await repos.allocations.listOpen()).toHaveLength(2);
  });

  it('applies the [startDate, endDate) rule exactly (Step 0 rule 16)', async () => {
    const { repos } = createTestRepositories();
    // Sep 1 - Oct 10 closed, Oct 10 - open opened: the move example.
    const old = buildAllocation({
      startDate: d('2026-09-01'),
      endDate: d('2026-10-10'),
    });
    const successor = buildAllocation({
      assetId: otherAsset,
      startDate: d('2026-10-10'),
    });
    await repos.allocations.addMany([old, successor]);

    const on = (date: string) =>
      repos.allocations.listActiveOn(d(date)).then((r) => r.map((a) => a.id));

    expect(await on('2026-08-31')).toEqual([]);
    expect(await on('2026-09-01')).toEqual([old.id]); // active on startDate
    expect(await on('2026-10-09')).toEqual([old.id]);
    expect(await on('2026-10-10')).toEqual([successor.id]); // old inactive on endDate
    expect(await on('2027-01-01')).toEqual([successor.id]);
  });

  it('filters active allocations by asset and by goal', async () => {
    const { repos } = createTestRepositories();
    const bankGoal = buildAllocation({ goalId: ids.goal });
    const bankReserve = buildAllocation();
    const otherAssetGoal = buildAllocation({
      assetId: otherAsset,
      goalId: otherGoal,
    });
    await repos.allocations.addMany([bankGoal, bankReserve, otherAssetGoal]);
    const date = d('2026-09-15');

    expect(
      (await repos.allocations.listActiveOn(date, { assetId: ids.bank }))
        .map((a) => a.id)
        .sort(),
    ).toEqual([bankGoal.id, bankReserve.id].sort());
    expect(
      (await repos.allocations.listActiveOn(date, { goalId: ids.goal })).map(
        (a) => a.id,
      ),
    ).toEqual([bankGoal.id]);
    expect(
      await repos.allocations.listActiveOn(date, {
        assetId: ids.bank,
        goalId: otherGoal,
      }),
    ).toEqual([]);
  });

  it('lists full history by asset and by goal, ordered by startDate', async () => {
    const { repos } = createTestRepositories();
    const later = buildAllocation({
      goalId: ids.goal,
      startDate: d('2026-10-10'),
    });
    const earlier = buildAllocation({
      goalId: ids.goal,
      startDate: d('2026-09-01'),
      endDate: d('2026-10-10'),
    });
    const elsewhere = buildAllocation({ assetId: otherAsset });
    await repos.allocations.addMany([later, elsewhere, earlier]);

    expect(
      (await repos.allocations.listByAsset(ids.bank)).map((a) => a.id),
    ).toEqual([earlier.id, later.id]);
    expect(
      (await repos.allocations.listByGoal(ids.goal)).map((a) => a.id),
    ).toEqual([earlier.id, later.id]);
    expect(await repos.allocations.listByGoal(otherGoal)).toEqual([]);
  });

  it('lists only open allocations (no endDate), optionally filtered', async () => {
    const { repos } = createTestRepositories();
    const open = buildAllocation({ goalId: ids.goal });
    const closed = buildAllocation({ endDate: d('2026-09-30') });
    const openElsewhere = buildAllocation({ assetId: otherAsset });
    await repos.allocations.addMany([open, closed, openElsewhere]);

    expect(
      (await repos.allocations.listOpen()).map((a) => a.id).sort(),
    ).toEqual([open.id, openElsewhere.id].sort());
    expect(
      (await repos.allocations.listOpen({ assetId: ids.bank })).map(
        (a) => a.id,
      ),
    ).toEqual([open.id]);
    expect(
      (await repos.allocations.listOpen({ goalId: ids.goal })).map((a) => a.id),
    ).toEqual([open.id]);
  });

  it('keeps allocations without a goal out of the goal index', async () => {
    const { repos } = createTestRepositories();
    await repos.allocations.add(buildAllocation());
    expect(await repos.allocations.listByGoal(ids.goal)).toEqual([]);
  });
});

describe('GoldPriceRepository', () => {
  it('adds, gets, updates, deletes', async () => {
    const { repos } = createTestRepositories();
    const p = buildGoldPrice();
    await repos.goldPrices.add(p);
    expect(await repos.goldPrices.get(p.id)).toStrictEqual(p);
    await repos.goldPrices.put({ ...p, pricePerGram: asMoney(460_000) });
    expect((await repos.goldPrices.get(p.id))?.pricePerGram).toBe(460_000);
    await repos.goldPrices.delete(p.id);
    expect(await repos.goldPrices.get(p.id)).toBeUndefined();
  });

  it('lists a karat history in date order and ignores other karats', async () => {
    const { repos } = createTestRepositories();
    const oct = buildGoldPrice({ effectiveDate: d('2026-10-01') });
    const sep = buildGoldPrice({ effectiveDate: d('2026-09-01') });
    const k24 = buildGoldPrice({ karat: 24, effectiveDate: d('2026-09-15') });
    await repos.goldPrices.addMany([oct, k24, sep]);
    expect((await repos.goldPrices.listByKarat(21)).map((p) => p.id)).toEqual([
      sep.id,
      oct.id,
    ]);
    expect((await repos.goldPrices.listByKarat(24)).map((p) => p.id)).toEqual([
      k24.id,
    ]);
  });

  it('lists by effective date range', async () => {
    const { repos } = createTestRepositories();
    const a = buildGoldPrice({ effectiveDate: d('2026-09-01') });
    const b = buildGoldPrice({ effectiveDate: d('2026-09-30') });
    const c = buildGoldPrice({ effectiveDate: d('2026-10-01') });
    await repos.goldPrices.addMany([a, b, c]);
    const found = await repos.goldPrices.listByEffectiveDateRange({
      from: d('2026-09-01'),
      to: d('2026-09-30'),
    });
    expect(found.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('finds the latest price on or before a date, per karat (historical pricing)', async () => {
    const { repos } = createTestRepositories();
    const sep = buildGoldPrice({
      effectiveDate: d('2026-09-01'),
      pricePerGram: asMoney(450_000),
    });
    const oct = buildGoldPrice({
      effectiveDate: d('2026-10-01'),
      pricePerGram: asMoney(480_000),
    });
    const other = buildGoldPrice({ karat: 24, effectiveDate: d('2026-09-10') });
    await repos.goldPrices.addMany([oct, sep, other]);

    const at = (date: string, karat = 21) =>
      repos.goldPrices.findLatestOnOrBefore(karat, d(date));

    expect(await at('2026-08-31')).toBeUndefined();
    expect((await at('2026-09-01'))?.id).toBe(sep.id); // inclusive
    expect((await at('2026-09-30'))?.pricePerGram).toBe(450_000); // not repriced by October
    expect((await at('2026-10-01'))?.pricePerGram).toBe(480_000);
    expect((await at('2026-09-30', 24))?.id).toBe(other.id);
    expect(await at('2026-09-30', 18)).toBeUndefined();
  });

  it('breaks same-day ties deterministically: latest createdAt wins', async () => {
    const { repos } = createTestRepositories();
    const original = buildGoldPrice({
      effectiveDate: d('2026-09-01'),
      pricePerGram: asMoney(450_000),
      createdAt: asTimestamp('2026-09-01T08:00:00.000Z'),
    });
    const correction = buildGoldPrice({
      effectiveDate: d('2026-09-01'),
      pricePerGram: asMoney(455_000),
      createdAt: asTimestamp('2026-09-02T08:00:00.000Z'),
    });
    await repos.goldPrices.addMany([correction, original]);
    expect(
      (await repos.goldPrices.findLatestOnOrBefore(21, d('2026-09-05')))?.id,
    ).toBe(correction.id);
  });
});

describe('GoldHoldingRepository', () => {
  it('adds, gets, updates, deletes', async () => {
    const { repos } = createTestRepositories();
    const h = buildGoldHolding();
    await repos.goldHoldings.add(h);
    expect(await repos.goldHoldings.get(h.id)).toStrictEqual(h);
    await repos.goldHoldings.put({ ...h, weightGrams: 7.25 });
    expect((await repos.goldHoldings.get(h.id))?.weightGrams).toBe(7.25);
    await repos.goldHoldings.delete(h.id);
    expect(await repos.goldHoldings.get(h.id)).toBeUndefined();
  });

  it('keeps September weight after an October sale (close-and-open history)', async () => {
    const { repos } = createTestRepositories();
    const before = buildGoldHolding({
      weightGrams: 20,
      startDate: d('2026-01-01'),
      endDate: d('2026-10-01'),
    });
    const after = buildGoldHolding({
      weightGrams: 12.5,
      startDate: d('2026-10-01'),
    });
    await repos.goldHoldings.addMany([after, before]);

    expect(
      (await repos.goldHoldings.listByAsset(ids.gold)).map((h) => h.id),
    ).toEqual([before.id, after.id]);
    const at = async (date: string) =>
      (await repos.goldHoldings.findActiveOn(ids.gold, d(date)))?.weightGrams;
    expect(await at('2025-12-31')).toBeUndefined();
    expect(await at('2026-09-30')).toBe(20);
    expect(await at('2026-10-01')).toBe(12.5); // endDate exclusive
    expect(await at('2027-06-01')).toBe(12.5);
  });

  it('is scoped to the asset and can list all active holdings', async () => {
    const { repos } = createTestRepositories();
    const gold = buildGoldHolding();
    const otherGold = buildGoldHolding({ assetId: otherAsset, weightGrams: 3 });
    const ended = buildGoldHolding({
      assetId: asId<'Asset'>('00000000-0000-4000-8000-0000000000a8'),
      endDate: d('2026-02-01'),
    });
    await repos.goldHoldings.addMany([gold, otherGold, ended]);

    expect(
      await repos.goldHoldings.findActiveOn(otherAsset, d('2026-09-01')),
    ).toStrictEqual(otherGold);
    expect(
      (await repos.goldHoldings.listActiveOn(d('2026-09-01')))
        .map((h) => h.id)
        .sort(),
    ).toEqual([gold.id, otherGold.id].sort());
  });
});
