export interface ReviewSessionRecord {
  queue: number[];
  answered: number[];
  correct: number[];
  startedAt: number;
}

export interface ReviewSessionSummary {
  plannedCount: number;
  reviewedCount: number;
  correctCount: number;
  elapsedMs: number;
  completed: boolean;
}

export type ReviewGrade = 'S+' | 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C';

export function getReviewGrade(correctCount: number, reviewedCount: number): ReviewGrade {
  const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0;
  if (accuracy >= 97) return 'S+';
  if (accuracy >= 90) return 'S';
  if (accuracy >= 85) return 'A+';
  if (accuracy >= 80) return 'A';
  if (accuracy >= 75) return 'A-';
  if (accuracy >= 70) return 'B+';
  if (accuracy >= 60) return 'B';
  if (accuracy >= 50) return 'B-';
  return 'C';
}

export function createReviewSessionSummary(
  session: ReviewSessionRecord,
  endedAt: number,
  completed: boolean,
): ReviewSessionSummary {
  const plannedIds = new Set(session.queue);
  const answeredIds = new Set(session.answered.filter(id => plannedIds.has(id)));
  const correctIds = new Set(session.correct.filter(id => answeredIds.has(id)));
  return {
    plannedCount: session.queue.length,
    reviewedCount: answeredIds.size,
    correctCount: correctIds.size,
    elapsedMs: Math.max(0, endedAt - session.startedAt),
    completed,
  };
}

export function formatReviewDuration(durationMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${seconds}`;
}
