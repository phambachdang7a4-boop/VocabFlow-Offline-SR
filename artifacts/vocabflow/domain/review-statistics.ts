export interface ReviewDayCount {
  day: string;
  reviewedCount: number;
  correctCount: number;
}

export interface ReviewStatisticsDay extends ReviewDayCount {
  weekdayLabel: string;
  dateLabel: string;
  accuracy: number | null;
  isToday: boolean;
}

export interface ReviewStatistics {
  totalReviewed: number;
  totalCorrect: number;
  lifetimeAccuracy: number | null;
  weekStart: string;
  weekEnd: string;
  weekReviewed: number;
  weekCorrect: number;
  weekAccuracy: number | null;
  days: ReviewStatisticsDay[];
}

export interface ReviewTotals {
  totalReviewed: number;
  totalCorrect: number;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

function dateFromDay(day: string): Date {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(day)) throw new Error('Ngày thống kê không hợp lệ.');
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
    throw new Error('Ngày thống kê không hợp lệ.');
  }
  return date;
}

function ratio(correct: number, reviewed: number): number | null {
  return reviewed > 0 ? (correct / reviewed) * 100 : null;
}

export function reviewWeekRange(today: string): { weekStart: string; weekEnd: string } {
  const monday = dateFromDay(today);
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

export function buildReviewStatistics(
  today: string,
  totals: ReviewTotals,
  weeklyRows: readonly ReviewDayCount[],
): ReviewStatistics {
  dateFromDay(today);
  const { weekStart, weekEnd } = reviewWeekRange(today);
  const rowsByDay = new Map<string, ReviewDayCount>();
  for (const row of weeklyRows) {
    dateFromDay(row.day);
    if (!Number.isSafeInteger(row.reviewedCount) || row.reviewedCount < 0 ||
        !Number.isSafeInteger(row.correctCount) || row.correctCount < 0 ||
        row.correctCount > row.reviewedCount) {
      throw new Error('Số liệu thống kê không hợp lệ.');
    }
    if (row.day < weekStart || row.day > weekEnd) continue;
    const existing = rowsByDay.get(row.day);
    rowsByDay.set(row.day, existing
      ? { day: row.day, reviewedCount: existing.reviewedCount + row.reviewedCount, correctCount: existing.correctCount + row.correctCount }
      : row);
  }

  const days = WEEKDAYS.map((weekdayLabel, index) => {
    const date = new Date(`${weekStart}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    const counts = rowsByDay.get(day) ?? { day, reviewedCount: 0, correctCount: 0 };
    return {
      ...counts,
      weekdayLabel,
      dateLabel: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
      accuracy: ratio(counts.correctCount, counts.reviewedCount),
      isToday: day === today,
    };
  });
  const weekReviewed = days.reduce((sum, day) => sum + day.reviewedCount, 0);
  const weekCorrect = days.reduce((sum, day) => sum + day.correctCount, 0);

  if (!Number.isSafeInteger(totals.totalReviewed) || totals.totalReviewed < 0 ||
      !Number.isSafeInteger(totals.totalCorrect) || totals.totalCorrect < 0 ||
      totals.totalCorrect > totals.totalReviewed) {
    throw new Error('Tổng thống kê không hợp lệ.');
  }

  return {
    ...totals,
    lifetimeAccuracy: ratio(totals.totalCorrect, totals.totalReviewed),
    weekStart,
    weekEnd,
    weekReviewed,
    weekCorrect,
    weekAccuracy: ratio(weekCorrect, weekReviewed),
    days,
  };
}
