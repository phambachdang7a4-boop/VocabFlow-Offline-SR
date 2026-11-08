import { getReviewGrade, type ReviewGrade } from './review-session';

export interface ReviewDayCount {
  day: string;
  reviewedCount: number;
  correctCount: number;
  sessionCount: number;
}

export interface ReviewStatisticsDay extends ReviewDayCount {
  weekdayLabel: string;
  dateLabel: string;
  accuracy: number | null;
  grade: ReviewGrade | null;
  isToday: boolean;
}

export interface ReviewStatistics {
  totalSessions: number;
  totalReviewed: number;
  totalCorrect: number;
  lifetimeAccuracy: number | null;
  weekStart: string;
  weekEnd: string;
  weekReviewed: number;
  weekCorrect: number;
  weekSessions: number;
  weekAccuracy: number | null;
  days: ReviewStatisticsDay[];
  monthStart: string;
  monthEnd: string;
  monthSessions: number;
  monthReviewed: number;
  monthCorrect: number;
  monthAccuracy: number | null;
  monthGrade: ReviewGrade | null;
  monthDays: ReviewStatisticsDay[];
}

export interface ReviewTotals {
  totalSessions: number;
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

export function reviewWeekRange(today: string): {
  weekStart: string;
  weekEnd: string;
} {
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

export function reviewMonthRange(day: string): {
  monthStart: string;
  monthEnd: string;
} {
  const date = dateFromDay(day);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

export function shiftReviewMonth(month: string, offset: number): string {
  const date = dateFromDay(month);
  if (!Number.isSafeInteger(offset)) throw new Error('Số tháng cần dịch không hợp lệ.');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1)).toISOString().slice(0, 10);
}

export function buildReviewStatistics(
  today: string,
  totals: ReviewTotals,
  weeklyRows: readonly ReviewDayCount[],
  monthlyRows: readonly ReviewDayCount[] = weeklyRows,
  selectedMonth = `${today.slice(0, 7)}-01`,
): ReviewStatistics {
  dateFromDay(today);
  const { weekStart, weekEnd } = reviewWeekRange(today);
  const { monthStart, monthEnd } = reviewMonthRange(selectedMonth);
  const rowsByDay = aggregateRows(weeklyRows, weekStart, weekEnd);
  const monthDataEnd = monthStart.slice(0, 7) === today.slice(0, 7) && today < monthEnd ? today : monthEnd;
  const rowsByMonthDay = aggregateRows(monthlyRows, monthStart, monthDataEnd);

  const days = WEEKDAYS.map((weekdayLabel, index) => {
    const date = new Date(`${weekStart}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    return buildStatisticsDay(rowsByDay.get(day) ?? emptyDay(day), weekdayLabel, today);
  });
  const weekReviewed = days.reduce((sum, day) => sum + day.reviewedCount, 0);
  const weekCorrect = days.reduce((sum, day) => sum + day.correctCount, 0);
  const weekSessions = days.reduce((sum, day) => sum + day.sessionCount, 0);

  const monthDays: ReviewStatisticsDay[] = [];
  for (let date = new Date(`${monthStart}T00:00:00.000Z`); date.toISOString().slice(0, 10) <= monthEnd; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.toISOString().slice(0, 10);
    const weekdayLabel = WEEKDAYS[(date.getUTCDay() + 6) % 7];
    monthDays.push(buildStatisticsDay(rowsByMonthDay.get(day) ?? emptyDay(day), weekdayLabel, today));
  }
  const monthReviewed = monthDays.reduce((sum, day) => sum + day.reviewedCount, 0);
  const monthCorrect = monthDays.reduce((sum, day) => sum + day.correctCount, 0);
  const monthSessions = monthDays.reduce((sum, day) => sum + day.sessionCount, 0);

  if (
    !Number.isSafeInteger(totals.totalSessions) ||
    totals.totalSessions < 0 ||
    !Number.isSafeInteger(totals.totalReviewed) ||
    totals.totalReviewed < 0 ||
    !Number.isSafeInteger(totals.totalCorrect) ||
    totals.totalCorrect < 0 ||
    totals.totalCorrect > totals.totalReviewed
  ) {
    throw new Error('Tổng thống kê không hợp lệ.');
  }

  return {
    ...totals,
    lifetimeAccuracy: ratio(totals.totalCorrect, totals.totalReviewed),
    weekStart,
    weekEnd,
    weekReviewed,
    weekCorrect,
    weekSessions,
    weekAccuracy: ratio(weekCorrect, weekReviewed),
    days,
    monthStart,
    monthEnd,
    monthSessions,
    monthReviewed,
    monthCorrect,
    monthAccuracy: ratio(monthCorrect, monthReviewed),
    monthGrade: monthReviewed ? getReviewGrade(monthCorrect, monthReviewed) : null,
    monthDays,
  };
}

function aggregateRows(rows: readonly ReviewDayCount[], start: string, end: string): Map<string, ReviewDayCount> {
  const result = new Map<string, ReviewDayCount>();
  for (const row of rows) {
    dateFromDay(row.day);
    const sessionCount = row.sessionCount ?? 0;
    if (
      !Number.isSafeInteger(row.reviewedCount) ||
      row.reviewedCount < 0 ||
      !Number.isSafeInteger(row.correctCount) ||
      row.correctCount < 0 ||
      row.correctCount > row.reviewedCount ||
      !Number.isSafeInteger(sessionCount) ||
      sessionCount < 0
    ) {
      throw new Error('Số liệu thống kê không hợp lệ.');
    }
    if (row.day < start || row.day > end) continue;
    const existing = result.get(row.day);
    result.set(
      row.day,
      existing
        ? {
            day: row.day,
            reviewedCount: existing.reviewedCount + row.reviewedCount,
            correctCount: existing.correctCount + row.correctCount,
            sessionCount: existing.sessionCount + sessionCount,
          }
        : {
            day: row.day,
            reviewedCount: row.reviewedCount,
            correctCount: row.correctCount,
            sessionCount,
          },
    );
  }
  return result;
}

function emptyDay(day: string): ReviewDayCount {
  return { day, reviewedCount: 0, correctCount: 0, sessionCount: 0 };
}

function buildStatisticsDay(counts: ReviewDayCount, weekdayLabel: string, today: string): ReviewStatisticsDay {
  return {
    ...counts,
    weekdayLabel,
    dateLabel: `${counts.day.slice(8, 10)}/${counts.day.slice(5, 7)}`,
    accuracy: ratio(counts.correctCount, counts.reviewedCount),
    grade: counts.reviewedCount ? getReviewGrade(counts.correctCount, counts.reviewedCount) : null,
    isToday: counts.day === today,
  };
}
