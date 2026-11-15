const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadTs,
  stoneInvestments,
} = require("./test-support.cjs");

const dayOne = "2026-11-15";
const planRates = {
  safe: [5, 15, 99],
  balanced: [10, 30, 70],
  risky: [40, 120, -20],
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
  115,
);
assert.equal(
  stoneInvestments.investmentSuccessSettlement("balanced", 100, 14),
  130,
);
assert.equal(
  stoneInvestments.investmentSuccessSettlement("risky", 100, 14),
  220,
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
assert.deepEqual(
  stoneInvestments.evaluateStoneInvestment(
    contract,
    allSevenDays,
    "2026-11-21",
  ),
  { status: "succeeded", settlementAmount: 105 },
);
assert.equal(
  stoneInvestments.isValidStoneInvestment({
    ...contract,
    status: "succeeded",
    settlementAmount: 105,
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
      harness.db
        .prepare(
          `INSERT INTO mission_chests
            (chest_id, mission_day, mission_id, base_stone, rarity, rule_set,
              super_upgrade, opened, final_stone, created_at, updated_at)
           VALUES (?, ?, 'review-1', 1, 'rare', 5, 0, 1, ?, ?, ?)`,
        )
        .run(
          `seed-${name}`,
          dayOne,
          funds,
          `${dayOne}T12:00:00.000Z`,
          `${dayOne}T12:00:00.000Z`,
        );
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
    assert.equal(completed.stoneBalance, 505);
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
  }
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
assert.match(shopScreen, /<StoneInvestmentSection \/>/);
assert.match(investmentScreen, /Bỏ lỡ một ngày ôn hoặc học sẽ tính là thất bại/);
assert.match(investmentScreen, /Kỳ 14 ngày nhận lãi gấp 3 kỳ 7 ngày/);

checkStorage()
  .then(() => console.log("Stone investment rules, study tracking, and settlement passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
