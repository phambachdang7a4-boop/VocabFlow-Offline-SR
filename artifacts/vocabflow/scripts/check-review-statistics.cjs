const assert = require('node:assert/strict');
const { reviewStatistics } = require('./test-support.cjs');

const empty = reviewStatistics.buildReviewStatistics('2026-01-07', { totalReviewed: 0, totalCorrect: 0 }, []);
assert.equal(empty.weekStart, '2026-01-05');
assert.equal(empty.weekEnd, '2026-01-11');
assert.equal(empty.days.length, 7);
assert.equal(empty.weekReviewed, 0);
assert.equal(empty.weekAccuracy, null);
assert.equal(empty.days[2].isToday, true);
assert.deepEqual(empty.days.map(day => day.weekdayLabel), ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);

const stats = reviewStatistics.buildReviewStatistics(
  '2026-01-04',
  { totalReviewed: 12, totalCorrect: 9 },
  [
    { day: '2025-12-29', reviewedCount: 2, correctCount: 1 },
    { day: '2026-01-01', reviewedCount: 4, correctCount: 3 },
    { day: '2026-01-01', reviewedCount: 1, correctCount: 0 },
    { day: '2026-01-05', reviewedCount: 50, correctCount: 50 },
  ],
);
assert.equal(stats.weekStart, '2025-12-29');
assert.equal(stats.weekEnd, '2026-01-04');
assert.equal(stats.totalReviewed, 12);
assert.equal(stats.lifetimeAccuracy, 75);
assert.equal(stats.weekReviewed, 7);
assert.equal(stats.weekCorrect, 4);
assert.equal(stats.weekAccuracy, (4 / 7) * 100);
assert.equal(stats.days[0].reviewedCount, 2);
assert.equal(stats.days[3].reviewedCount, 5);
assert.equal(stats.days[3].correctCount, 3);
assert.equal(stats.days[3].accuracy, 60);
assert.equal(stats.days[6].dateLabel, '04/01');
assert.equal(stats.days[6].isToday, true);

assert.throws(() => reviewStatistics.reviewWeekRange('2026-02-30'), /Ngày thống kê/);
assert.throws(() => reviewStatistics.buildReviewStatistics(
  '2026-01-04', { totalReviewed: 1, totalCorrect: 2 }, [],
), /Tổng thống kê/);
assert.throws(() => reviewStatistics.buildReviewStatistics(
  '2026-01-04', { totalReviewed: 0, totalCorrect: 0 },
  [{ day: '2026-01-04', reviewedCount: 1, correctCount: 2 }],
), /Số liệu thống kê/);

console.log('PASS: Monday–Sunday local-calendar week, sparse daily counts, duplicate aggregates, accuracy ratios, empty state, date validation.');
