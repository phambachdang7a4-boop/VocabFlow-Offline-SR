const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const {
  advanceReviewCombo,
  activeReviewDuration,
  createReviewSessionSummary,
  formatReviewDuration,
  getReviewGrade,
  isReviewComboMilestone,
  pauseActiveReviewClock,
  resumeActiveReviewClock,
  startActiveReviewClock,
} = loadTs(join(__dirname, '../domain/review-session.ts'));

let activeClock = startActiveReviewClock(1_000);
activeClock = pauseActiveReviewClock(activeClock, 4_000);
activeClock = resumeActiveReviewClock(activeClock, 10_000);
assert.equal(activeReviewDuration(activeClock, 13_000), 6_000);
activeClock = pauseActiveReviewClock(activeClock, 15_000);
assert.equal(activeReviewDuration(activeClock, 30_000), 8_000);
activeClock = resumeActiveReviewClock(activeClock, 40_000);
assert.equal(activeReviewDuration(activeClock, 42_000), 10_000);

let combo = { current: 0, max: 0 };
for (const correct of [true, true, false, true, true, true]) {
  combo = advanceReviewCombo(combo, correct);
}
assert.deepEqual(combo, { current: 3, max: 3 });
assert.deepEqual(
  [4, 5, 9, 10, 24, 25].filter(isReviewComboMilestone),
  [5, 10, 25],
);

const completed = createReviewSessionSummary({
  queue: [1, 2, 3],
  answered: [1, 2, 2, 90],
  correct: [1, 3],
  startedAt: 10_000,
}, 72_500, true);
assert.deepEqual(completed, {
  plannedCount: 3,
  reviewedCount: 2,
  correctCount: 1,
  elapsedMs: 62_500,
  completed: true,
}, 'Only saved answers from the current queue count; duplicate callbacks cannot inflate totals.');
const activeDurationSummary = createReviewSessionSummary({
  queue: [1],
  answered: [1],
  correct: [1],
  startedAt: 10_000,
}, 72_500, true, 12_000);
assert.equal(
  activeDurationSummary.elapsedMs,
  12_000,
  'The result screen uses active study time instead of wall-clock time.',
);

const interrupted = createReviewSessionSummary({
  queue: [1, 2],
  answered: [1],
  correct: [],
  startedAt: 20_000,
}, 24_000, false);
assert.deepEqual(interrupted, {
  plannedCount: 2,
  reviewedCount: 1,
  correctCount: 0,
  elapsedMs: 4_000,
  completed: false,
}, 'Mid-session results count only words that were actually answered.');

const empty = createReviewSessionSummary({
  queue: [1, 2],
  answered: [],
  correct: [],
  startedAt: 50_000,
}, 49_000, false);
assert.equal(empty.reviewedCount, 0);
assert.equal(empty.correctCount, 0);
assert.equal(empty.elapsedMs, 0, 'Clock adjustments cannot produce negative duration.');

assert.equal(formatReviewDuration(0), '00:00');
assert.equal(formatReviewDuration(65_999), '01:05');
assert.equal(formatReviewDuration(3_723_000), '1:02:03');
for (const [correct, total, expected] of [
  [97, 100, 'S+'], [90, 100, 'S'], [89, 100, 'A+'], [85, 100, 'A+'],
  [84, 100, 'A'], [80, 100, 'A'], [79, 100, 'A-'], [75, 100, 'A-'],
  [74, 100, 'B+'], [70, 100, 'B+'], [69, 100, 'B'], [60, 100, 'B'],
  [59, 100, 'B-'], [50, 100, 'B-'], [49, 100, 'C'], [0, 0, 'C'],
]) {
  assert.equal(getReviewGrade(correct, total), expected, `${correct}/${total} must receive grade ${expected}`);
}
for (const [correct, total, expected] of [
  [100, 100, 'S'], [96, 100, 'A+'], [90, 100, 'A+'], [85, 100, 'A'],
  [80, 100, 'A-'], [75, 100, 'B+'], [70, 100, 'B'], [60, 100, 'B-'],
  [50, 100, 'C'], [49, 100, 'C'], [0, 0, 'C'],
]) {
  assert.equal(getReviewGrade(correct, total, false), expected,
    `An interrupted ${correct}/${total} session must be lowered to ${expected}`);
}
console.log('PASS: active-time pause/resume, session summaries, grades, and elapsed-time formatting.');
