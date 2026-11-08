import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import type { CueName } from "uisfx";
import {
  DEFAULT_SOUND_PREFERENCES,
  readSoundPreferences,
  writeSoundPreferences,
  type SoundPreferences,
} from "@/data/sound-preferences";
import { createSoundController } from "@/domain/sound-controller";
import { createSoundEngine } from "@/domain/sound-engine";
import { SOUND_PACK } from "@/domain/sound-cues";

interface SoundEffectsValue extends SoundPreferences {
  ready: boolean;
  saving: boolean;
  error: string | null;
  unlockFromGesture: () => void;
  play: (cue: CueName) => void;
  startLoop: (key: string, cue: CueName) => void;
  stopLoop: (key: string) => void;
  setEnabled: (enabled: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  retryLoad: () => Promise<void>;
}

const SoundEffectsContext = createContext<SoundEffectsValue | null>(null);

export function SoundEffectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<SoundPreferences>(
    DEFAULT_SOUND_PREFERENCES,
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preferencesRef = useRef<SoundPreferences>(DEFAULT_SOUND_PREFERENCES);
  const controllerRef = useRef<ReturnType<typeof createSoundController> | null>(
    null,
  );
  const mounted = useRef(false);
  const savingRef = useRef(false);

  const retryLoad = useCallback(async () => {
    try {
      const stored = await readSoundPreferences();
      if (!mounted.current) return;
      preferencesRef.current = stored;
      setPreferences(stored);
      controllerRef.current?.setPack(SOUND_PACK);
      controllerRef.current?.setVolume(stored.volume);
      controllerRef.current?.setEnabled(stored.enabled);
      setError(null);
    } catch {
      if (!mounted.current) return;
      const safeDefaults = { ...DEFAULT_SOUND_PREFERENCES, enabled: false };
      preferencesRef.current = safeDefaults;
      setPreferences(safeDefaults);
      controllerRef.current?.setEnabled(false);
      setError("Không thể đọc tùy chỉnh âm thanh. Hãy thử tải lại.");
    } finally {
      if (mounted.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initial = { ...DEFAULT_SOUND_PREFERENCES, enabled: false };
    controllerRef.current = createSoundController(
      createSoundEngine(initial),
      initial,
    );
    void retryLoad();

    const stopWhenBackgrounded = (state: string) => {
      controllerRef.current?.setForeground(state === "active");
    };
    const appSubscription = AppState.addEventListener(
      "change",
      stopWhenBackgrounded,
    );
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined") {
        controllerRef.current?.setForeground(
          document.visibilityState === "visible",
        );
      }
    };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      mounted.current = false;
      appSubscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      }
      const controller = controllerRef.current;
      controllerRef.current = null;
      if (controller) void controller.dispose();
    };
  }, [retryLoad]);

  const unlockFromGesture = useCallback(() => {
    if (ready) controllerRef.current?.unlockFromGesture();
  }, [ready]);

  const play = useCallback(
    (cue: CueName) => {
      if (ready) controllerRef.current?.play(cue);
    },
    [ready],
  );

  const startLoop = useCallback(
    (key: string, cue: CueName) => {
      if (ready) controllerRef.current?.startLoop(key, cue);
    },
    [ready],
  );

  const stopLoop = useCallback((key: string) => {
    controllerRef.current?.stopLoop(key);
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!ready || savingRef.current) return;
      const previous = preferencesRef.current;
      if (previous.enabled === enabled) return;
      const next = { ...previous, enabled };
      savingRef.current = true;
      setSaving(true);

      // Mute before persistence so active loops and sounds stop immediately.
      if (!enabled) {
        controllerRef.current?.setEnabled(false);
        preferencesRef.current = next;
        setPreferences(next);
      }

      try {
        await writeSoundPreferences(next);
        if (!mounted.current) return;
        preferencesRef.current = next;
        setPreferences(next);
        if (enabled) {
          controllerRef.current?.setEnabled(true);
          controllerRef.current?.play("toggle-on");
        }
        setError(null);
      } catch {
        if (!mounted.current) return;
        preferencesRef.current = previous;
        setPreferences(previous);
        controllerRef.current?.setVolume(previous.volume);
        controllerRef.current?.setEnabled(previous.enabled);
        setError("Không thể lưu tùy chỉnh âm thanh. Lựa chọn cũ vẫn được giữ.");
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    },
    [ready],
  );

  const setVolume = useCallback(
    async (volume: number) => {
      if (!ready || savingRef.current || !Number.isFinite(volume)) return;
      const previous = preferencesRef.current;
      const next = { ...previous, volume: Math.min(1, Math.max(0, volume)) };
      if (next.volume === previous.volume) return;
      savingRef.current = true;
      setSaving(true);
      preferencesRef.current = next;
      setPreferences(next);
      controllerRef.current?.setVolume(next.volume);

      try {
        await writeSoundPreferences(next);
        if (!mounted.current) return;
        setError(null);
      } catch {
        if (!mounted.current) return;
        preferencesRef.current = previous;
        setPreferences(previous);
        controllerRef.current?.setVolume(previous.volume);
        setError("Không thể lưu âm lượng. Mức cũ vẫn được giữ.");
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    },
    [ready],
  );

  const value = useMemo(
    () => ({
      ...preferences,
      ready,
      saving,
      error,
      unlockFromGesture,
      play,
      startLoop,
      stopLoop,
      setEnabled,
      setVolume,
      retryLoad,
    }),
    [
      preferences,
      ready,
      saving,
      error,
      unlockFromGesture,
      play,
      startLoop,
      stopLoop,
      setEnabled,
      setVolume,
      retryLoad,
    ],
  );

  return (
    <SoundEffectsContext.Provider value={value}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

export function useSoundEffects(): SoundEffectsValue {
  const value = useContext(SoundEffectsContext);
  if (!value) throw new Error("Thiếu SoundEffectsProvider.");
  return value;
}
