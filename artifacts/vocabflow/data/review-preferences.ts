import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_REVIEW_WORD_LIMIT,
  isReviewWordLimit,
  type ReviewWordLimit,
} from "@/domain/review-modes";

export const REVIEW_PREFERENCES_KEY = "vocabflow.review-preferences.v1";

export type ReviewPreferences = {
  wordLimit: ReviewWordLimit;
};

export const DEFAULT_REVIEW_PREFERENCES: ReviewPreferences = {
  wordLimit: DEFAULT_REVIEW_WORD_LIMIT,
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
  return { wordLimit: (parsed as ReviewPreferences).wordLimit };
}

export async function writeReviewWordLimit(
  wordLimit: ReviewWordLimit,
): Promise<void> {
  if (!isReviewWordLimit(wordLimit)) {
    throw new Error("Số từ mỗi phiên ôn tập không hợp lệ.");
  }
  await AsyncStorage.setItem(
    REVIEW_PREFERENCES_KEY,
    JSON.stringify({ wordLimit }),
  );
}
