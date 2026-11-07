const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository, loadTs } = require('./test-support.cjs');

const root = mkdtempSync(join(tmpdir(), 'vocabflow-course-'));
const { BASIC_COURSE_LESSONS } = loadTs(join(__dirname, '../data/basic-course.ts'));
const lesson = BASIC_COURSE_LESSONS[0];
let first = createRepository(root, '2026-11-07T12:00:00');
let second;

(async () => {
  const { repo } = first;
  assert.deepEqual(await repo.listWords(), [], 'A new app must not seed personal words.');
  assert.deepEqual(await repo.listCourseProgress(), [], 'A new app must not seed course progress.');

  const [selectedOne, notSelected, selectedTwo] = lesson.words;
  await repo.saveCourseProgress(lesson.id, 1, 'answer');
  await repo.saveCourseSelection(lesson.id, selectedOne.id, true);
  await repo.saveCourseSelection(lesson.id, selectedTwo.id, true);
  assert.deepEqual(await repo.getCourseSelections(lesson.id), [selectedOne.id, selectedTwo.id]);
  const inProgress = await repo.getCourseProgress(lesson.id);
  assert.equal(inProgress.stage, 'answer');
  assert.equal(inProgress.currentIndex, 1);
  assert.equal(inProgress.completedAt, null);

  first.db.close();
  second = createRepository(root, '2026-11-07T12:00:00');
  const resumed = await second.repo.getCourseProgress(lesson.id);
  assert.equal(resumed.stage, 'answer');
  assert.equal(resumed.currentIndex, 1);
  assert.deepEqual(await second.repo.getCourseSelections(lesson.id), [selectedOne.id, selectedTwo.id]);

  const added = await second.repo.finishCourseLesson(lesson.id, [selectedOne.id, selectedTwo.id]);
  assert.equal(added, 2);
  const personalWords = await second.repo.listWords();
  assert.equal(personalWords.length, 2, 'Only explicitly checked senses should be added.');
  assert.deepEqual(
    personalWords.map(word => `${word.term}|${word.meaning}`).sort(),
    [selectedOne, selectedTwo].map(word => `${word.term}|${word.meaning}`).sort(),
  );
  assert.ok(personalWords.every(word => word.level === 1 && word.reviewCount === 0 && word.nextReviewOn === '2026-11-07'));
  assert.ok(!personalWords.some(word => word.term === notSelected.term && word.meaning === notSelected.meaning));
  const completed = await second.repo.getCourseProgress(lesson.id);
  assert.equal(completed.stage, 'completed');
  assert.ok(completed.completedAt);
  assert.equal((await second.repo.listCourseProgress()).length, 1);

  assert.equal(await second.repo.finishCourseLesson(lesson.id, [selectedOne.id, selectedTwo.id]), 0, 'Re-finishing must not create duplicates.');
  assert.equal((await second.repo.listWords()).length, 2);
  assert.equal(second.db.prepare('PRAGMA user_version').get().user_version, 6);
  console.log('PASS: no seeded words; lesson/checklist state survives reopen; only checked senses enter the notebook at SRS level 1; completion and duplicate protection persist in SQLite.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  for (const handle of [first, second]) { try { handle?.db?.close(); } catch {} }
  rmSync(root, { recursive: true, force: true });
});
