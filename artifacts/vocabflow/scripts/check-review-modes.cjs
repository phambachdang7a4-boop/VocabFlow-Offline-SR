const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const modes = loadTs(join(__dirname, "../domain/review-modes.ts"));
assert.deepEqual(modes.REVIEW_WORD_LIMIT_OPTIONS, [50, 100, 200, 400]);
assert.equal(modes.DEFAULT_REVIEW_WORD_LIMIT, 100);
const words = Array.from({ length: 500 }, (_, index) => index);
for (const limit of modes.REVIEW_WORD_LIMIT_OPTIONS) {
  assert.equal(
    modes.limitReviewQueue(words, limit).length,
    limit,
    `A ${limit}-word setting caps every review queue at ${limit}.`,
  );
}
assert.throws(() => modes.limitReviewQueue(words, 125), /không hợp lệ/);
assert.equal(
  modes.remainingTimeboundReviewMs(0),
  modes.TIMEBOUND_REVIEW_DURATION_MS,
);
assert.equal(modes.remainingTimeboundReviewMs(1_000), 599_000);
assert.equal(modes.remainingTimeboundReviewMs(700_000), 0);
assert.equal(modes.formatReviewCountdown(600_000), "10:00");
assert.equal(modes.formatReviewCountdown(1), "00:01");
assert.equal(modes.formatReviewCountdown(0), "00:00");
const settingsSource = readFileSync(join(__dirname, "../app/settings.tsx"), "utf8");
assert.match(settingsSource, /testID="review-word-limit-settings"/);
assert.match(settingsSource, /REVIEW_WORD_LIMIT_OPTIONS\.map/);
assert.match(settingsSource, /reviewPreferences\.setWordLimit\(limit\)/);
const reviewSource = readFileSync(join(__dirname, "../app/(tabs)/review.tsx"), "utf8");
assert.match(reviewSource, /testID="review-mode-dropdown"/);
assert.match(reviewSource, /reviewModeOptions/);
assert.match(reviewSource, /limitReviewQueue\(/);
assert.match(reviewSource, /reviewMode === "timebound"/);

const values = new Map();
const storage = {
  async getItem(key) {
    return values.get(key) ?? null;
  },
  async setItem(key, value) {
    values.set(key, value);
  },
};
const preferences = loadTs(join(__dirname, "../data/review-preferences.ts"), {
  "@react-native-async-storage/async-storage": { ...storage, default: storage },
  "@/domain/review-modes": modes,
});

(async () => {
  assert.deepEqual(await preferences.readReviewPreferences(), { wordLimit: 100 });
  await preferences.writeReviewWordLimit(50);
  assert.deepEqual(await preferences.readReviewPreferences(), { wordLimit: 50 });
  await preferences.writeReviewWordLimit(400);
  assert.deepEqual(await preferences.readReviewPreferences(), { wordLimit: 400 });
  await assert.rejects(
    preferences.writeReviewWordLimit(125),
    /không hợp lệ/,
  );
  values.set(preferences.REVIEW_PREFERENCES_KEY, JSON.stringify({ wordLimit: 125 }));
  await assert.rejects(
    preferences.readReviewPreferences(),
    /không hợp lệ/,
  );
  values.set(preferences.REVIEW_PREFERENCES_KEY, "{broken");
  await assert.rejects(preferences.readReviewPreferences(), SyntaxError);
  console.log(
    "PASS: review word limits, offline persistence, invalid-setting handling, and Timebound countdown.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
