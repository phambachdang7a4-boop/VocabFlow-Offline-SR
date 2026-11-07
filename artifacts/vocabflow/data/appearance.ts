import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'light' | 'dark';
export const APPEARANCE_KEY = 'vocabflow.appearance.v1';

export async function readAppearance(): Promise<AppearanceMode> {
  const value = await AsyncStorage.getItem(APPEARANCE_KEY);
  if (value === null) return 'light';
  if (value !== 'light' && value !== 'dark') throw new Error('Tùy chỉnh giao diện đã lưu không hợp lệ.');
  return value;
}

export async function writeAppearance(mode: AppearanceMode): Promise<void> {
  if (mode !== 'light' && mode !== 'dark') throw new Error('Giao diện không hợp lệ.');
  await AsyncStorage.setItem(APPEARANCE_KEY, mode);
}
