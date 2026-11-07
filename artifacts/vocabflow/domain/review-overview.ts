import type { VocabularyWord } from '../data/types';
import { addDays, isDue, type SrsLevel } from './srs';

export interface ReviewOverview {
  total: number;
  levels: { level: SrsLevel; count: number }[];
  frozen: number;
  completed: number;
  dueWords: VocabularyWord[];
  nextReviewOn: string | null;
}

/** Chart includes every saved word, including frozen/completed words at their
 * stored level. Eligibility and the next deadline exclude both statuses. */
export function reviewOverview(words: readonly VocabularyWord[], today: string): ReviewOverview {
  addDays(today, 0);
  const levels: ReviewOverview['levels'] = [1, 2, 3, 4, 5, 6].map(level => ({ level: level as SrsLevel, count: 0 }));
  const dueWords: VocabularyWord[] = [];
  let frozen = 0;
  let completed = 0;
  let nextReviewOn: string | null = null;
  for (const word of words) {
    if (!Number.isInteger(word.level) || word.level < 1 || word.level > 6) throw new Error('Cấp ôn không hợp lệ.');
    levels[word.level - 1].count++;
    if (word.frozen) frozen++;
    if (word.completed) completed++;
    if (isDue(word, today)) dueWords.push(word);
    else if (!word.frozen && !word.completed && word.nextReviewOn
      && (!nextReviewOn || word.nextReviewOn < nextReviewOn)) nextReviewOn = word.nextReviewOn;
  }
  dueWords.sort((a, b) => a.nextReviewOn!.localeCompare(b.nextReviewOn!) || a.id - b.id);
  return { total: words.length, levels, frozen, completed, dueWords, nextReviewOn };
}

/** SRS stores calendar days: a due day begins at midnight in device local time,
 * not UTC and not "24 hours from now". Native Date handles DST transitions. */
export function secondsUntilReview(day: string, nowMs: number): number {
  addDays(day, 0);
  if (!Number.isFinite(nowMs)) throw new Error('Thời gian ôn không hợp lệ.');
  const [year, month, date] = day.split('-').map(Number);
  const deadline = new Date(year, month - 1, date).getTime();
  return Math.max(0, Math.ceil((deadline - nowMs) / 1000));
}

export function formatReviewCountdown(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Thời gian đếm ngược không hợp lệ.');
  const remaining = Math.ceil(seconds);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor(remaining % 86400 / 3600);
  const minutes = Math.floor(remaining % 3600 / 60);
  const clock = [hours, minutes, remaining % 60].map(value => String(value).padStart(2, '0')).join(':');
  return `${days ? `${days} ngày ` : ''}${clock}`;
}
