import AsyncStorage from "@react-native-async-storage/async-storage";

export type SoundPreferences = {
  enabled: boolean;
  volume: number;
};

export const SOUND_PREFERENCES_KEY = "vocabflow.sound-preferences.v1";
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.7,
};

export function isSoundPreferences(value: unknown): value is SoundPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SoundPreferences>;
  return (
    typeof candidate.enabled === "boolean" &&
    typeof candidate.volume === "number" &&
    Number.isFinite(candidate.volume) &&
    candidate.volume >= 0 &&
    candidate.volume <= 1
  );
}

export async function readSoundPreferences(): Promise<SoundPreferences> {
  const stored = await AsyncStorage.getItem(SOUND_PREFERENCES_KEY);
  if (stored === null) return { ...DEFAULT_SOUND_PREFERENCES };

  const parsed: unknown = JSON.parse(stored);
  if (!isSoundPreferences(parsed)) {
    throw new Error("Tùy chỉnh âm thanh đã lưu không hợp lệ.");
  }
  return { enabled: parsed.enabled, volume: parsed.volume };
}

export async function writeSoundPreferences(
  preferences: SoundPreferences,
): Promise<void> {
  if (!isSoundPreferences(preferences)) {
    throw new Error("Tùy chỉnh âm thanh không hợp lệ.");
  }
  await AsyncStorage.setItem(
    SOUND_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
}
