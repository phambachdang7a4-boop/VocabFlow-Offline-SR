/**
 * Pure calendar-day SRS. No React, SQLite, network, or implicit clock.
 * The level is the checkpoint the learner will be tested on next.
 */
// First learning is due immediately; all later offsets use the same anchor.
export const REVIEW_DAY_OFFSETS = [0, 1, 3, 7, 14, 30] as const;
export const WRONG_ANSWER_LEVEL_PENALTY = 1;
export type SrsLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface SrsProgress {
  frozen: boolean;
  level: SrsLevel;
  learnedOn: string;
  nextReviewOn: string | null;
  completed: boolean;
  reviewCount: number;
  lastReviewedOn: string | null;
}

function calendarDate(day: string): Date {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(day)) throw new Error('Ngày ôn không hợp lệ.');
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) {
    throw new Error('Ngày ôn không hợp lệ.');
  }
  return date;
}

/** Convert a device timestamp to its local calendar day (not its UTC day). */
export function localDay(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Ngày ôn không hợp lệ.');
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  calendarDate(day);
  return day;
}

/** UTC arithmetic on date-only values avoids 23/25-hour DST-day errors. */
export function addDays(day: string, amount: number): string {
  if (!Number.isInteger(amount)) throw new Error('Số ngày ôn không hợp lệ.');
  const date = calendarDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function initialProgress(learnedOn: string): SrsProgress {
  return {
    frozen: false,
    level: 1,
    learnedOn,
    nextReviewOn: addDays(learnedOn, REVIEW_DAY_OFFSETS[0]),
    completed: false,
    reviewCount: 0,
    lastReviewedOn: null,
  };
}

export function isDue(progress: SrsProgress, today: string): boolean {
  calendarDate(today);
  if (progress.frozen || progress.completed || progress.nextReviewOn === null) return false;
  calendarDate(progress.nextReviewOn);
  return progress.nextReviewOn <= today;
}

/** Recalculate an existing schedule without resetting its level or history. */
export function rescheduleProgress(progress: SrsProgress): SrsProgress {
  if (progress.frozen || progress.completed) return { ...progress, nextReviewOn: null };
  if (!Number.isInteger(progress.level) || progress.level < 1 || progress.level > 6) {
    throw new Error('Cấp ôn không hợp lệ.');
  }
  const checkpoint = addDays(progress.learnedOn, REVIEW_DAY_OFFSETS[progress.level - 1]);
  const earliest = progress.lastReviewedOn ? addDays(progress.lastReviewedOn, 1) : checkpoint;
  return { ...progress, nextReviewOn: checkpoint > earliest ? checkpoint : earliest };
}

export function freezeProgress(progress: SrsProgress): SrsProgress {
  return { ...progress, frozen: true, nextReviewOn: null };
}

export function unfreezeProgress(progress: SrsProgress, today: string): SrsProgress {
  calendarDate(today);
  const checkpoint = addDays(progress.learnedOn, REVIEW_DAY_OFFSETS[5]);
  const earliest = progress.lastReviewedOn ? addDays(progress.lastReviewedOn, 1) : today;
  const nextReviewOn = [checkpoint, earliest, today].sort().at(-1)!;
  return { ...progress, frozen: false, completed: false, level: 6, nextReviewOn };
}

export function applyReview(progress: SrsProgress, correct: boolean, today: string): SrsProgress {
  if (!Number.isInteger(progress.level) || progress.level < 1 || progress.level > 6) {
    throw new Error('Cấp ôn không hợp lệ.');
  }
  if (!isDue(progress, today)) throw new Error('Từ này chưa đến hạn ôn hoặc đã hoàn tất.');
  const reviewed = {
    ...progress,
    // Merely saving a word is not a study session. Anchor on the first answer.
    learnedOn: progress.level === 1 && progress.reviewCount === 0 ? today : progress.learnedOn,
    reviewCount: progress.reviewCount + 1,
    lastReviewedOn: today,
  };
  if (correct && progress.level === 6) {
    return { ...reviewed, completed: true, nextReviewOn: null };
  }
  const level = (correct
    ? progress.level + 1
    : Math.max(1, progress.level - WRONG_ANSWER_LEVEL_PENALTY)) as SrsLevel;
  const tomorrow = addDays(today, 1);
  const originalCheckpoint = addDays(reviewed.learnedOn, REVIEW_DAY_OFFSETS[level - 1]);
  return {
    ...reviewed,
    level,
    completed: false,
    // Failure retreats one level, never restarts the learning date.
    // Missed checkpoints advance at most once per calendar day.
    nextReviewOn: correct && originalCheckpoint > tomorrow ? originalCheckpoint : tomorrow,
  };
}
