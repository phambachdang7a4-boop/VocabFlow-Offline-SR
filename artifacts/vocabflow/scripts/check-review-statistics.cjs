const assert = require('node:assert/strict');
const { reviewStatistics } = require('./test-support.cjs');

const empty = reviewStatistics.buildReviewStatistics('2026-01-07', { totalSessions: 0, totalReviewed: 0, totalCorrect: 0 }, []);
assert.equal(empty.weekStart, '2026-01-05');
assert.equal(empty.weekEnd, '2026-01-11');
assert.equal(empty.days.length, 7);
assert.equal(empty.weekReviewed, 0);
assert.equal(empty.weekSessions, 0);
assert.equal(empty.weekAccuracy, null);
assert.equal(empty.monthDays.length, 31);
assert.equal(empty.monthAccuracy, null);
assert.equal(empty.monthGrade, null);
assert.equal(empty.days[2].isToday, true);
assert.equal(empty.days[2].grade, null);
assert.deepEqual(
  empty.days.map((day) => day.weekdayLabel),
  ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
);

const stats = reviewStatistics.buildReviewStatistics('2026-01-04', { totalSessions: 8, totalReviewed: 12, totalCorrect: 9 }, [
  { day: '2025-12-29', reviewedCount: 2, correctCount: 1, sessionCount: 1 },
  { day: '2026-01-01', reviewedCount: 4, correctCount: 3, sessionCount: 2 },
  { day: '2026-01-01', reviewedCount: 1, correctCount: 0, sessionCount: 1 },
  {
    day: '2026-01-05',
    reviewedCount: 50,
    correctCount: 50,
    sessionCount: 20,
  },
]);
assert.equal(stats.weekStart, '2025-12-29');
assert.equal(stats.weekEnd, '2026-01-04');
assert.equal(stats.totalReviewed, 12);
assert.equal(stats.lifetimeAccuracy, 75);
assert.equal(stats.weekReviewed, 7);
assert.equal(stats.weekCorrect, 4);
assert.equal(stats.weekSessions, 4);
assert.equal(stats.weekAccuracy, (4 / 7) * 100);
assert.equal(stats.days[0].reviewedCount, 2);
assert.equal(stats.days[3].reviewedCount, 5);
assert.equal(stats.days[3].correctCount, 3);
assert.equal(stats.days[3].accuracy, 60);
assert.equal(stats.days[3].grade, 'B');
assert.equal(stats.days[6].dateLabel, '04/01');
assert.equal(stats.days[6].isToday, true);
assert.equal(stats.monthSessions, 3);
assert.equal(stats.monthReviewed, 5);
assert.equal(stats.monthCorrect, 3);
assert.equal(stats.monthAccuracy, 60);
assert.equal(stats.monthGrade, 'B');
assert.equal(stats.monthDays[0].grade, 'B');
assert.equal(stats.monthDays[4].reviewedCount, 0, 'Future days in the current month remain empty.');
assert.equal(reviewStatistics.reviewMonthRange('2024-02-29').monthEnd, '2024-02-29');
assert.equal(reviewStatistics.shiftReviewMonth('2024-12-01', 1), '2025-01-01');
assert.equal(reviewStatistics.shiftReviewMonth('2025-01-01', -1), '2024-12-01');

assert.throws(() => reviewStatistics.reviewWeekRange('2026-02-30'), /Ngày thống kê/);
assert.throws(() => reviewStatistics.buildReviewStatistics('2026-01-04', { totalSessions: 0, totalReviewed: 1, totalCorrect: 2 }, []), /Tổng thống kê/);
assert.throws(
  () =>
    reviewStatistics.buildReviewStatistics('2026-01-04', { totalSessions: 0, totalReviewed: 0, totalCorrect: 0 }, [
      {
        day: '2026-01-04',
        reviewedCount: 1,
        correctCount: 2,
        sessionCount: 0,
      },
    ]),
  /Số liệu thống kê/,
);
assert.throws(() => reviewStatistics.buildReviewStatistics('2026-01-04', { totalSessions: -1, totalReviewed: 0, totalCorrect: 0 }, []), /Tổng thống kê/);

console.log('PASS: Monday–Sunday local-calendar week, sparse daily counts, duplicate aggregates, accuracy ratios, empty state, date validation.');
