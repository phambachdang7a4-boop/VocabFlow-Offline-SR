import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as storage from '@/data/vocabulary';
import { storageFailureMessage } from '@/data/sqlite-connection';
import type { VocabularyWord, WordInput } from '@/data/types';
import { AppState } from 'react-native';
import { isDue, localDay } from '@/domain/srs';

interface VocabularyContextValue {
  words: VocabularyWord[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveWord: (input: WordInput, id?: number) => Promise<void>;
  deleteWord: (id: number) => Promise<void>;
  recordReview: (id: number, correct: boolean, expectedReviewCount: number) => Promise<void>;
  today: string;
  dueWords: VocabularyWord[];
  frozenWords: VocabularyWord[];
  setWordFrozen: (id: number, frozen: boolean) => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextValue | null>(null);
const readError = 'Không thể đọc dữ liệu SQLite trên thiết bị. Hãy thử lại. Không xóa ứng dụng để tránh mất dữ liệu.';
const writeError = 'Không thể lưu thay đổi. Hãy kiểm tra dung lượng trống rồi thử lại.';

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(() => localDay(new Date()));

  const reload = useCallback(async () => {
    try {
      const result = await storage.listWords();
      setWords(result);
      setError(null);
    } catch (failure) {
      setError(storageFailureMessage(failure, readError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const clock = setInterval(() => setToday(localDay(new Date())), 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setToday(localDay(new Date()));
        void reload();
      }
    });
    return () => { clearInterval(clock); subscription.remove(); };
  }, [reload]);

  const saveWord = useCallback(async (input: WordInput, id?: number) => {
    try {
      await storage.saveWord(input, id);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      const known = ['Vui lòng', 'Nội dung', 'Mã từ', 'Từ này'];
      throw new Error(known.some(prefix => message.startsWith(prefix)) ? message : writeError);
    }
    // A successful commit is successful even if a subsequent refresh fails.
    await reload();
  }, [reload]);

  const deleteWord = useCallback(async (id: number) => {
    try {
      await storage.deleteWord(id);
    } catch {
      throw new Error('Không thể xóa từ. Hãy thử lại.');
    }
    await reload();
  }, [reload]);

  const recordReview = useCallback(async (id: number, correct: boolean, expectedReviewCount: number) => {
    try {
      await storage.recordReview(id, correct, expectedReviewCount);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      const known = ['Câu trả lời', 'Tiến độ từ', 'Từ này'];
      throw new Error(known.some(prefix => message.startsWith(prefix)) ? message : writeError);
    }
    setToday(localDay(new Date()));
    await reload();
  }, [reload]);

  const setWordFrozen = useCallback(async (id: number, frozen: boolean) => {
    try {
      await storage.setWordFrozen(id, frozen);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      throw new Error(message.startsWith('Từ này') || message.startsWith('Trạng thái') ? message : writeError);
    }
    await reload();
  }, [reload]);

  const frozenWords = useMemo(() => words.filter(word => word.frozen), [words]);
  const dueWords = useMemo(
    () => words.filter(word => isDue(word, today)).sort((a, b) =>
      a.nextReviewOn!.localeCompare(b.nextReviewOn!) || a.id - b.id),
    [words, today],
  );
  const value = useMemo(
    () => ({ words, loading, error, reload, saveWord, deleteWord, recordReview, today, dueWords, frozenWords, setWordFrozen }),
    [words, loading, error, reload, saveWord, deleteWord, recordReview, today, dueWords, frozenWords, setWordFrozen],
  );
  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary() {
  const context = useContext(VocabularyContext);
  if (!context) throw new Error('Thiếu VocabularyProvider.');
  return context;
}
