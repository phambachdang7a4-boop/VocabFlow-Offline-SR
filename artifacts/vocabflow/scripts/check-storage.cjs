// Actual repository SQL on Node SQLite, not an Android/Expo bridge test.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository } = require('./test-support.cjs');
const root = mkdtempSync(join(tmpdir(), 'vocabflow-check-'));
const legacyRoot = mkdtempSync(join(tmpdir(), 'vocabflow-legacy-'));
const harness = createRepository(root);
const legacyHarness = createRepository(legacyRoot);
let upgradedHarness;

(async () => {
  const { repo } = harness;
  assert.equal((await repo.listWords()).length, 0, 'No seeded words');
  const input = { term: ' Test Word ', meaning: 'Nghĩa kiểm thử', ipa: '', example: '', note: '' };
  await repo.saveWord(input);
  const [word] = await repo.listWords();
  assert.equal(word.term, 'Test Word');
  assert.equal(word.reviewCount, 0);
  assert.equal(word.level, 1);
  assert.equal(word.nextReviewOn, '2026-01-01');
  harness.setDay('2025-12-31');
  await assert.rejects(repo.recordReview(word.id, true, 0), /chưa đến hạn/);
  harness.setDay('2026-01-01');
  await assert.rejects(repo.saveWord({ ...input, term: 'TEST   WORD' }), /đã có/);
  await assert.rejects(repo.saveWord({ ...input, meaning: ' ' }), /Vui lòng/);
  await repo.saveWord({ ...input, meaning: 'Nghĩa đã sửa' }, word.id);
  const [edited] = await repo.listWords();
  assert.equal(edited.meaning, 'Nghĩa đã sửa');
  assert.equal(edited.createdAt, word.createdAt);
  assert.equal(edited.learnedOn, word.learnedOn);
  assert.equal(edited.nextReviewOn, word.nextReviewOn);
  await assert.rejects(repo.saveWord({ ...input, term: 'missing' }, 999), /không còn/);
  const concurrent = await Promise.allSettled([
    repo.saveWord({ ...input, term: 'concurrent' }),
    repo.saveWord({ ...input, term: 'CONCURRENT' }),
  ]);
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);

  harness.setDay('2026-01-01');
  const grades = await Promise.allSettled([
    repo.recordReview(word.id, true, 0), repo.recordReview(word.id, false, 0),
  ]);
  assert.equal(grades.filter(result => result.status === 'fulfilled').length, 1, 'One answer per revision');
  let reviewed = (await repo.listWords()).find(item => item.id === word.id);
  assert.equal(reviewed.level, 2);
  assert.equal(reviewed.reviewCount, 1);
  assert.equal(reviewed.nextReviewOn, '2026-01-02');
  harness.setDay('2026-01-02');
  await repo.recordReview(word.id, true, 1);
  reviewed = (await repo.listWords()).find(item => item.id === word.id);
  assert.equal(reviewed.level, 3);
  assert.equal(reviewed.nextReviewOn, '2026-01-04', 'Absolute day 3, not 3 days after the last review');
  harness.setDay('2026-01-04');
  await repo.recordReview(word.id, false, 2);
  reviewed = (await repo.listWords()).find(item => item.id === word.id);
  assert.equal(reviewed.level, 2, 'Wrong answer retreats only one level');
  assert.equal(reviewed.learnedOn, '2026-01-01', 'Never reset learning date');
  assert.equal(reviewed.nextReviewOn, '2026-01-05');
  const dailyStats = await repo.getReviewStatistics('2026-01-04');
  assert.equal(dailyStats.totalReviewed, 3);
  assert.equal(dailyStats.totalCorrect, Number(grades[0].status === 'fulfilled') + 1);
  assert.equal(dailyStats.weekReviewed, 3);
  assert.equal(dailyStats.days.find(day => day.day === '2026-01-01').reviewedCount, 1);
  assert.equal(dailyStats.days.find(day => day.day === '2026-01-02').correctCount, 1);
  assert.equal(dailyStats.days.find(day => day.day === '2026-01-04').correctCount, 0);
  await repo.saveWord({ ...input, note: 'Updated without resetting SRS' }, word.id);
  const afterEdit = (await repo.listWords()).find(item => item.id === word.id);
  assert.equal(afterEdit.reviewCount, 3);
  assert.equal(afterEdit.level, 2);
  assert.equal(afterEdit.nextReviewOn, '2026-01-05');

  const persisted = new DatabaseSync(join(root, 'vocabflow.db'));
  assert.equal(persisted.prepare('SELECT COUNT(*) AS n FROM words').get().n, 2);
  const savedProgress = persisted.prepare('SELECT level, review_count FROM word_progress WHERE word_id = ?').get(word.id);
  assert.equal(savedProgress.level, 2);
  assert.equal(savedProgress.review_count, 3);
  persisted.close();
  await repo.deleteWord(word.id);
  assert.equal(harness.db.prepare('SELECT COUNT(*) AS n FROM word_progress WHERE word_id = ?').get(word.id).n, 0);
  assert.equal((await repo.getReviewStatistics('2026-01-04')).totalReviewed, 3, 'Daily aggregates survive word deletion.');
  assert.equal((await repo.listWords()).length, 1);
  await assert.rejects(repo.deleteWord(word.id), /không còn/);
  await assert.rejects(repo.recordReview(word.id, false, 3), /không còn/);

  const second = (await repo.listWords())[0];
  await repo.recordReview(second.id, true, 0);
  const firstStudiedLate = (await repo.listWords())[0];
  assert.equal(firstStudiedLate.learnedOn, '2026-01-04');
  assert.equal(firstStudiedLate.nextReviewOn, '2026-01-05');
  harness.db.prepare(`UPDATE word_progress SET level = 6, next_review_on = '2026-01-04' WHERE word_id = ?`).run(second.id);
  await repo.recordReview(second.id, true, 1);
  const finished = (await repo.listWords())[0];
  assert.equal(finished.completed, true);
  assert.equal(finished.nextReviewOn, null);
  await assert.rejects(repo.recordReview(second.id, true, 2), /hoàn tất/);
  harness.db.close();
  const reopened = new DatabaseSync(join(root, 'vocabflow.db'));
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM words').get().n, 1);
  assert.equal(reopened.prepare('SELECT completed FROM word_progress').get().completed, 1);
  reopened.close();

  // Construct a real Step 1 database to verify the non-destructive migration.
  const legacy = new DatabaseSync(join(legacyRoot, 'vocabflow.db'));
  legacy.exec(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT NOT NULL,
      normalized_term TEXT NOT NULL UNIQUE, meaning TEXT NOT NULL,
      ipa TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE word_progress (
      word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
      review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0)
    );
    INSERT INTO words VALUES (17, 'kept', 'kept', 'được giữ', '', '', 'ghi chú', '2025-12-01T12:00:00Z', '2025-12-02T12:00:00Z');
    INSERT INTO word_progress VALUES (17, 0);
    PRAGMA user_version = 1;
  `);
  legacy.close();
  const [migrated] = await legacyHarness.repo.listWords();
  assert.equal(migrated.id, 17);
  assert.equal(migrated.meaning, 'được giữ');
  assert.equal(migrated.note, 'ghi chú');
  assert.equal(migrated.createdAt, '2025-12-01T12:00:00Z');
  assert.equal(migrated.updatedAt, '2025-12-02T12:00:00Z');
  assert.equal(migrated.learnedOn, '2025-12-01');
  assert.equal(migrated.nextReviewOn, '2025-12-01');
  assert.equal(legacyHarness.db.prepare('PRAGMA user_version').get().user_version, 9);
  assert.equal((await legacyHarness.repo.listWords()).length, 1);
  // Restore a previous-schedule (v2) fixture with real history, then reopen.
  await legacyHarness.repo.saveWord({ ...input, term: 'finished' });
  const finishedLegacy = (await legacyHarness.repo.listWords()).find(item => item.term === 'finished');
  legacyHarness.db.prepare(
    `UPDATE word_progress SET level = 3, review_count = 2, last_reviewed_on = '2025-12-02',
       next_review_on = '2025-12-06' WHERE word_id = 17`,
  ).run();
  legacyHarness.db.prepare(
    `UPDATE word_progress SET level = 6, review_count = 6, completed = 1,
       last_reviewed_on = '2026-02-01', next_review_on = NULL WHERE word_id = ?`,
  ).run(finishedLegacy.id);
  legacyHarness.db.exec(`
    DROP INDEX IF EXISTS idx_words_sync_id;
    ALTER TABLE words DROP COLUMN sync_id;
    ALTER TABLE word_progress DROP COLUMN sync_updated_at;
    DROP TABLE IF EXISTS sync_word_tombstones;
    DROP TABLE IF EXISTS device_review_day_statistics;
    DROP TABLE IF EXISTS sync_state;
    DROP TABLE IF EXISTS course_word_selection;
    DROP TABLE IF EXISTS course_lesson_progress;
    DROP TABLE IF EXISTS review_day_statistics;
    ALTER TABLE word_progress DROP COLUMN frozen;
    PRAGMA user_version = 2;
  `);
  legacyHarness.db.close();
  upgradedHarness = createRepository(legacyRoot);
  const upgraded = await upgradedHarness.repo.listWords();
  const kept = upgraded.find(item => item.id === 17);
  assert.equal(kept.level, 3);
  assert.equal(kept.reviewCount, 2);
  assert.equal(kept.lastReviewedOn, '2025-12-02');
  assert.equal(kept.nextReviewOn, '2025-12-04', 'Existing checkpoint recalculated to new offset');
  assert.equal(kept.learnedOn, '2025-12-01');
  assert.equal(kept.note, 'ghi chú');
  const stillFinished = upgraded.find(item => item.id === finishedLegacy.id);
  assert.equal(stillFinished.completed, true);
  assert.equal(stillFinished.nextReviewOn, null);
  assert.equal(stillFinished.reviewCount, 6);
    assert.equal(upgradedHarness.db.prepare('PRAGMA user_version').get().user_version, 9);
  console.log('PASS: CRUD, immediate new learning, persistent SRS, atomic grading, unchanged edit progress, completion, non-destructive old database and schedule migrations.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  for (const item of [harness, legacyHarness, upgradedHarness]) { try { item?.db?.close(); } catch {} }
  rmSync(root, { recursive: true, force: true });
  rmSync(legacyRoot, { recursive: true, force: true });
});
