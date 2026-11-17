const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadTs,
  missionChests,
  collectionArtworks,
} = require("./test-support.cjs");

const missionDomain = loadTs(join(__dirname, "../domain/daily-missions.ts"));
const candidateDays = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];
const day = candidateDays.find((candidate) =>
  missionDomain
    .evaluateDailyMissions(
      candidate,
      {
        reviewedCount: 0,
        addedWordCount: 0,
        reviewSessions: [],
        reviewDurationMs: 0,
      },
      [],
    )
    .some((mission) => mission.type === "grade"),
);
const gradeMission = missionDomain
  .evaluateDailyMissions(
    day,
    {
      reviewedCount: 0,
      addedWordCount: 0,
      reviewSessions: [],
      reviewDurationMs: 0,
    },
    [],
  )
  .find((mission) => mission.type === "grade");
const timeDay = candidateDays.find((candidate) =>
  missionDomain
    .evaluateDailyMissions(
      candidate,
      {
        reviewedCount: 0,
        addedWordCount: 0,
        reviewSessions: [],
        reviewDurationMs: 0,
      },
      [],
    )
    .some((mission) => mission.type === "time"),
);
const timeMission = missionDomain
  .evaluateDailyMissions(
    timeDay,
    {
      reviewedCount: 0,
      addedWordCount: 0,
      reviewSessions: [],
      reviewDurationMs: 0,
    },
    [],
  )
  .find((mission) => mission.type === "time");
const comboDay = candidateDays.find((candidate) =>
  missionDomain
    .evaluateDailyMissions(
      candidate,
      {
        reviewedCount: 0,
        addedWordCount: 0,
        reviewSessions: [],
        reviewDurationMs: 0,
      },
      [],
    )
    .some((mission) => mission.type === "combo"),
);
const comboMission = missionDomain
  .evaluateDailyMissions(
    comboDay,
    {
      reviewedCount: 0,
      addedWordCount: 0,
      reviewSessions: [],
      reviewDurationMs: 0,
    },
    [],
  )
  .find((mission) => mission.type === "combo");
const root = mkdtempSync(join(tmpdir(), "vocabflow-daily-missions-"));
const harness = createRepository(root, `${day}T12:00:00`);
const timeRoot = mkdtempSync(join(tmpdir(), "vocabflow-time-mission-"));
const timeHarness = createRepository(timeRoot, `${timeDay}T12:00:00`);
const comboRoot = mkdtempSync(join(tmpdir(), "vocabflow-combo-mission-"));
const comboHarness = createRepository(comboRoot, `${comboDay}T12:00:00`);
const retryRoot = mkdtempSync(join(tmpdir(), "vocabflow-chest-retry-"));
const retryHarness = createRepository(retryRoot, "2099-01-01T12:00:00");
const migrationRoot = mkdtempSync(join(tmpdir(), "vocabflow-chest-reopen-"));
const migrationSetup = createRepository(
  migrationRoot,
  "2026-11-13T12:00:00",
);
let migrationAfterUpdate;
const gradeByLevel = { 1: "A-", 2: "A", 3: "A+" };
const requiredGrade = gradeByLevel[gradeMission.level];
const correctCountByGrade = { "A-": 23, A: 24, "A+": 26 };

