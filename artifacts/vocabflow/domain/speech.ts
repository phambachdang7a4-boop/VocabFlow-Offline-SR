import { Alert, Linking, Platform } from 'react-native';
import * as Speech from 'expo-speech';

let activeRequest = 0;

async function openVoiceSettings() {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('com.android.settings.TTS_SETTINGS');
      return;
    }
    await Linking.openSettings();
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Chưa mở được cài đặt', 'Bạn hãy mở phần cài đặt giọng nói của điện thoại thủ công.');
    }
  }
}

function showSpeechError() {
  Alert.alert(
    'Không đọc được từ',
    'Điện thoại chưa có giọng tiếng Anh hoặc bộ đọc gặp lỗi.',
    [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Cài đặt giọng nói', onPress: () => { void openVoiceSettings(); } },
    ],
  );
}

export async function stopSpeaking(): Promise<void> {
  activeRequest += 1;
  try {
    await Speech.stop();
  } catch {
    // Navigation cleanup should never cause an app error.
  }
}

export async function speakWord(word: string, slowRead = false): Promise<void> {
  const text = word.trim();
  if (!text) return;
  const request = ++activeRequest;

  try {
    await Speech.stop();
    if (request !== activeRequest) return;

    const voices = await Speech.getAvailableVoicesAsync();
    if (request !== activeRequest) return;
    if (!voices.some(voice => voice.language.toLowerCase().startsWith('en'))) {
      showSpeechError();
      return;
    }

    Speech.speak(text, {
      language: 'en-US',
      rate: slowRead ? 0.75 : 0.9,
      onError: () => {
        if (request === activeRequest) showSpeechError();
      },
    });
  } catch {
    if (request === activeRequest) showSpeechError();
  }
}
