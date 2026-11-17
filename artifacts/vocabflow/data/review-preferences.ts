import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_TIMEBOUND_REVIEW_MINUTES,
  DEFAULT_REVIEW_WORD_LIMIT,
  isReviewTimeboundMinutes,
  isReviewWordLimit,
  type ReviewWordLimit,
  type ReviewTimeboundMinutes,
} from "@/domain/review-modes";

export const REVIEW_PREFERENCES_KEY = "vocabflow.review-preferences.v1";

export type ReviewPreferences = {
  wordLimit: ReviewWordLimit;
  timeboundMinutes: ReviewTimeboundMinutes;
};

export const DEFAULT_REVIEW_PREFERENCES: ReviewPreferences = {
  wordLimit: DEFAULT_REVIEW_WORD_LIMIT,
  timeboundMinutes: DEFAULT_TIMEBOUND_REVIEW_MINUTES,
};

export async function readReviewPreferences(): Promise<ReviewPreferences> {
  const stored = await AsyncStorage.getItem(REVIEW_PREFERENCES_KEY);
  if (stored === null) return { ...DEFAULT_REVIEW_PREFERENCES };

  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !isReviewWordLimit((parsed as ReviewPreferences).wordLimit)
  ) {
    throw new Error("Cài đặt số từ mỗi phiên ôn tập không hợp lệ.");
  }
  const timeboundMinutes =
    (parsed as Partial<ReviewPreferences>).timeboundMinutes ??
    DEFAULT_TIMEBOUND_REVIEW_MINUTES;
  if (!isReviewTimeboundMinutes(timeboundMinutes)) {
    throw new Error("Cài đặt thời lượng Timebound không hợp lệ.");
  }
  return {
    wordLimit: (parsed as ReviewPreferences).wordLimit,
    timeboundMinutes,
  };
}

export async function writeReviewPreferences(
  preferences: ReviewPreferences,
): Promise<void> {
  if (!isReviewWordLimit(preferences.wordLimit)) {
    throw new Error("Số từ mỗi phiên ôn tập không hợp lệ.");
  }
  if (!isReviewTimeboundMinutes(preferences.timeboundMinutes)) {
    throw new Error("Thời lượng Timebound không hợp lệ.");
  }
  await AsyncStorage.setItem(
    REVIEW_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
}
