const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createRepository, missionShop } = require("./test-support.cjs");

const root = mkdtempSync(join(tmpdir(), "vocabflow-mission-shop-"));
const poorRoot = mkdtempSync(join(tmpdir(), "vocabflow-mission-shop-poor-"));
const day = "2026-11-15";
const nextDay = "2026-11-16";
const harness = createRepository(root, `${day}T12:00:00`);
const poorHarness = createRepository(poorRoot, `${day}T12:00:00`);

(async () => {
  try {
    await harness.repo.getMissionShopOverview(day);
    harness.db
      .prepare(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, upgrade_attempts,
            rarity, rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
         VALUES ('shop-test-funds', ?, 'review-1', 20, 0, 'common', 5, 0, 1, 2000, ?, ?)`,
      )
      .run(day, `${day}T12:00:00.000Z`, `${day}T12:00:00.000Z`);

    const initial = await harness.repo.getMissionShopOverview(day);
    const offers = initial.offers;
    assert.equal(initial.stoneBalance, 2000);
    assert.ok(offers.every((offer) => !offer.purchased));

    let totalSpent = 0;
    for (const offer of offers) {
      const purchase = await harness.repo.purchaseMissionShopOffer(
        offer.slot,
        day,
      );
      assert.equal(purchase.rarity, offer.rarity);
      assert.equal(purchase.stoneCost, offer.price);
      totalSpent += offer.price;
    }

    const purchased = await harness.repo.getMissionShopOverview(day);
    assert.equal(purchased.stoneBalance, 2000 - totalSpent);
    assert.ok(purchased.offers.every((offer) => offer.purchased));
    assert.equal(
      (await harness.repo.getDailyMissionOverview(day)).stoneBalance,
      2000 - totalSpent,
      "Store spending is deducted from the mission Stone balance.",
    );
    const collection = await harness.repo.getMissionCollectionOverview();
    assert.equal(collection.fragments.rare, 1);
    assert.equal(collection.fragments.epic, 1);
    assert.equal(collection.fragments.legendary, 1);

    await assert.rejects(
      harness.repo.purchaseMissionShopOffer(offers[0].slot, day),
      /already|today|hôm nay/i,
      "Each daily offer can only be bought once.",
    );
    const refreshed = await harness.repo.getMissionShopOverview(nextDay);
    assert.ok(
      refreshed.offers.every((offer) => !offer.purchased),
      "The next day has fresh offers.",
    );
    assert.equal(refreshed.stoneBalance, 2000 - totalSpent);
    assert.equal(
      harness.db
        .prepare("SELECT value FROM sync_state WHERE key = 'pending'")
        .get().value,
      "1",
      "Purchases are queued for account sync.",
    );

    const poorStart = await poorHarness.repo.getMissionShopOverview(day);
    assert.equal(poorStart.stoneBalance, 0);
    await assert.rejects(
      poorHarness.repo.purchaseMissionShopOffer(
        missionShop.missionShopOffersForDay(day)[0].slot,
        day,
      ),
      /Không đủ Stone/,
    );
    const poorEnd = await poorHarness.repo.getMissionShopOverview(day);
    assert.equal(poorEnd.stoneBalance, 0);
    assert.ok(poorEnd.offers.every((offer) => !offer.purchased));
    assert.equal(
      (await poorHarness.repo.getMissionCollectionOverview()).fragments.rare +
        (await poorHarness.repo.getMissionCollectionOverview()).fragments.epic +
        (await poorHarness.repo.getMissionCollectionOverview()).fragments
          .legendary,
      0,
      "An unaffordable purchase does not grant fragments.",
    );
  } finally {
    if (harness.db) harness.db.close();
    if (poorHarness.db) poorHarness.db.close();
    rmSync(root, { recursive: true, force: true });
    rmSync(poorRoot, { recursive: true, force: true });
  }
  console.log("Mission shop offline purchases and Stone accounting passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
