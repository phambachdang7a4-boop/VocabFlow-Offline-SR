export const REVIEW_WORD_LIMIT_OPTIONS = [50, 100, 200, 400] as const;
export type ReviewWordLimit = (typeof REVIEW_WORD_LIMIT_OPTIONS)[number];

export const DEFAULT_REVIEW_WORD_LIMIT: ReviewWordLimit = 100;
export const TIMEBOUND_REVIEW_DURATION_MS = 10 * 60 * 1000;

export const REVIEW_MODE_OPTIONS = [
  {
    id: "basic",
    label: "Cơ Bản",
    description: "Xem thông tin sau mỗi câu trả lời.",
  },
  {
    id: "speed",
    label: "Speed Mode",
    description: "Lưu đáp án rồi chuyển câu ngay.",
  },
  {
    id: "timebound",
    label: "Timebound · 10 phút",
    description: "Tự tổng kết khi hết 10 phút.",
  },
] as const;

export type ReviewMode = (typeof REVIEW_MODE_OPTIONS)[number]["id"];

export function isReviewWordLimit(value: unknown): value is ReviewWordLimit {
  return REVIEW_WORD_LIMIT_OPTIONS.some((option) => option === value);
}

export function limitReviewQueue<T>(
  words: readonly T[],
  limit: ReviewWordLimit,
): T[] {
  if (!isReviewWordLimit(limit)) {
    throw new Error("Số từ mỗi phiên ôn tập không hợp lệ.");
  }
  return words.slice(0, limit);
}

export function remainingTimeboundReviewMs(
  elapsedMs: number,
  durationMs = TIMEBOUND_REVIEW_DURATION_MS,
): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(durationMs)) {
    throw new Error("Thời gian ôn tập không hợp lệ.");
  }
  return Math.max(0, durationMs - Math.max(0, elapsedMs));
}

export function formatReviewCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
