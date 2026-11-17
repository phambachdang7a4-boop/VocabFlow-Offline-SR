const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const modes = loadTs(join(__dirname, "../domain/review-modes.ts"));
assert.deepEqual(modes.REVIEW_WORD_LIMIT_OPTIONS, [50, 100, 200, 400]);
assert.equal(modes.DEFAULT_REVIEW_WORD_LIMIT, 100);
assert.deepEqual(modes.TIMEBOUND_REVIEW_DURATION_OPTIONS, [5, 10, 15, 20]);
assert.equal(modes.DEFAULT_TIMEBOUND_REVIEW_MINUTES, 10);
assert.equal(modes.timeboundReviewDurationMs(5), 5 * 60 * 1000);
assert.equal(modes.timeboundReviewDurationMs(20), 20 * 60 * 1000);
assert.throws(() => modes.timeboundReviewDurationMs(12), /không hợp lệ/);
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
assert.equal(
  modes.remainingTimeboundReviewMs(1_000, modes.timeboundReviewDurationMs(5)),
  299_000,
);
assert.equal(modes.remainingTimeboundReviewMs(700_000), 0);
assert.equal(modes.formatReviewCountdown(600_000), "10:00");
assert.equal(modes.formatReviewCountdown(1), "00:01");
assert.equal(modes.formatReviewCountdown(0), "00:00");
const settingsSource = readFileSync(join(__dirname, "../app/settings.tsx"), "utf8");
assert.match(settingsSource, /testID="review-word-limit-settings"/);
assert.match(settingsSource, /REVIEW_WORD_LIMIT_OPTIONS\.map/);
assert.match(settingsSource, /reviewPreferences\.setWordLimit\(limit\)/);
assert.match(settingsSource, /TIMEBOUND_REVIEW_DURATION_OPTIONS\.map/);
assert.match(settingsSource, /reviewPreferences\.setTimeboundMinutes\(minutes\)/);
const reviewSource = readFileSync(join(__dirname, "../app/(tabs)/review.tsx"), "utf8");
assert.match(reviewSource, /testID="review-mode-dropdown"/);
assert.match(reviewSource, /reviewModeOptions/);
assert.match(reviewSource, /limitReviewQueue\(/);
assert.match(reviewSource, /reviewMode === "timebound"/);
assert.match(reviewSource, /timeboundDurationMinutes:/);
assert.match(reviewSource, /timeboundReviewDurationMs\(/);

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
  assert.deepEqual(await preferences.readReviewPreferences(), {
    wordLimit: 100,
    timeboundMinutes: 10,
  });
  values.set(preferences.REVIEW_PREFERENCES_KEY, JSON.stringify({ wordLimit: 200 }));
  assert.deepEqual(
    await preferences.readReviewPreferences(),
    { wordLimit: 200, timeboundMinutes: 10 },
    "Existing installations without the new field keep the default duration.",
  );
  await preferences.writeReviewPreferences({ wordLimit: 50, timeboundMinutes: 5 });
  assert.deepEqual(await preferences.readReviewPreferences(), {
    wordLimit: 50,
    timeboundMinutes: 5,
  });
  await preferences.writeReviewPreferences({ wordLimit: 400, timeboundMinutes: 20 });
  assert.deepEqual(await preferences.readReviewPreferences(), {
    wordLimit: 400,
    timeboundMinutes: 20,
  });
  await assert.rejects(
    preferences.writeReviewPreferences({ wordLimit: 125, timeboundMinutes: 10 }),
    /không hợp lệ/,
  );
  await assert.rejects(
    preferences.writeReviewPreferences({ wordLimit: 100, timeboundMinutes: 12 }),
    /không hợp lệ/,
  );
  values.set(preferences.REVIEW_PREFERENCES_KEY, JSON.stringify({ wordLimit: 125 }));
  await assert.rejects(
    preferences.readReviewPreferences(),
    /không hợp lệ/,
  );
  values.set(
    preferences.REVIEW_PREFERENCES_KEY,
    JSON.stringify({ wordLimit: 100, timeboundMinutes: 12 }),
  );
  await assert.rejects(
    preferences.readReviewPreferences(),
    /Timebound không hợp lệ/,
  );
  values.set(preferences.REVIEW_PREFERENCES_KEY, "{broken");
  await assert.rejects(preferences.readReviewPreferences(), SyntaxError);
  console.log(
    "PASS: review limits and Timebound durations persist offline, migrate legacy settings, and drive countdowns.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
