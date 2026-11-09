const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository, loadTs, missionChests, collectionArtworks } = require('./test-support.cjs');

const missionDomain = loadTs(join(__dirname, '../domain/daily-missions.ts'));
const candidateDays = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
const day = candidateDays.find((candidate) =>
  missionDomain.evaluateDailyMissions(candidate, {
    reviewedCount: 0,
    addedWordCount: 0,
    completedLessonCount: 0,
    qualifiedGradeCount: 0,
  }, []).some((mission) => mission.type === 'grade'),
);
const gradeMission = missionDomain.evaluateDailyMissions(day, {
  reviewedCount: 0,
  addedWordCount: 0,
  completedLessonCount: 0,
  qualifiedGradeCount: 0,
}, []).find((mission) => mission.type === 'grade');
const root = mkdtempSync(join(tmpdir(), 'vocabflow-daily-missions-'));
const harness = createRepository(root, `${day}T12:00:00`);

(async () => {
  try {
    for (let index = 0; index < gradeMission.target; index += 1) {
      await harness.repo.recordReviewSessionResult({
        sessionId: `qualified-session-${index}`,
        startedAt: new Date(`${day}T12:00:00`).getTime(),
        reviewedCount: 30,
        correctCount: 27,
        grade: 'A',
        completed: true,
      });
    }

    const firstOverview = await harness.repo.getDailyMissionOverview(day);
    const firstGradeMission = firstOverview.missions.find((mission) => mission.type === 'grade');
    assert.equal(firstGradeMission.progress, firstGradeMission.target);
    assert.equal(firstGradeMission.rewarded, true, 'The eligible grade mission grants one chest.');
    assert.equal(firstOverview.stoneBalance, 0, 'Stone inside the chest is not credited before it is opened.');
    assert.equal(firstOverview.chests.length, 1, 'A completed mission creates one unopened chest.');
    assert.equal(firstOverview.chests[0].ruleSet, 2, 'New missions use the rarity upgrade rules.');
    assert.equal(firstOverview.chests[0].rarity, missionChests.startingRarityForMission(gradeMission.id), 'The chest starts at its mission slot tier.');
    assert.equal(firstOverview.chests[0].superUpgrade, missionChests.hasSuperUpgradeChance(firstOverview.chests[0].chestId));

    harness.db.prepare(
      'INSERT INTO daily_mission_awards (mission_day, mission_id, stone, completed_at) VALUES (?, ?, ?, ?)',
    ).run('2026-11-01', 'review-1', 4, '2026-11-01T12:00:00.000Z');

    let openedChest;
    const chestId = firstOverview.chests[0].chestId;
    const attemptLimit = missionChests.maxChestUpgradeAttempts(
      openedChest?.ruleSet ?? firstOverview.chests[0].ruleSet,
      openedChest?.superUpgrade ?? firstOverview.chests[0].superUpgrade,
    );
    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      const outcome = await harness.repo.attemptMissionChestUpgrade(chestId);
      openedChest = outcome.chest;
      if (outcome.finished) break;
      assert.equal(outcome.succeeded, true, 'A failed upgrade finalizes the chest rather than allowing a reroll.');
    }
    assert.equal(openedChest.opened, true, 'The chest is finalized after failure or the final upgrade.');
    const openedOverview = await harness.repo.getDailyMissionOverview(day);
    assert.equal(openedOverview.chests.length, 0, 'Opened chests leave the unopened queue.');
    assert.equal(openedOverview.stoneBalance, 4 + openedChest.finalStone, 'Opening awards chest Stone while preserving legacy Stone.');
    await assert.rejects(() => harness.repo.attemptMissionChestUpgrade(chestId), /đã được mở/);

    let superChestId;
    let superChestRarity = 'common';
    for (let index = 0; index < 100_000 && !superChestId; index += 1) {
      const candidate = `storage-super-${index}`;
      if (!missionChests.hasSuperUpgradeChance(candidate)) continue;
      let rarity = 'common';
      let succeeded = true;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const upgrade = missionChests.resolveChestUpgrade(candidate, attempt, rarity, 2, true);
        if (!upgrade.success) {
          succeeded = false;
          break;
        }
        rarity = upgrade.rarity;
      }
      if (succeeded) {
        superChestId = candidate;
        superChestRarity = rarity;
      }
    }
    assert.ok(superChestId, 'A special chest can reach its guaranteed fourth attempt.');
    harness.db.prepare(
      `INSERT INTO mission_chests
        (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity, rule_set, super_upgrade,
          opened, final_stone, created_at, updated_at)
       VALUES (?, '2026-12-30', 'review-1', 3, 3, ?, 2, 1, 0, NULL, ?, ?)`,
    ).run(superChestId, superChestRarity, '2026-12-30T12:00:00.000Z', '2026-12-30T12:00:00.000Z');
    const superResult = await harness.repo.attemptMissionChestUpgrade(superChestId);
    assert.equal(superResult.chest.upgradeAttempts, 4, 'The fourth attempt is persisted by SQLite.');
    assert.equal(superResult.chest.rarity, 'legendary', 'The special fourth attempt reaches Corvi.');
    assert.equal(superResult.chest.opened, true);
    assert.equal(superResult.awardedStone, 23, 'The fourth-tier reward is finalized exactly once.');

    let seededCommonPieces = 0;
    const missionIds = ['review-1', 'add-words-1', 'lesson-1', 'grade-1'];
    for (let offset = 0; seededCommonPieces < 20 && offset < 200; offset += 1) {
      const candidate = new Date(Date.UTC(2025, 0, 1 + offset)).toISOString().slice(0, 10);
      for (const missionId of missionIds) {
        const seededId = `seed-${candidate}-${missionId}`;
        if (missionChests.resolveChestUpgrade(seededId, 1).success) continue;
        harness.db.prepare(
          `INSERT INTO mission_chests
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              opened, final_stone, created_at, updated_at)
           VALUES (?, ?, ?, 1, 1, 'common', 1, 1, ?, ?)`,
        ).run(seededId, candidate, missionId, '2026-11-01T12:00:00.000Z', '2026-11-01T12:00:00.000Z');
        seededCommonPieces += 1;
        if (seededCommonPieces === 20) break;
      }
    }
    assert.equal(seededCommonPieces, 20, 'Test fixture seeds 20 valid common chest fragments.');
    const beforeCraft = await harness.repo.getMissionCollectionOverview();
    const craft = await harness.repo.craftCollectionArtwork('common');
    assert.equal(collectionArtworks.isCollectionArtwork('common', craft.artworkId), true);
    const afterCraft = await harness.repo.getMissionCollectionOverview();
    assert.equal(afterCraft.fragments.common, beforeCraft.fragments.common - 20, 'Crafting consumes exactly 20 same-rarity fragments.');
    assert.equal(afterCraft.crafts.length, 1, 'The crafted artwork is stored exactly once.');
    await assert.rejects(() => harness.repo.craftCollectionArtwork('common'), /đủ 20 mảnh/);

    await harness.repo.recordReviewSessionResult({
      sessionId: 'qualified-session-0',
      startedAt: new Date(`${day}T12:00:00`).getTime(),
      reviewedCount: 30,
      correctCount: 27,
      grade: 'A',
      completed: true,
    });
    const secondOverview = await harness.repo.getDailyMissionOverview(day);
    assert.equal(secondOverview.stoneBalance, openedOverview.stoneBalance + superResult.awardedStone + seededCommonPieces, 'Retrying the same session cannot duplicate rewards; all opened chest Stone remains in the balance.');
    assert.equal(secondOverview.chests.length, 0);
    assert.equal(secondOverview.missions.find((mission) => mission.type === 'grade').rewarded, true);

    const nextDay = candidateDays[candidateDays.indexOf(day) + 1];
    const nextDayOverview = await harness.repo.getDailyMissionOverview(nextDay);
    assert.ok(nextDayOverview.missions.every((mission) => mission.progress === 0 && !mission.rewarded), 'Daily progress resets on the next day.');
    assert.equal(nextDayOverview.stoneBalance, openedOverview.stoneBalance + superResult.awardedStone + seededCommonPieces, 'Previously earned Stone carries forward.');
  } finally {
    harness.db.close();
    rmSync(root, { recursive: true, force: true });
  }
  console.log('Daily mission storage, chest award/opening, legacy Stone preservation, and exactly-once reward passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
