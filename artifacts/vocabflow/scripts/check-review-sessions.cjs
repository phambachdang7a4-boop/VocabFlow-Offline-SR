const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createRepository } = require("./test-support.cjs");

const root = mkdtempSync(join(tmpdir(), "vocabflow-review-sessions-"));
let harness;

(async () => {
  harness = createRepository(root, "2026-11-08T12:00:00");
  await harness.repo.getReviewStatistics("2026-11-08");
  harness.db
    .prepare(
      `INSERT INTO review_day_statistics
        (review_day, reviewed_count, correct_count, session_count)
       VALUES (?, ?, ?, ?)`,
    )
    .run("2026-11-08", 4, 3, 7);
  harness.db
    .prepare(
      `INSERT INTO device_review_day_statistics
        (review_day, device_id, reviewed_count, correct_count, session_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("2026-11-08", "legacy-device", 4, 3, 7, "2026-11-08T12:00:00.000Z");

  // Emulate a version-9 install, where word review totals existed but session
  // starts had never been recorded.
  harness.db.exec(`
    ALTER TABLE review_day_statistics DROP COLUMN session_count;
    ALTER TABLE device_review_day_statistics DROP COLUMN session_count;
    DROP INDEX IF EXISTS idx_mission_chests_opened;
    DROP TABLE mission_chests;
    CREATE TABLE mission_chests (
      chest_id TEXT PRIMARY KEY NOT NULL,
      mission_day TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
      upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 3),
      rarity TEXT NOT NULL DEFAULT 'common'
        CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
      opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
      final_stone INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (mission_day, mission_id),
      CHECK (
        (opened = 0 AND final_stone IS NULL) OR
        (opened = 1 AND final_stone BETWEEN 1 AND 40)
      )
    );
    INSERT INTO mission_chests
      (chest_id, mission_day, mission_id, base_stone, created_at, updated_at)
    VALUES ('preserved-legacy-chest', '2026-11-08', 'review-1', 3,
      '2026-11-08T12:00:00.000Z', '2026-11-08T12:00:00.000Z');
    PRAGMA user_version = 9;
  `);
  harness.db.close();

  harness = createRepository(root, "2026-11-08T12:00:00");
  const migrated = await harness.repo.getReviewStatistics("2026-11-08");
  assert.equal(
    harness.db.prepare("PRAGMA user_version").get().user_version,
    15,
  );
  assert.equal(migrated.totalSessions, 0);
  assert.equal(migrated.totalReviewed, 4);
  assert.equal(migrated.totalCorrect, 3);
  assert.equal(migrated.monthSessions, 0);
  assert.equal(migrated.monthReviewed, 4);
  const preservedChest = harness.db
    .prepare(
      "SELECT rarity, rule_set, super_upgrade FROM mission_chests WHERE chest_id = ?",
    )
    .get("preserved-legacy-chest");
  assert.equal(preservedChest.rarity, "common");
  assert.equal(
    preservedChest.rule_set,
    1,
    "The chest schema migration assigns old chests the legacy rules.",
  );
  assert.equal(
    preservedChest.super_upgrade,
    0,
    "The chest schema migration does not add the special fourth attempt to old chests.",
  );

  await harness.repo.recordReviewSessionStart();
  const afterStart = await harness.repo.getReviewStatistics("2026-11-08");
  assert.equal(afterStart.totalSessions, 1);
  assert.equal(afterStart.weekSessions, 1);
  assert.equal(afterStart.totalReviewed, 4);
  assert.equal(afterStart.totalCorrect, 3);
  const deviceStats = harness.db
    .prepare(
      `SELECT session_count FROM device_review_day_statistics
       WHERE review_day = ? AND device_id = ?`,
    )
    .get("2026-11-08", "test-device-id");
  assert.equal(deviceStats.session_count, 1);
})()
  .then(() =>
    console.log("Review session statistics and migration checks passed."),
  )
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      harness?.db?.close();
    } catch {}
    rmSync(root, { recursive: true, force: true });
  });
