const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const values = new Map();
const storage = {
  async getItem(key) {
    return values.get(key) ?? null;
  },
  async setItem(key, value) {
    values.set(key, value);
  },
};
const preferences = loadTs(join(__dirname, "../data/speech-preferences.ts"), {
  "@react-native-async-storage/async-storage": { ...storage, default: storage },
});

const calls = [];
let voices = [{ language: "en-US", identifier: "english", name: "English" }];
const speechModule = {
  async stop() {
    calls.push(["stop"]);
  },
  async getAvailableVoicesAsync() {
    calls.push(["voices"]);
    return voices;
  },
  speak(text, options) {
    calls.push(["speak", text, options]);
  },
};
const alerts = [];
const intents = [];
const speech = loadTs(join(__dirname, "../domain/speech.ts"), {
  "expo-speech": speechModule,
  "@/data/offline-audio": {
    playOfflineDictionaryAudio: async () => false,
    stopOfflineAudioPlayback: () => {},
  },
  "react-native": {
    Alert: { alert: (...args) => alerts.push(args) },
    Linking: {
      async sendIntent(action) {
        intents.push(action);
      },
      async openSettings() {
        intents.push("openSettings");
      },
    },
    Platform: { OS: "android" },
  },
});

const source = (file) => readFileSync(join(__dirname, "..", file), "utf8");

(async () => {
  assert.deepEqual(await preferences.readSpeechPreferences(), {
    autoRead: true,
    slowRead: false,
  });
  const next = { autoRead: false, slowRead: true };
  await preferences.writeSpeechPreferences(next);
  assert.deepEqual(
    await preferences.readSpeechPreferences(),
    next,
    "Preferences persist across launches",
  );
  await assert.rejects(
    preferences.writeSpeechPreferences({ autoRead: "yes", slowRead: false }),
    /không hợp lệ/,
  );
  values.set(preferences.SPEECH_PREFERENCES_KEY, "{broken");
  await assert.rejects(preferences.readSpeechPreferences(), SyntaxError);
  values.clear();

  await speech.speakWord("  hello  ");
  assert.deepEqual(
    calls.slice(0, 3).map((call) => call[0]),
    ["stop", "voices", "speak"],
  );
  assert.equal(
    calls[2][1],
    "hello",
    "Only the trimmed English headword is spoken",
  );
  assert.equal(calls[2][2].language, "en-US");
  assert.equal(calls[2][2].rate, 0.9);
  calls[2][2].onError(new Error("engine error"));
  assert.equal(
    alerts.length,
    1,
    "Speech engine errors show a Vietnamese fallback",
  );
  const errorAlert = alerts[0];
  assert.match(errorAlert[0], /Không đọc được từ/);
  const settingsButton = errorAlert[2].find(
    (button) => button.text === "Cài đặt giọng nói",
  );
  settingsButton.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(intents, ["com.android.settings.TTS_SETTINGS"]);

  await speech.speakWord("slow", true);
  assert.equal(calls.at(-1)[2].rate, 0.75);
  assert.equal(calls.at(-1)[2].language, "en-US");

  voices = [
    { language: "vi-VN", identifier: "vietnamese", name: "Vietnamese" },
  ];
  const countBeforeMissingVoice = calls.length;
  await speech.speakWord("word");
  assert.equal(
    calls.length,
    countBeforeMissingVoice + 2,
    "Missing English voice does not enqueue speech",
  );
  assert.equal(alerts.length, 2);
  assert.match(alerts[1][1], /giọng tiếng Anh/);

  await speech.stopSpeaking();
  assert.equal(
    calls.at(-1)[0],
    "stop",
    "Leaving a screen stops any active utterance",
  );

  const settings = source("app/settings.tsx");
  assert.match(settings, /Tự phát âm khi hiện từ mới/);
  assert.match(settings, /Đọc chậm/);
  assert.match(settings, /testID="speech-auto-read"/);
  assert.match(settings, /testID="speech-slow-read"/);
  const review = source("app/(tabs)/review.tsx");
  const reviewCard = source("components/ReviewCard.tsx");
  const dictionary = source("components/DictionaryEntryView.tsx");
  assert.match(reviewCard, /testID="review-speak-word"/);
  assert.match(dictionary, /testID="dictionary-speak-word"/);
  for (const screen of [review, dictionary]) {
    assert.match(
      screen,
      /stopSpeaking\(\)/,
      "Screen cleanup stops speech on navigation",
    );
  }
  assert.match(review, /speech\.autoRead/);
  assert.match(dictionary, /speech\.autoRead/);
  console.log(
    "Speech checks passed: local TTS, English-only speech, settings, errors, and screen controls.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
