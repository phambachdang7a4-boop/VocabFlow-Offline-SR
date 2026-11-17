export const REVIEW_WORD_LIMIT_OPTIONS = [50, 100, 200, 400] as const;
export type ReviewWordLimit = (typeof REVIEW_WORD_LIMIT_OPTIONS)[number];

export const DEFAULT_REVIEW_WORD_LIMIT: ReviewWordLimit = 100;
export const TIMEBOUND_REVIEW_DURATION_OPTIONS = [5, 10, 15, 20] as const;
export type ReviewTimeboundMinutes =
  (typeof TIMEBOUND_REVIEW_DURATION_OPTIONS)[number];
export const DEFAULT_TIMEBOUND_REVIEW_MINUTES: ReviewTimeboundMinutes = 10;
export const TIMEBOUND_REVIEW_DURATION_MS =
  DEFAULT_TIMEBOUND_REVIEW_MINUTES * 60 * 1000;

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
    label: "Timebound",
    description: "Tự tổng kết theo thời gian đã chọn.",
  },
] as const;

export type ReviewMode = (typeof REVIEW_MODE_OPTIONS)[number]["id"];

export function isReviewWordLimit(value: unknown): value is ReviewWordLimit {
  return REVIEW_WORD_LIMIT_OPTIONS.some((option) => option === value);
}

export function isReviewTimeboundMinutes(
  value: unknown,
): value is ReviewTimeboundMinutes {
  return TIMEBOUND_REVIEW_DURATION_OPTIONS.some((option) => option === value);
}

export function timeboundReviewDurationMs(
  minutes: ReviewTimeboundMinutes = DEFAULT_TIMEBOUND_REVIEW_MINUTES,
): number {
  if (!isReviewTimeboundMinutes(minutes)) {
    throw new Error("Thời lượng Timebound không hợp lệ.");
  }
  return minutes * 60 * 1000;
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
