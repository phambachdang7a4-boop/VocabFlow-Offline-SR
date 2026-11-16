const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadTs,
  missionShop,
  stoneInvestments,
} = require("./test-support.cjs");

const dayOne = "2026-11-15";
const planRates = {
  safe: [2, 6, 99],
  balanced: [4, 12, 70],
  risky: [8, 24, -20],
};

for (const [plan, [sevenDayRate, fourteenDayRate, failurePayoutPercent]] of
  Object.entries(planRates)) {
  assert.equal(stoneInvestments.investmentRate(plan, 7), sevenDayRate);
  assert.equal(stoneInvestments.investmentRate(plan, 14), fourteenDayRate);
  assert.equal(
    stoneInvestments.investmentFailureSettlement(plan, 100),
    failurePayoutPercent,
    `The ${plan} failure payout matches the agreed rule.`,
  );
}
assert.equal(
  stoneInvestments.investmentSuccessSettlement("safe", 100, 14),
  106,
);
assert.equal(
  stoneInvestments.investmentSuccessSettlement("balanced", 100, 14),
  112,
);
assert.equal(
  stoneInvestments.investmentSuccessSettlement("risky", 100, 14),
  124,
);
assert.equal(stoneInvestments.investmentRate("safe", 7, "low"), 2.3);
assert.equal(stoneInvestments.investmentRate("risky", 7, "high"), 10.4);
assert.equal(
  stoneInvestments.investmentSuccessSettlement("balanced", 100, 7, "low"),
  105,
  "A low capital invite multiplies the profit rate by 1.15.",
);
assert.equal(
  stoneInvestments.investmentFailureSettlement("balanced", 100, "low"),
  61,
  "A low capital invite multiplies the failed net loss by 1.3.",
);
assert.equal(
  stoneInvestments.investmentFailureSettlement("risky", 100, "high"),
  -68,
);
assert.deepEqual(stoneInvestments.FORCE_MAJEURE_RATES, {
  safe: 1,
  balanced: 2,
  risky: 3,
});
for (const plan of ["safe", "balanced", "risky"]) {
  let hitId = null;
  for (let index = 0; index < 1000 && hitId === null; index += 1) {
    const candidate = `investment:force-test-${index}`;
    if (stoneInvestments.forceMajeureOccurs(candidate, plan)) hitId = candidate;
  }
  assert.ok(hitId, `The ${plan} force majeure roll can trigger.`);
  assert.equal(stoneInvestments.forceMajeureOccurs(hitId, plan), true);
}
assert.equal(
  stoneInvestments.investmentFailureSettlement("risky", 100, null, true),
  100,
  "Low insurance returns the principal after a missed day.",
);

