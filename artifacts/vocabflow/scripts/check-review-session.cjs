const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const { createReviewSessionSummary, formatReviewDuration } =
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
console.log('PASS: completed and interrupted session summaries, saved-answer counts, accuracy inputs, and elapsed-time formatting.');