(async () => {
  try {
    const firstStudyChunkMs = Math.floor((timeMission.target * 60_000) / 2);
    for (const [index, activeDurationMs] of [
      firstStudyChunkMs,
      timeMission.target * 60_000 - firstStudyChunkMs,
    ].entries()) {
      await timeHarness.repo.recordReviewSessionResult({
        sessionId: `time-session-${index}`,
        startedAt: new Date(`${timeDay}T12:00:00`).getTime(),
        activeDurationMs,
        maxCombo: 0,
        reviewedCount: 0,
        correctCount: 0,
        grade: "C",
        completed: false,
      });
      const timeOverview =
        await timeHarness.repo.getDailyMissionOverview(timeDay);
      const savedTimeMission = timeOverview.missions.find(
        (mission) => mission.type === "time",
      );
      assert.equal(
        savedTimeMission.progress,
        index === 0 ? Math.floor(timeMission.target / 2) : timeMission.target,
        "Active study time accumulates across separate interrupted review sessions.",
      );
      assert.equal(
        savedTimeMission.rewarded,
        index === 1,
        "The time mission grants its chest only after reaching its minute target.",
      );
    }

    const splitStreaks = [
      Math.floor(comboMission.target / 2),
      comboMission.target - Math.floor(comboMission.target / 2),
    ];
    for (const [index, maxCombo] of splitStreaks.entries()) {
      await comboHarness.repo.recordReviewSessionResult({
        sessionId: `combo-short-${index}`,
        startedAt: new Date(`${comboDay}T12:00:00`).getTime(),
        activeDurationMs: 0,
        maxCombo,
        reviewedCount: maxCombo,
        correctCount: maxCombo,
        grade: "S+",
        completed: true,
      });
    }
    let comboOverview =
      await comboHarness.repo.getDailyMissionOverview(comboDay);
    let savedComboMission = comboOverview.missions.find(
      (mission) => mission.type === "combo",
    );
    assert.equal(savedComboMission.progress, Math.max(...splitStreaks));
    assert.equal(
      savedComboMission.rewarded,
      false,
      "Separate shorter streaks do not complete the combo mission.",
    );
    await comboHarness.repo.recordReviewSessionResult({
      sessionId: "combo-full",
      startedAt: new Date(`${comboDay}T13:00:00`).getTime(),
      activeDurationMs: 0,
      maxCombo: comboMission.target,
      reviewedCount: comboMission.target,
      correctCount: comboMission.target,
      grade: "S+",
      completed: true,
    });
    comboOverview = await comboHarness.repo.getDailyMissionOverview(comboDay);
    savedComboMission = comboOverview.missions.find(
      (mission) => mission.type === "combo",
    );
    assert.equal(savedComboMission.progress, comboMission.target);
    assert.equal(savedComboMission.rewarded, true);

    for (let comboIndex = 1; comboIndex <= 5; comboIndex += 1) {
      assert.equal(
        await comboHarness.repo.recordReviewComboReward({
          sessionId: "five-stone-combos",
          startedAt: new Date(`${comboDay}T14:00:00`).getTime(),
          comboIndex,
          comboLength: 20,
        }),
        true,
        "Each ended Combo streak is stored as one reward event.",
      );
    }
    assert.equal(
      await comboHarness.repo.recordReviewComboReward({
        sessionId: "five-stone-combos",
        startedAt: new Date(`${comboDay}T14:00:00`).getTime(),
        comboIndex: 5,
        comboLength: 20,
      }),
      false,
      "Recording the same ended streak twice cannot pay it twice.",
    );
    comboOverview = await comboHarness.repo.getDailyMissionOverview(comboDay);
    assert.equal(
      comboOverview.stoneBalance,
      100,
      "Five 20-answer streaks earn exactly 100 Stone, with no daily cap.",
    );
    const comboSummaryMetrics =
      await comboHarness.repo.getReviewSessionSummaryMetrics(
        "five-stone-combos",
      );
    assert.equal(comboSummaryMetrics.stoneEarned, 100);
    assert.equal(
      comboSummaryMetrics.personalComboRecord,
      comboMission.target,
      "The session summary reads the all-time best Combo from saved sessions.",
    );
    assert.equal(
      await comboHarness.repo.recordReviewComboReward({
        sessionId: "under-threshold-streak",
        startedAt: new Date(`${comboDay}T15:00:00`).getTime(),
        comboIndex: 1,
        comboLength: 19,
      }),
      false,
      "A streak shorter than 20 does not receive Stone.",
    );
    comboOverview = await comboHarness.repo.getDailyMissionOverview(comboDay);
    assert.equal(comboOverview.stoneBalance, 100);

    for (let index = 0; index < gradeMission.target; index += 1) {
      await harness.repo.recordReviewSessionResult({
        sessionId: `qualified-session-${index}`,
        startedAt: new Date(`${day}T12:00:00`).getTime(),
        activeDurationMs: 0,
        maxCombo: 0,
        reviewedCount: 30,
        correctCount: correctCountByGrade[requiredGrade],
        grade: requiredGrade,
        completed: true,
      });
    }

    const firstOverview = await harness.repo.getDailyMissionOverview(day);
    const firstGradeMission = firstOverview.missions.find(
      (mission) => mission.type === "grade",
    );
    assert.equal(firstGradeMission.progress, firstGradeMission.target);
    assert.equal(
      firstGradeMission.rewarded,
      true,
      "The eligible grade mission grants one chest.",
    );
    assert.equal(
      firstOverview.stoneBalance,
      0,
      "Stone inside the chest is not credited before it is opened.",
    );
    assert.equal(
      firstOverview.chests.length,
      1,
      "A completed mission creates one unopened chest.",
    );
    assert.equal(
      firstOverview.chests[0].ruleSet,
      7,
      "New missions use fixed Stone rewards, Platinum cap, and Corvi fragments.",
    );
    assert.equal(
      firstOverview.chests[0].rarity,
      missionChests.startingRarityForMission(gradeMission.id),
      "The chest starts at its mission slot tier.",
    );
    assert.equal(
      firstOverview.chests[0].superUpgrade,
      missionChests.hasSuperUpgradeChance(firstOverview.chests[0].chestId),
    );

    harness.db
      .prepare(
        "INSERT INTO daily_mission_awards (mission_day, mission_id, stone, completed_at) VALUES (?, ?, ?, ?)",
      )
      .run("2026-11-01", "review-1", 4, "2026-11-01T12:00:00.000Z");

    let openedChest;
    let openedResult;
    const chestId = firstOverview.chests[0].chestId;
    const attemptLimit = missionChests.maxChestUpgradeAttempts(
      openedChest?.ruleSet ?? firstOverview.chests[0].ruleSet,
      openedChest?.superUpgrade ?? firstOverview.chests[0].superUpgrade,
    );
    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      const outcome = await harness.repo.attemptMissionChestUpgrade(chestId);
      openedResult = outcome;
      openedChest = outcome.chest;
      if (outcome.finished) break;
      assert.equal(
        outcome.chest.opened,
        false,
        "A non-final upgrade attempt leaves the chest available after a failure.",
      );
    }
    assert.equal(
      openedChest.opened,
      true,
      "The chest is finalized after failure or the final upgrade.",
    );
    assert.deepEqual(
      openedResult.awardedFragments,
      missionChests.chestFragmentReward(chestId, openedChest.rarity, openedChest.ruleSet),
      "The chest returns its stable multi-rarity fragment reward once opened.",
    );
    const openedOverview = await harness.repo.getDailyMissionOverview(day);
    assert.equal(
      openedOverview.chests.length,
      0,
      "Opened chests leave the unopened queue.",
    );
    assert.equal(
      openedOverview.stoneBalance,
      4 + openedChest.finalStone,
      "Opening awards chest Stone while preserving legacy Stone.",
    );
    await assert.rejects(
      () => harness.repo.attemptMissionChestUpgrade(chestId),
      /đã được mở/,
    );

    const retryDay = "2099-01-01";
    await retryHarness.repo.getDailyMissionOverview(retryDay);
    let retryChestId;
    for (let index = 0; index < 100_000; index += 1) {
      const candidate = `retry-storage-${index}`;
      if (
        !missionChests.hasSuperUpgradeChance(candidate) &&
        !missionChests.resolveChestUpgrade(
          candidate,
          1,
          "common",
          4,
          false,
        ).success
      ) {
        retryChestId = candidate;
        break;
      }
    }
    assert.ok(retryChestId, "A deterministic failed first tap is available.");
    retryHarness.db
      .prepare(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, upgrade_attempts,
            rarity, rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
         VALUES (?, ?, 'review-1', 5, 0, 'common', 5, 0, 0, NULL, ?, ?)`,
      )
      .run(
        retryChestId,
        retryDay,
        `${retryDay}T12:00:00.000Z`,
        `${retryDay}T12:00:00.000Z`,
      );
    const firstTap = await retryHarness.repo.attemptMissionChestUpgrade(
      retryChestId,
    );
    assert.equal(firstTap.succeeded, false);
    assert.equal(firstTap.finished, false);
    assert.equal(firstTap.chest.opened, false);
    assert.equal(firstTap.awardedStone, null);
    assert.equal(firstTap.awardedFragments, null);
    assert.equal(
      (await retryHarness.repo.getDailyMissionOverview(retryDay)).stoneBalance,
      0,
      "A failed first tap does not pay Stone early.",
    );
    const secondTap = await retryHarness.repo.attemptMissionChestUpgrade(
      retryChestId,
    );
    assert.equal(secondTap.finished, false);
    assert.equal(secondTap.chest.opened, false);
    const finalTap = await retryHarness.repo.attemptMissionChestUpgrade(
      retryChestId,
    );
    assert.equal(finalTap.finished, true);
    assert.equal(finalTap.chest.opened, true);
    assert.equal(finalTap.awardedStone, finalTap.chest.finalStone);
    assert.deepEqual(
      finalTap.awardedFragments,
      missionChests.chestFragmentReward(
        retryChestId,
        finalTap.chest.rarity,
        finalTap.chest.ruleSet,
      ),
    );
    await assert.rejects(
      () => retryHarness.repo.attemptMissionChestUpgrade(retryChestId),
      /đã được mở/,
    );

    let superChestId;
    let superChestRarity = "common";
    for (let index = 0; index < 100_000 && !superChestId; index += 1) {
      const candidate = `storage-super-${index}`;
      if (!missionChests.hasSuperUpgradeChance(candidate)) continue;
      let rarity = "common";
      let thirdAttemptFailedAtRare = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const upgrade = missionChests.resolveChestUpgrade(
          candidate,
          attempt,
          rarity,
          3,
          true,
        );
        if (!upgrade.success) {
          thirdAttemptFailedAtRare = attempt === 3 && rarity === "rare";
          break;
        }
        rarity = upgrade.rarity;
      }
      if (thirdAttemptFailedAtRare) {
        superChestId = candidate;
        superChestRarity = rarity;
      }
    }
    assert.ok(
      superChestId,
      "A special chest can reach its guaranteed fourth attempt.",
    );
    harness.db
      .prepare(
        `INSERT INTO mission_chests
        (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity, rule_set, super_upgrade,
          opened, final_stone, created_at, updated_at)
       VALUES (?, '2026-12-30', 'review-1', 3, 3, ?, 3, 1, 0, NULL, ?, ?)`,
      )
      .run(
        superChestId,
        superChestRarity,
        "2026-12-30T12:00:00.000Z",
        "2026-12-30T12:00:00.000Z",
      );
    const superResult =
      await harness.repo.attemptMissionChestUpgrade(superChestId);
    assert.equal(
      superResult.chest.upgradeAttempts,
      4,
      "The fourth attempt is persisted by SQLite.",
    );
    assert.equal(
      superResult.chest.rarity,
      "epic",
      "The special fourth attempt reaches Platinum, not Corvi.",
    );
    assert.equal(superResult.chest.opened, true);
    assert.equal(
      superResult.awardedStone,
      150,
      "A Platinum chest awards the fixed total exactly once.",
    );
    assert.equal(superResult.awardedStatue, null);
    await harness.repo.recordReviewSessionResult({
      sessionId: "qualified-session-0",
      startedAt: new Date(`${day}T12:00:00`).getTime(),
      activeDurationMs: 0,
      maxCombo: 0,
      reviewedCount: 30,
      correctCount: correctCountByGrade[requiredGrade],
      grade: requiredGrade,
      completed: true,
    });
    let seededCommonPieces = 0;
    const missionIds = ["review-1", "add-words-1", "lesson-1", "grade-1"];
    for (
      let offset = 0;
      seededCommonPieces < 100 && offset < 200;
      offset += 1
    ) {
      const candidate = new Date(Date.UTC(2025, 0, 1 + offset))
        .toISOString()
        .slice(0, 10);
      for (const missionId of missionIds) {
        const seededId = `seed-${candidate}-${missionId}`;
        if (missionChests.resolveChestUpgrade(seededId, 1).success) continue;
        harness.db
          .prepare(
            `INSERT INTO mission_chests
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              opened, final_stone, created_at, updated_at)
           VALUES (?, ?, ?, 1, 1, 'common', 1, 1, ?, ?)`,
          )
          .run(
            seededId,
            candidate,
            missionId,
            "2026-11-01T12:00:00.000Z",
            "2026-11-01T12:00:00.000Z",
          );
        seededCommonPieces += 1;
        if (seededCommonPieces === 100) break;
      }
    }
    assert.equal(
      seededCommonPieces,
      100,
      "Test fixture seeds 100 valid common chest fragments.",
    );
    const commonBeforeCraft = await harness.repo.getMissionCollectionOverview();
    await assert.rejects(
      () => harness.repo.craftCollectionArtwork("common"),
      /mở hết tượng/,
    );
    assert.equal(
      (await harness.repo.getMissionCollectionOverview()).fragments.common,
      0,
      "Existing Common fragments are removed from the collection balance.",
    );
    assert.equal(commonBeforeCraft.fragments.common, 0);

    let legendaryPieces = 0;
    for (let offset = 0; legendaryPieces < 10 && offset < 10000; offset += 1) {
      const chestId = `legendary-progress-${offset}`;
      const reward = missionChests.chestFragmentReward(chestId, "legendary", 5);
      if (reward.legendary === 0) continue;
      const chestDay = new Date(Date.UTC(2024, 0, 1 + offset))
        .toISOString()
        .slice(0, 10);
      harness.db
        .prepare(
          `INSERT INTO mission_chests
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts,
              rarity, rule_set, super_upgrade, opened, final_stone,
              created_at, updated_at)
           VALUES (?, ?, 'review-1', 5, 3, 'legendary', 5, 0, 1, 1000, ?, ?)`,
        )
        .run(
          chestId,
          chestDay,
          `${chestDay}T08:00:00.000Z`,
          `${chestDay}T08:00:00.000Z`,
        );
      legendaryPieces += reward.legendary;
    }
    assert.ok(legendaryPieces >= 10);
    const beforeLegendaryUnlock =
      await harness.repo.getMissionCollectionOverview();
    const firstLegendaryCraft =
      await harness.repo.craftCollectionArtwork("legendary");
    const alreadyOwnedLegendary = beforeLegendaryUnlock.crafts.some(
      (craft) => craft.rarity === "legendary",
    );
    assert.equal(
      firstLegendaryCraft.artworkId === collectionArtworks.FIRST_STATUE_ID,
      !alreadyOwnedLegendary,
      "The first Legendary unlock is Hồ Chí Minh; later ones avoid repeats.",
    );
    assert.equal(
      (await harness.repo.getMissionCollectionOverview()).fragments.legendary,
      beforeLegendaryUnlock.fragments.legendary - 10,
      "Unlocking a statue consumes exactly 10 matching fragments.",
    );

    const unlockedArtworkIds = new Set(
      (await harness.repo.getMissionCollectionOverview()).crafts.map(
        (craft) => craft.artworkId,
      ),
    );
    let duplicateTestIndex = 5_000_000;
    for (const artwork of collectionArtworks.COLLECTION_ARTWORKS) {
      if (unlockedArtworkIds.has(artwork.id)) continue;
      harness.db
        .prepare(
          `INSERT INTO collection_crafts
            (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
           VALUES (?, ?, ?, ?, ?, 0)`,
        )
        .run(
          `cycle2-${artwork.rarity}-${duplicateTestIndex}`,
          artwork.rarity,
          duplicateTestIndex,
          artwork.id,
          "2026-12-29T12:00:00.000Z",
        );
      duplicateTestIndex += 1;
    }
    const duplicateBalanceBefore =
      await harness.repo.getMissionCollectionOverview();
    let duplicateChestId;
    for (let index = 0; index < 100_000; index += 1) {
      const candidate = `duplicate-corvi-compensation-${index}`;
      if (missionChests.hasSuperUpgradeChance(candidate)) continue;
      const firstUpgrade = missionChests.resolveChestUpgrade(
        candidate,
        1,
        "rare",
        5,
        false,
      );
      const secondUpgrade = firstUpgrade.success
        ? missionChests.resolveChestUpgrade(
            candidate,
            2,
            firstUpgrade.rarity,
            5,
            false,
          )
        : null;
      if (
        firstUpgrade.success &&
        firstUpgrade.rarity === "epic" &&
        secondUpgrade?.success &&
        secondUpgrade.rarity === "legendary"
      ) {
        duplicateChestId = candidate;
        break;
      }
    }
    assert.ok(duplicateChestId, "A test chest can reach Corvi.");
    harness.db
      .prepare(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, upgrade_attempts,
            rarity, rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
         VALUES (?, '2099-12-29', 'review-3', 5, 0, 'rare', 5, 0, 0,
            NULL, '2099-12-29T12:00:00.000Z', '2099-12-29T12:00:00.000Z')`,
      )
      .run(duplicateChestId);
    await harness.repo.attemptMissionChestUpgrade(duplicateChestId);
    const duplicateResult =
      await harness.repo.attemptMissionChestUpgrade(duplicateChestId);
    assert.ok(duplicateResult.awardedStatue);
    assert.equal(
      duplicateResult.compensatedPieces,
      20,
      "A repeated Corvi statue grants 20 fragments.",
    );
    const duplicateCraftRow = harness.db
      .prepare(
        `SELECT rarity, piece_cost AS pieceCost FROM collection_crafts
         WHERE craft_id = ?`,
      )
      .get(`cycle2-corvi-${duplicateChestId}`);
    assert.equal(duplicateCraftRow.pieceCost, -20);
    assert.equal(
      (await harness.repo.getMissionCollectionOverview()).fragments[
        duplicateCraftRow.rarity
      ],
      duplicateBalanceBefore.fragments[duplicateCraftRow.rarity] +
        duplicateResult.awardedFragments[duplicateCraftRow.rarity] +
        20,
      "A duplicate Corvi reward adds 20 fragments beyond the chest's own drop.",
    );
    assert.deepEqual(
      await harness.repo.getMissionCorviStatueReward(duplicateChestId),
      {
        artwork: duplicateResult.awardedStatue,
        compensationPieces: 20,
      },
      "Duplicate compensation remains visible when the chest is reopened.",
    );

    const secondOverview = await harness.repo.getDailyMissionOverview(day);
    const storedStone = harness.db
      .prepare(
        `SELECT
          COALESCE((SELECT SUM(stone) FROM daily_mission_awards), 0) +
          COALESCE((SELECT SUM(final_stone) FROM mission_chests WHERE opened = 1), 0) +
          COALESCE((SELECT SUM(combo_length) FROM review_combo_rewards), 0)
          AS total`,
      )
      .get().total;
    assert.equal(
      secondOverview.stoneBalance,
      storedStone,
      "Removing previously saved Common fragments does not grant Stone.",
    );
    assert.equal(secondOverview.chests.length, 0);
    assert.equal(
      secondOverview.missions.find((mission) => mission.type === "grade")
        .rewarded,
      true,
    );

    const nextDay = candidateDays[candidateDays.indexOf(day) + 1];
    const nextDayOverview = await harness.repo.getDailyMissionOverview(nextDay);
    assert.ok(
      nextDayOverview.missions.every(
        (mission) => mission.progress === 0 && !mission.rewarded,
      ),
      "Daily progress resets on the next day.",
    );
    assert.equal(
      nextDayOverview.stoneBalance,
      secondOverview.stoneBalance,
      "Previously earned Stone carries forward.",
    );

    harness.db
      .prepare(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, upgrade_attempts,
            rarity, rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
         VALUES ('old-untouched-chest', '2026-10-01', 'review-2', 3, 0,
            'common', 1, 0, 0, NULL, '2026-10-01T12:00:00.000Z',
            '2026-10-01T12:00:00.000Z')`,
      )
      .run();
    await harness.repo.getDailyMissionOverview(nextDay);
    const migratedChest = harness.db
      .prepare(
        "SELECT rarity, rule_set, super_upgrade FROM mission_chests WHERE chest_id = ?",
      )
      .get("old-untouched-chest");
    assert.equal(migratedChest.rule_set, 6);
    assert.equal(migratedChest.rarity, "uncommon");
    assert.equal(
      migratedChest.super_upgrade,
      Number(missionChests.hasSuperUpgradeChance("old-untouched-chest")),
      "Only an untouched chest receives the new rules and deterministic lucky state.",
    );

    const migrationDay = "2026-11-12";
    await migrationSetup.repo.getDailyMissionOverview(migrationDay);
    let prematurelyClosedChestId;
    for (let index = 0; index < 100_000; index += 1) {
      const candidate = `reopen-storage-${index}`;
      if (
        !missionChests.hasSuperUpgradeChance(candidate) &&
        !missionChests.resolveChestUpgrade(
          candidate,
          1,
          "common",
          4,
          false,
        ).success
      ) {
        prematurelyClosedChestId = candidate;
        break;
      }
    }
    assert.ok(prematurelyClosedChestId);
    const preservedArtwork = collectionArtworks.COLLECTION_ARTWORKS.find(
      (item) => item.id === collectionArtworks.FIRST_STATUE_ID,
    );
    migrationSetup.db
      .prepare(
        `INSERT INTO mission_chests
          (chest_id, mission_day, mission_id, base_stone, upgrade_attempts,
            rarity, rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
         VALUES (?, ?, 'review-1', 5, 1, 'common', 4, 0, 1, 25, ?, ?)`,
      )
      .run(
        prematurelyClosedChestId,
        migrationDay,
        `${migrationDay}T08:00:00.000Z`,
        `${migrationDay}T08:01:00.000Z`,
      );
    migrationSetup.db
      .prepare(
        `INSERT INTO collection_crafts
           (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
         VALUES ('craft-legendary-1', 'legendary', 1, ?, ?, 100)`,
      )
      .run(preservedArtwork.id, `${migrationDay}T08:02:00.000Z`);
    const fragmentBalanceBeforeMigration = (
      await migrationSetup.repo.getMissionCollectionOverview()
    ).fragments;
    const reclaimedChestFragments = missionChests.chestFragmentReward(
      prematurelyClosedChestId,
      "common",
      4,
    );
    const expectedFragmentsAfterChestCorrection = Object.fromEntries(
      Object.keys(fragmentBalanceBeforeMigration).map((rarity) => [
        rarity,
        Math.max(
          0,
          fragmentBalanceBeforeMigration[rarity] -
            reclaimedChestFragments[rarity],
        ),
      ]),
    );
    migrationSetup.db.exec("PRAGMA user_version = 19");
    migrationSetup.db.close();
    migrationAfterUpdate = createRepository(
      migrationRoot,
      "2026-11-13T12:00:00",
    );
    const reopenedEarlyChest =
      await migrationAfterUpdate.repo.getMissionChest(
        prematurelyClosedChestId,
      );
    assert.equal(reopenedEarlyChest?.opened, false);
    assert.equal(reopenedEarlyChest?.finalStone, null);
    assert.equal(reopenedEarlyChest?.upgradeAttempts, 1);
    const migratedOverview =
      await migrationAfterUpdate.repo.getDailyMissionOverview(migrationDay);
    assert.equal(
      migratedOverview.stoneBalance,
      0,
      "The early Stone payout is reclaimed when the chest is reopened.",
    );
    const migratedCollection =
      await migrationAfterUpdate.repo.getMissionCollectionOverview();
    assert.deepEqual(
      migratedCollection.fragments,
      expectedFragmentsAfterChestCorrection,
    );
    assert.equal(
      migratedCollection.crafts.length,
      0,
      "Previously owned paintings are removed from the statue collection.",
    );
    assert.deepEqual(
      migrationAfterUpdate.db
        .prepare(
          `SELECT spend_id AS spendId, rarity, piece_cost AS pieceCost
           FROM collection_piece_spends`,
        )
        .all()
        .map((row) => ({ ...row })),
      [
        {
          spendId: "legacy:craft-legendary-1",
          rarity: "legendary",
          pieceCost: 100,
        },
      ],
      "Spent pieces are preserved without keeping the painting record.",
    );
    assert.equal(
      migrationAfterUpdate.db
        .prepare("SELECT value FROM sync_state WHERE key = 'pending'")
        .get().value,
      "1",
      "The reopened chest is queued for account sync.",
    );

    const costMigrationRoot = mkdtempSync(
      join(tmpdir(), "vocabflow-statue-cost-migration-"),
    );
    let costMigrationSetup;
    let costMigrationAfterUpdate;
    try {
      costMigrationSetup = createRepository(
        costMigrationRoot,
        "2026-11-13T12:00:00",
      );
      await costMigrationSetup.repo.getMissionCollectionOverview();
      const firstStatue = collectionArtworks.COLLECTION_ARTWORKS.find(
        (item) => item.id === collectionArtworks.FIRST_STATUE_ID,
      );
      costMigrationSetup.db
        .prepare(
          `INSERT INTO collection_crafts
            (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
           VALUES ('cycle2-legendary-10000001', 'legendary', 10000001, ?, ?, 100)`,
        )
        .run(firstStatue.id, "2026-11-13T12:00:00.000Z");
      costMigrationSetup.db.exec("PRAGMA user_version = 26");
      costMigrationSetup.db.close();
      costMigrationSetup = undefined;

      costMigrationAfterUpdate = createRepository(
        costMigrationRoot,
        "2026-11-14T12:00:00",
      );
      await costMigrationAfterUpdate.repo.getMissionCollectionOverview();
      assert.equal(
        costMigrationAfterUpdate.db
          .prepare(
            "SELECT piece_cost AS pieceCost FROM collection_crafts WHERE craft_id = 'cycle2-legendary-10000001'",
          )
          .get().pieceCost,
        100,
        "The cost migration preserves already saved statue unlock records.",
      );
      costMigrationAfterUpdate.db
        .prepare(
          `INSERT INTO collection_crafts
            (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
           VALUES ('cycle2-rare-10000002', 'rare', 10000002, ?, ?, 10)`,
        )
        .run(
          collectionArtworks.COLLECTION_ARTWORKS.find(
            (item) => item.rarity === "rare",
          ).id,
          "2026-11-14T12:00:00.000Z",
        );
      assert.equal(
        costMigrationAfterUpdate.db
          .prepare(
            "SELECT piece_cost AS pieceCost FROM collection_crafts WHERE craft_id = 'cycle2-rare-10000002'",
          )
          .get().pieceCost,
        10,
        "The migrated table accepts the new 10-fragment unlock cost.",
      );
    } finally {
      costMigrationSetup?.db.close();
      costMigrationAfterUpdate?.db.close();
      rmSync(costMigrationRoot, { recursive: true, force: true });
    }
  } finally {
    harness.db.close();
    rmSync(root, { recursive: true, force: true });
    timeHarness.db.close();
    rmSync(timeRoot, { recursive: true, force: true });
    comboHarness.db.close();
    rmSync(comboRoot, { recursive: true, force: true });
    retryHarness?.db?.close();
    rmSync(retryRoot, { recursive: true, force: true });
    migrationAfterUpdate?.db.close();
    if (migrationSetup.db && !migrationAfterUpdate) migrationSetup.db.close();
    rmSync(migrationRoot, { recursive: true, force: true });
  }
  console.log(
    "Daily mission storage, chest award/opening, legacy Stone preservation, and exactly-once reward passed.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
