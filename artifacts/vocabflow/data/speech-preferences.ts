import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpeechPreferences = {
  autoRead: boolean;
  slowRead: boolean;
};

export const SPEECH_PREFERENCES_KEY = 'vocabflow.speech-preferences.v1';
export const DEFAULT_SPEECH_PREFERENCES: SpeechPreferences = {
  autoRead: true,
  slowRead: false,
};

export async function readSpeechPreferences(): Promise<SpeechPreferences> {
  const stored = await AsyncStorage.getItem(SPEECH_PREFERENCES_KEY);
  if (stored === null) return { ...DEFAULT_SPEECH_PREFERENCES };

  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as SpeechPreferences).autoRead !== 'boolean' ||
    typeof (parsed as SpeechPreferences).slowRead !== 'boolean'
  ) {
    throw new Error('Tùy chỉnh phát âm đã lưu không hợp lệ.');
  }
  return {
    autoRead: (parsed as SpeechPreferences).autoRead,
    slowRead: (parsed as SpeechPreferences).slowRead,
  };
}

export async function writeSpeechPreferences(preferences: SpeechPreferences): Promise<void> {
  if (typeof preferences.autoRead !== 'boolean' || typeof preferences.slowRead !== 'boolean') {
    throw new Error('Tùy chỉnh phát âm không hợp lệ.');
  }
  await AsyncStorage.setItem(SPEECH_PREFERENCES_KEY, JSON.stringify(preferences));
}
