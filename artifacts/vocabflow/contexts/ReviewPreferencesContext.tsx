import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  readReviewPreferences,
  writeReviewWordLimit,
} from "@/data/review-preferences";
import {
  DEFAULT_REVIEW_WORD_LIMIT,
  isReviewWordLimit,
  type ReviewWordLimit,
} from "@/domain/review-modes";

type ReviewPreferencesValue = {
  wordLimit: ReviewWordLimit;
  ready: boolean;
  saving: boolean;
  error: string | null;
  setWordLimit: (value: ReviewWordLimit) => Promise<void>;
  retryLoad: () => Promise<void>;
};

const ReviewPreferencesContext =
  createContext<ReviewPreferencesValue | null>(null);

export function ReviewPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [wordLimit, setWordLimitState] = useState<ReviewWordLimit>(
    DEFAULT_REVIEW_WORD_LIMIT,
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const savingRef = useRef(false);

  const retryLoad = useCallback(async () => {
    setReady(false);
    try {
      const preferences = await readReviewPreferences();
      if (mounted.current) {
        setWordLimitState(preferences.wordLimit);
        setError(null);
      }
    } catch {
      if (mounted.current) {
        setError("Không thể đọc giới hạn ôn tập. Hãy thử tải lại.");
      }
    } finally {
      if (mounted.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void retryLoad();
    return () => {
      mounted.current = false;
    };
  }, [retryLoad]);

  const setWordLimit = useCallback(async (next: ReviewWordLimit) => {
    if (!mounted.current || savingRef.current) return;
    if (!isReviewWordLimit(next)) {
      setError("Số từ mỗi phiên ôn tập không hợp lệ.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await writeReviewWordLimit(next);
      if (mounted.current) setWordLimitState(next);
    } catch {
      if (mounted.current) {
        setError("Không thể lưu giới hạn ôn tập. Lựa chọn cũ vẫn được giữ.");
      }
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }, []);

  const value = useMemo(
    () => ({ wordLimit, ready, saving, error, setWordLimit, retryLoad }),
    [wordLimit, ready, saving, error, setWordLimit, retryLoad],
  );

  return (
    <ReviewPreferencesContext.Provider value={value}>
      {children}
    </ReviewPreferencesContext.Provider>
  );
}

export function useReviewPreferences(): ReviewPreferencesValue {
  const value = useContext(ReviewPreferencesContext);
  if (!value) throw new Error("Thiếu ReviewPreferencesProvider.");
  return value;
}
