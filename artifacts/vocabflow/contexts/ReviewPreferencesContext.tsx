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
  writeReviewPreferences,
} from "@/data/review-preferences";
import {
  DEFAULT_TIMEBOUND_REVIEW_MINUTES,
  DEFAULT_REVIEW_WORD_LIMIT,
  isReviewTimeboundMinutes,
  isReviewWordLimit,
  type ReviewWordLimit,
  type ReviewTimeboundMinutes,
} from "@/domain/review-modes";

type ReviewPreferencesValue = {
  wordLimit: ReviewWordLimit;
  timeboundMinutes: ReviewTimeboundMinutes;
  ready: boolean;
  saving: boolean;
  error: string | null;
  setWordLimit: (value: ReviewWordLimit) => Promise<void>;
  setTimeboundMinutes: (value: ReviewTimeboundMinutes) => Promise<void>;
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
  const [timeboundMinutes, setTimeboundMinutesState] =
    useState<ReviewTimeboundMinutes>(DEFAULT_TIMEBOUND_REVIEW_MINUTES);
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
        setTimeboundMinutesState(preferences.timeboundMinutes);
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

  const savePreferences = useCallback(
    async (next: {
      wordLimit: ReviewWordLimit;
      timeboundMinutes: ReviewTimeboundMinutes;
    }) => {
      if (!mounted.current || savingRef.current) return;
      if (!isReviewWordLimit(next.wordLimit)) {
        setError("Số từ mỗi phiên ôn tập không hợp lệ.");
        return;
      }
      if (!isReviewTimeboundMinutes(next.timeboundMinutes)) {
        setError("Thời lượng Timebound không hợp lệ.");
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setError(null);
      try {
        await writeReviewPreferences(next);
        if (mounted.current) {
          setWordLimitState(next.wordLimit);
          setTimeboundMinutesState(next.timeboundMinutes);
        }
      } catch {
        if (mounted.current) {
          setError("Không thể lưu cài đặt ôn tập. Lựa chọn cũ vẫn được giữ.");
        }
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    },
    [],
  );

  const setWordLimit = useCallback(async (next: ReviewWordLimit) => {
    if (!mounted.current || savingRef.current) return;
    await savePreferences({ wordLimit: next, timeboundMinutes });
  }, [savePreferences, timeboundMinutes]);
  const setTimeboundMinutes = useCallback(
    async (next: ReviewTimeboundMinutes) => {
      if (!mounted.current || savingRef.current) return;
      await savePreferences({ wordLimit, timeboundMinutes: next });
    },
    [savePreferences, wordLimit],
  );

  const value = useMemo(
    () => ({
      wordLimit,
      timeboundMinutes,
      ready,
      saving,
      error,
      setWordLimit,
      setTimeboundMinutes,
      retryLoad,
    }),
    [
      wordLimit,
      timeboundMinutes,
      ready,
      saving,
      error,
      setWordLimit,
      setTimeboundMinutes,
      retryLoad,
    ],
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
