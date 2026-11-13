const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const { shouldPlayTabBackgroundMusic: shouldPlay } = loadTs(
  join(__dirname, "../domain/tab-background-music.ts"),
);
const readyState = {
  activeTab: "review",
  appVisible: true,
  soundReady: true,
  soundEnabled: true,
};

assert.equal(
  shouldPlay(readyState),
  true,
  "Music plays on the focused review tab when no review session is running.",
);
assert.equal(
  shouldPlay({ ...readyState, activeTab: "dictionary" }),
  false,
  "Music stays off on other tabs.",
);
assert.equal(
  shouldPlay({ ...readyState, activeTab: null }),
  false,
  "Music stays off on routes outside the tab interface.",
);
assert.equal(
  shouldPlay({ ...readyState, appVisible: false }),
  false,
  "Music stops when the app is backgrounded.",
);
assert.equal(
  shouldPlay({ ...readyState, soundEnabled: false }),
  false,
  "The app's existing sound switch controls music.",
);
assert.equal(
  shouldPlay({ ...readyState, soundReady: false }),
  false,
  "Playback waits for stored sound preferences.",
);

const { readFileSync, statSync } = require("node:fs");
const audioPath = join(__dirname, "../assets/audio/tab-piano-ambient.mp3");
assert.ok(statSync(audioPath).size > 100_000, "Bundled offline music asset exists.");
const layout = readFileSync(join(__dirname, "../app/(tabs)/_layout.tsx"), "utf8");
assert.doesNotMatch(layout, /<TabBackgroundMusic/,
  "Background music only mounts from the review screen.");
const reviewScreen = readFileSync(
  join(__dirname, "../app/(tabs)/review.tsx"),
  "utf8",
);
assert.match(reviewScreen, /<TabBackgroundMusic/);
assert.match(reviewScreen, /reviewTabFocused && !inSession \? "review" : null/,
  "Music pauses during review sessions and the word-matching game.");
assert.match(reviewScreen, /const inSession = !!session \|\| !!gameWords \|\| sessionFinalizing/,
  "The music gate covers study sessions and the matching game.");
const component = readFileSync(
  join(__dirname, "../components/TabBackgroundMusic.tsx"),
  "utf8",
);
assert.match(component, /useAudioPlayer/);
assert.match(component, /tab-piano-ambient\.mp3/);
assert.match(component, /const MUSIC_VOLUME = 0\.4/,
  "Background music plays at a reduced mix level.");
const settings = readFileSync(join(__dirname, "../app/settings.tsx"), "utf8");
assert.match(settings, /Nhạc piano chỉ phát ở tab Ôn tập/,
  "Settings describes the review-only music behavior.");
console.log("Tab background music checks passed.");
