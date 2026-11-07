import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as storage from '@/data/vocabulary';
import type { VocabularyWord, WordInput } from '@/data/types';

interface VocabularyContextValue {
  words: VocabularyWord[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveWord: (input: WordInput, id?: number) => Promise<void>;
  deleteWord: (id: number) => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextValue | null>(null);
const readError = 'Không thể đọc dữ liệu SQLite trên thiết bị. Hãy thử lại. Không xóa ứng dụng để tránh mất dữ liệu.';
const writeError = 'Không thể lưu thay đổi. Hãy kiểm tra dung lượng trống rồi thử lại.';

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const result = await storage.listWords();
      setWords(result);
      setError(null);
    } catch {
      setError(readError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

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

  const value = useMemo(
    () => ({ words, loading, error, reload, saveWord, deleteWord }),
    [words, loading, error, reload, saveWord, deleteWord],
  );
  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary() {
  const context = useContext(VocabularyContext);
  if (!context) throw new Error('Thiếu VocabularyProvider.');
  return context;
}
