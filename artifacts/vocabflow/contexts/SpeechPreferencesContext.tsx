import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  DEFAULT_SPEECH_PREFERENCES,
  readSpeechPreferences,
  writeSpeechPreferences,
  type SpeechPreferences,
} from "@/data/speech-preferences";
import { speakWord as speak, stopSpeaking } from "@/domain/speech";

interface SpeechPreferencesValue extends SpeechPreferences {
  ready: boolean;
  saving: boolean;
  error: string | null;
  setAutoRead: (enabled: boolean) => Promise<void>;
  setSlowRead: (enabled: boolean) => Promise<void>;
  speakWord: (word: string, dictionaryEntryId?: number | null) => Promise<void>;
  stopSpeaking: () => Promise<void>;
  retryLoad: () => Promise<void>;
}

const SpeechPreferencesContext = createContext<SpeechPreferencesValue | null>(
  null,
);

export function SpeechPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<SpeechPreferences>(
    DEFAULT_SPEECH_PREFERENCES,
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  const retryLoad = useCallback(async () => {
    try {
      const stored = await readSpeechPreferences();
      if (mounted.current) {
        setPreferences(stored);
        setError(null);
      }
    } catch {
      if (mounted.current)
        setError(
          "Không thể đọc tùy chỉnh phát âm. Hãy thử tải lại hoặc đổi lựa chọn.",
        );
    } finally {
      if (mounted.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void retryLoad();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void stopSpeaking();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      void stopSpeaking();
    };
  }, [retryLoad]);

  const update = useCallback(async (next: SpeechPreferences) => {
    if (busy.current || !mounted.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await writeSpeechPreferences(next);
      if (mounted.current) setPreferences(next);
      if (!next.autoRead) void stopSpeaking();
    } catch {
      if (mounted.current)
        setError("Không thể lưu tùy chỉnh phát âm. Lựa chọn cũ vẫn được giữ.");
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }, []);

  const setAutoRead = useCallback(
    (enabled: boolean) => update({ ...preferences, autoRead: enabled }),
    [preferences, update],
  );
  const setSlowRead = useCallback(
    (enabled: boolean) => update({ ...preferences, slowRead: enabled }),
    [preferences, update],
  );
  const speakWord = useCallback(
    (word: string, dictionaryEntryId?: number | null) =>
      speak(word, preferences.slowRead, dictionaryEntryId),
    [preferences.slowRead],
  );
  const value = useMemo(
    () => ({
      ...preferences,
      ready,
      saving,
      error,
      setAutoRead,
      setSlowRead,
      speakWord,
      stopSpeaking,
      retryLoad,
    }),
    [
      preferences,
      ready,
      saving,
      error,
      setAutoRead,
      setSlowRead,
      speakWord,
      retryLoad,
    ],
  );

  return (
    <SpeechPreferencesContext.Provider value={value}>
      {children}
    </SpeechPreferencesContext.Provider>
  );
}

export function useSpeechPreferences(): SpeechPreferencesValue {
  const value = useContext(SpeechPreferencesContext);
  if (!value) throw new Error("Thiếu SpeechPreferencesProvider.");
  return value;
}
