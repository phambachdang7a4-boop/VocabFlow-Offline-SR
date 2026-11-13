const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const { shouldPlayTabBackgroundMusic: shouldPlay } = loadTs(
  join(__dirname, "../domain/tab-background-music.ts"),
);
const readyState = {
  activeTab: "dictionary",
  appVisible: true,
  soundReady: true,
  soundEnabled: true,
};

assert.equal(shouldPlay(readyState), true, "Music plays on an open non-review tab.");
assert.equal(
  shouldPlay({ ...readyState, activeTab: "review" }),
  false,
  "Music stays off throughout review, including the matching game.",
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
assert.match(layout, /<TabBackgroundMusic/);
const component = readFileSync(
  join(__dirname, "../components/TabBackgroundMusic.tsx"),
  "utf8",
);
assert.match(component, /useAudioPlayer/);
assert.match(component, /tab-piano-ambient\.mp3/);
console.log("Tab background music checks passed.");
