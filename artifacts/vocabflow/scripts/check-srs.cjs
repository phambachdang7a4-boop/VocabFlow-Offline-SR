const assert = require('node:assert/strict');
const { srs } = require('./test-support.cjs');
const { initialProgress, applyReview, isDue, addDays, localDay, rescheduleProgress, REVIEW_DAY_OFFSETS } = srs;

const start = '2026-01-01';
let progress = initialProgress(start);
assert.deepEqual([...REVIEW_DAY_OFFSETS], [0, 1, 3, 7, 14, 30]);
assert.equal(progress.nextReviewOn, start);
assert.equal(isDue(progress, start), true, 'New words are ready to learn immediately');
assert.equal(isDue(progress, '2025-12-31'), false);
assert.equal(isDue(progress, '2026-01-02'), true);
assert.equal(isDue(progress, '2026-02-01'), true, 'Include overdue words');
assert.throws(() => applyReview(progress, true, '2025-12-31'), /chưa đến hạn/);
for (let i = 0; i < REVIEW_DAY_OFFSETS.length; i++) {
  const due = addDays(start, REVIEW_DAY_OFFSETS[i]);
  assert.equal(progress.level, i + 1);
  assert.equal(progress.nextReviewOn, due);
  const before = { ...progress };
  const next = applyReview(progress, true, due);
  assert.deepEqual(progress, before, 'Pure function does not mutate input');
  assert.equal(next.reviewCount, i + 1);
  assert.equal(next.lastReviewedOn, due);
  progress = next;
}
assert.equal(progress.completed, true);
assert.equal(progress.level, 6);
assert.equal(progress.nextReviewOn, null);
assert.equal(isDue(progress, '2027-01-01'), false);
const oldSchedule = {
  ...initialProgress(start), level: 3, reviewCount: 2,
  lastReviewedOn: '2026-01-02', nextReviewOn: '2026-01-06',
};
const migrated = rescheduleProgress(oldSchedule);
assert.equal(migrated.nextReviewOn, '2026-01-04');
assert.equal(migrated.level, 3);
assert.equal(migrated.reviewCount, 2);
assert.equal(migrated.learnedOn, start);
assert.equal(oldSchedule.nextReviewOn, '2026-01-06', 'Migration is pure');
assert.equal(rescheduleProgress({ ...oldSchedule, lastReviewedOn: '2026-02-01' }).nextReviewOn, '2026-02-02');
assert.equal(rescheduleProgress({ ...initialProgress(start), reviewCount: 1, lastReviewedOn: start }).nextReviewOn, '2026-01-02', 'Do not repeat a failed level 1 on the same day');
assert.equal(rescheduleProgress(progress).nextReviewOn, null);

for (let level = 1; level <= 6; level++) {
  const state = { ...initialProgress(start), level, nextReviewOn: '2026-02-01', reviewCount: 10 };
  const next = applyReview(state, false, '2026-02-01');
  assert.equal(next.level, Math.max(1, level - 1), `Wrong answer at level ${level}`);
  assert.equal(next.completed, false);
  assert.equal(next.nextReviewOn, '2026-02-02');
  assert.equal(next.learnedOn, start);
  assert.equal(next.reviewCount, 11);
  assert.equal(isDue(next, '2026-02-01'), false);
}
const late = applyReview(initialProgress(start), true, '2026-03-01');
assert.equal(late.nextReviewOn, '2026-03-02', 'Do not rush overdue checkpoints in the same day');
assert.equal(late.level, 2);
assert.equal(late.learnedOn, '2026-03-01', 'A new word starts its cycle on the first actual answer');
assert.equal(applyReview(late, true, '2026-03-02').nextReviewOn, '2026-03-04');
const firstWrong = applyReview(initialProgress(start), false, '2026-02-01');
assert.equal(firstWrong.learnedOn, '2026-02-01');
assert.equal(applyReview(firstWrong, false, '2026-02-02').learnedOn, '2026-02-01', 'Later mistakes do not reset first learning');
assert.equal(addDays('2028-02-28', 1), '2028-02-29');
assert.equal(addDays('2026-02-28', 1), '2026-03-01');
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(addDays('2026-03-08', 1), '2026-03-09', 'DST calendar arithmetic');
assert.equal(localDay(new Date(2026, 0, 1, 23, 59, 59)), '2026-01-01');
assert.equal(localDay(new Date(2026, 0, 2, 0, 0, 0)), '2026-01-02');
assert.throws(() => addDays('2026-02-30', 1), /không hợp lệ/);
assert.throws(() => addDays('invalid', 1), /không hợp lệ/);
assert.throws(() => applyReview({ ...initialProgress(start), level: 7 }, true, '2026-01-02'), /không hợp lệ/);
assert.throws(() => localDay(new Date('invalid')), /không hợp lệ/);
console.log(`PASS: six absolute offsets, all failure levels, lower bound, completion, overdue words, late review, calendar boundaries, immutability (${process.env.TZ || 'system timezone'}).`);
