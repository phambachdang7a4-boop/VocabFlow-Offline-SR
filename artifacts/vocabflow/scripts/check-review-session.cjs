const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const { createReviewSessionSummary, formatReviewDuration, getReviewGrade } =
  loadTs(join(__dirname, '../domain/review-session.ts'));

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
console.log('PASS: completed and interrupted session summaries, grade thresholds, and elapsed-time formatting.');