const contract = {
  investmentId: "investment:test-contract",
  plan: "safe",
  principal: 100,
  durationDays: 7,
  startDay: dayOne,
  endDay: "2026-11-21",
  status: "active",
  settlementAmount: null,
  lowInsuranceUsed: false,
  capitalInvite: null,
  collateralUsed: false,
  forceMajeureHit: false,
  createdAt: `${dayOne}T12:00:00.000Z`,
  settledAt: null,
};
assert.equal(stoneInvestments.isValidStoneInvestment(contract), true);
assert.equal(
  stoneInvestments.evaluateStoneInvestment(
    contract,
    new Set(),
    "2026-11-16",
  ).status,
  "failed",
  "Missing a past study day fails the contract.",
);
const allSevenDays = new Set(
  stoneInvestments.studyDaysRequired(dayOne, 7),
);
const forceMajeureContract = {
  ...contract,
  investmentId: "investment:force-hit-16",
  plan: "risky",
  forceMajeureHit: true,
};
assert.deepEqual(
  stoneInvestments.evaluateStoneInvestment(
    forceMajeureContract,
    allSevenDays,
    "2026-11-21",
  ),
  { status: "failed", settlementAmount: -20 },
  "A one-time force majeure roll fails the contract even after all study days.",
);
assert.deepEqual(
  stoneInvestments.evaluateStoneInvestment(
    {
      ...forceMajeureContract,
      lowInsuranceUsed: true,
    },
    new Set(),
    "2026-11-16",
  ),
  { status: "failed", settlementAmount: -20 },
  "Low insurance only covers missed study days, not force majeure.",
);
assert.equal(
  stoneInvestments.isValidStoneInvestment({
    ...forceMajeureContract,
    lowInsuranceUsed: true,
    status: "failed",
    settlementAmount: -20,
    settledAt: "2026-11-21T12:00:00.000Z",
  }),
  true,
  "An insured risky contract can still fail under force majeure.",
);
assert.deepEqual(
  stoneInvestments.evaluateStoneInvestment(
    contract,
    allSevenDays,
    "2026-11-21",
  ),
  { status: "succeeded", settlementAmount: 102 },
);
assert.deepEqual(
  stoneInvestments.evaluateStoneInvestment(
    { ...contract, forceMajeureHit: null },
    allSevenDays,
    "2026-11-21",
  ),
  { status: "succeeded", settlementAmount: 102 },
  "An older investment without a roll is not retroactively exposed.",
);
assert.equal(
  stoneInvestments.isValidStoneInvestment({
    ...contract,
    status: "succeeded",
    settlementAmount: 102,
    settledAt: "2026-11-21T12:00:00.000Z",
  }),
  true,
);
assert.equal(
  stoneInvestments.isValidStoneInvestment({
    ...contract,
    status: "succeeded",
    settlementAmount: 999,
    settledAt: "2026-11-21T12:00:00.000Z",
  }),
  false,
  "A forged settlement payout is rejected.",
);
assert.equal(
  stoneInvestments.isValidStoneInvestment({
    ...contract,
    principal: stoneInvestments.MAX_STONE_INVESTMENT_PRINCIPAL + 1,
  }),
  false,
  "The principal stays within the range supported by the sync database.",
);

