const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository } = require('./test-support.cjs');

const root = mkdtempSync(join(tmpdir(), 'vocabflow-review-sessions-'));
let harness;

(async () => {
  harness = createRepository(root, '2026-11-08T12:00:00');
  await harness.repo.getReviewStatistics('2026-11-08');
  harness.db
    .prepare(
      `INSERT INTO review_day_statistics
        (review_day, reviewed_count, correct_count, session_count)
       VALUES (?, ?, ?, ?)`,
    )
    .run('2026-11-08', 4, 3, 7);
  harness.db
    .prepare(
      `INSERT INTO device_review_day_statistics
        (review_day, device_id, reviewed_count, correct_count, session_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run('2026-11-08', 'legacy-device', 4, 3, 7, '2026-11-08T12:00:00.000Z');

  // Emulate a version-9 install, where word review totals existed but session
  // starts had never been recorded.
  harness.db.exec(`
    ALTER TABLE review_day_statistics DROP COLUMN session_count;
    ALTER TABLE device_review_day_statistics DROP COLUMN session_count;
    PRAGMA user_version = 9;
  `);
  harness.db.close();

  harness = createRepository(root, '2026-11-08T12:00:00');
  const migrated = await harness.repo.getReviewStatistics('2026-11-08');
  assert.equal(harness.db.prepare('PRAGMA user_version').get().user_version, 11);
  assert.equal(migrated.totalSessions, 0);
  assert.equal(migrated.totalReviewed, 4);
  assert.equal(migrated.totalCorrect, 3);
  assert.equal(migrated.monthSessions, 0);
  assert.equal(migrated.monthReviewed, 4);

  await harness.repo.recordReviewSessionStart();
  const afterStart = await harness.repo.getReviewStatistics('2026-11-08');
  assert.equal(afterStart.totalSessions, 1);
  assert.equal(afterStart.weekSessions, 1);
  assert.equal(afterStart.totalReviewed, 4);
  assert.equal(afterStart.totalCorrect, 3);
  const deviceStats = harness.db
    .prepare(
      `SELECT session_count FROM device_review_day_statistics
       WHERE review_day = ? AND device_id = ?`,
    )
    .get('2026-11-08', 'test-device-id');
  assert.equal(deviceStats.session_count, 1);
})()
  .then(() => console.log('Review session statistics and migration checks passed.'))
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