function createFundedHarness(name, funds) {
  const root = mkdtempSync(join(tmpdir(), `vocabflow-${name}-`));
  const harness = createRepository(root, `${dayOne}T12:00:00`);
  return {
    root,
    harness,
    async fund() {
      await harness.repo.getMissionShopOverview(dayOne);
      const insert = harness.db.prepare(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, rarity, rule_set,
            super_upgrade, opened, final_stone, created_at, updated_at)
         VALUES (?, ?, ?, 1, 'rare', 5, 0, 1, ?, ?, ?)`,
      );
      let remaining = funds;
      let index = 0;
      while (remaining > 0) {
        const value = Math.min(remaining, 5000);
        insert.run(
          `seed-${name}-${index}`,
          dayOne,
          `review-${index}`,
          value,
          `${dayOne}T12:00:00.000Z`,
          `${dayOne}T12:00:00.000Z`,
        );
        remaining -= value;
        index += 1;
      }
    },
    cleanup() {
      if (harness.db) harness.db.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

async function checkStorage() {
  const success = createFundedHarness("investment-success", 500);
  const missed = createFundedHarness("investment-missed", 500);
  const risky = createFundedHarness("investment-risky", 100);
    const insured = createFundedHarness("investment-insured", 5000);
    const invited = createFundedHarness("investment-invite", 5000);
    const collateral = createFundedHarness("investment-collateral", 6000);
  const forceEvent = createFundedHarness("investment-force-event", 6000);
  try {
    await success.fund();
    await success.harness.repo.createStoneInvestment("safe", 100, 7);
    assert.equal(
      (await success.harness.repo.getStoneInvestmentOverview()).stoneBalance,
      400,
      "Starting the investment locks the principal.",
    );
    for (const day of stoneInvestments.studyDaysRequired(dayOne, 7)) {
      success.harness.setDay(day);
      await success.harness.repo.recordStoneInvestmentStudyDay(
        day === dayOne ? "course" : "review",
      );
    }
    const completed = await success.harness.repo.getStoneInvestmentOverview();
    assert.equal(completed.investments[0].status, "succeeded");
    assert.equal(completed.stoneBalance, 502);
    assert.equal(completed.studyDays.length, 7);
    assert.equal(
      completed.studyDays.find((item) => item.day === dayOne).studiedCourse,
      true,
      "Course study is recorded for the investment day.",
    );
    assert.equal(
      harnessPending(success.harness.db),
      "1",
      "Investments and daily study are queued for account sync.",
    );

    await missed.fund();
    await missed.harness.repo.createStoneInvestment("balanced", 100, 7);
    missed.harness.setDay("2026-11-16");
    const missedResult =
      await missed.harness.repo.getStoneInvestmentOverview();
    assert.equal(missedResult.investments[0].status, "failed");
    assert.equal(missedResult.stoneBalance, 470);
    assert.equal(
      missedResult.investments[0].settlementAmount,
      70,
      "The balanced plan returns 70% of the principal after failure.",
    );

    await risky.fund();
    await risky.harness.repo.createStoneInvestment("risky", 100, 7);
    risky.harness.setDay("2026-11-16");
    const riskyResult = await risky.harness.repo.getStoneInvestmentOverview();
    assert.equal(riskyResult.investments[0].status, "failed");
    assert.equal(riskyResult.stoneBalance, -20);
    assert.equal(
      riskyResult.investments[0].settlementAmount,
      -20,
      "The risky plan loses 120% net, allowing Stone debt.",
    );

      await insured.fund();
      const insuranceCost = await purchaseShopItem(
        insured.harness,
        "low_insurance",
      );
      await insured.harness.repo.createStoneInvestment("risky", 100, 7, {
        lowInsuranceUsed: true,
      });
      assert.equal(
        (await insured.harness.repo.getStoneInvestmentOverview()).inventory
          .low_insurance,
        0,
        "Low insurance is consumed at investment start.",
      );
      insured.harness.setDay("2026-11-16");
      const insuredResult =
        await insured.harness.repo.getStoneInvestmentOverview();
      assert.equal(insuredResult.investments[0].status, "failed");
      assert.equal(insuredResult.investments[0].settlementAmount, 100);
      assert.equal(insuredResult.stoneBalance, 5000 - insuranceCost);

      await invited.fund();
      const inviteCost = await purchaseShopItem(
        invited.harness,
        "low_capital_invite",
      );
      await invited.harness.repo.createStoneInvestment("balanced", 100, 7, {
        capitalInvite: "low",
      });
      for (const day of stoneInvestments.studyDaysRequired(dayOne, 7)) {
        invited.harness.setDay(day);
        await invited.harness.repo.recordStoneInvestmentStudyDay("review");
      }
      const invitedResult =
        await invited.harness.repo.getStoneInvestmentOverview();
      assert.equal(invitedResult.investments[0].status, "succeeded");
      assert.equal(invitedResult.investments[0].settlementAmount, 105);
      assert.equal(invitedResult.stoneBalance, 5000 - inviteCost - 100 + 105);
      assert.equal(
        invitedResult.inventory.low_capital_invite,
        0,
        "A capital invite is consumed at investment start.",
      );

      await collateral.fund();
      const collateralCost = await purchaseShopItem(
        collateral.harness,
        "collateral_asset",
      );
      await collateral.harness.repo.createStoneInvestment("risky", 100, 7);
      collateral.harness.setDay("2026-11-16");
      const failedCollateral =
        await collateral.harness.repo.getStoneInvestmentOverview();
      assert.equal(failedCollateral.investments[0].settlementAmount, -20);
      assert.equal(failedCollateral.inventory.collateral_asset, 1);
      const rescued = await collateral.harness.repo.useStoneInvestmentCollateral(
        failedCollateral.investments[0].investmentId,
      );
      assert.equal(rescued.settlementAmount, 100);
      assert.equal(rescued.collateralUsed, true);
      const rescuedOverview =
        await collateral.harness.repo.getStoneInvestmentOverview();
      assert.equal(rescuedOverview.stoneBalance, 6000 - collateralCost);
      assert.equal(rescuedOverview.inventory.collateral_asset, 0);

      await forceEvent.fund();
      const forceInsuranceCost = await purchaseShopItem(
        forceEvent.harness,
        "low_insurance",
      );
      const forceCollateralCost = await purchaseShopItem(
        forceEvent.harness,
        "collateral_asset",
      );
      await forceEvent.harness.repo.createStoneInvestment("risky", 100, 7, {
        lowInsuranceUsed: true,
      });
      const forceInvestment =
        (await forceEvent.harness.repo.getStoneInvestmentOverview())
          .investments[0];
      forceEvent.harness.db
        .prepare(
          "UPDATE stone_investments SET force_majeure_hit = 1 WHERE investment_id = ?",
        )
        .run(forceInvestment.investmentId);
      for (const day of stoneInvestments.studyDaysRequired(dayOne, 7)) {
        forceEvent.harness.db
          .prepare(
            `INSERT INTO investment_study_days
              (day, reviewed, studied_course, updated_at)
             VALUES (?, 1, 0, ?)`,
          )
          .run(day, `${day}T12:00:00.000Z`);
      }
      forceEvent.harness.setDay("2026-11-21");
      const forceResult =
        await forceEvent.harness.repo.getStoneInvestmentOverview();
      assert.equal(forceResult.investments[0].forceMajeureHit, true);
      assert.equal(forceResult.investments[0].status, "failed");
      assert.equal(forceResult.investments[0].settlementAmount, -20);
      const forceRescued =
        await forceEvent.harness.repo.useStoneInvestmentCollateral(
          forceResult.investments[0].investmentId,
        );
      assert.equal(forceRescued.settlementAmount, 100);
      assert.equal(
        (await forceEvent.harness.repo.getStoneInvestmentOverview()).stoneBalance,
        6000 - forceInsuranceCost - forceCollateralCost,
      );

    const review = createFundedHarness("investment-review-event", 200);
    try {
      await review.fund();
      await review.harness.repo.createStoneInvestment("safe", 100, 7);
      await review.harness.repo.recordReviewSessionResult({
        sessionId: "investment-review-session",
        startedAt: Date.parse(`${dayOne}T13:00:00`),
        activeDurationMs: 30_000,
        maxCombo: 1,
        reviewedCount: 1,
        correctCount: 1,
        grade: "A",
        completed: true,
      });
      const overview = await review.harness.repo.getStoneInvestmentOverview();
      assert.equal(overview.studyDays[0].reviewed, true);
    } finally {
      review.cleanup();
    }
  } finally {
    success.cleanup();
    missed.cleanup();
    risky.cleanup();
      insured.cleanup();
      invited.cleanup();
      collateral.cleanup();
    forceEvent.cleanup();
  }
}

async function purchaseShopItem(harness, productId) {
  const first = new Date(`${dayOne}T00:00:00.000Z`);
  for (let offset = 0; offset < 90; offset += 1) {
    const date = new Date(first);
    date.setUTCDate(date.getUTCDate() + offset);
    const day = date.toISOString().slice(0, 10);
    const offer = missionShop
      .missionShopOffersForDay(day)
      .find((item) => item.productId === productId);
    if (!offer) continue;
    await harness.repo.purchaseMissionShopOffer(offer.slot, day);
    return offer.price;
  }
  throw new Error(`Could not find a shop day offering ${productId}.`);
}

function harnessPending(db) {
  return db.prepare("SELECT value FROM sync_state WHERE key = 'pending'").get()
    .value;
}

const courseScreen = readFileSync(
  join(__dirname, "../app/(tabs)/courses.tsx"),
  "utf8",
);
const shopScreen = readFileSync(
  join(__dirname, "../components/MissionShop.tsx"),
  "utf8",
);
const investmentScreen = readFileSync(
  join(__dirname, "../components/StoneInvestmentSection.tsx"),
  "utf8",
);
assert.match(courseScreen, /recordStoneInvestmentStudyDay\("course"\)/);
assert.match(shopScreen, /<StoneInvestmentSection[\s\S]*inventoryRevision=/);
assert.match(shopScreen, /setInventoryRevision/);
assert.match(investmentScreen, /onInventoryChange\?\./);
assert.match(investmentScreen, /Bỏ lỡ một ngày ôn hoặc học sẽ tính là thất bại/);
assert.match(investmentScreen, /Kỳ 14 ngày nhận lãi gấp 3 kỳ 7 ngày/);

checkStorage()
  .then(() => console.log("Stone investment rules, study tracking, and settlement passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
