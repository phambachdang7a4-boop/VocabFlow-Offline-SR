const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs, srs } = require('./test-support.cjs');
const { reviewOverview, secondsUntilReview, formatReviewCountdown } = loadTs(
  join(__dirname, '../domain/review-overview.ts'), { './srs': srs },
);
const today = '2026-11-07';
const word = (id, progress = {}) => ({
  id, term: `test-${id}`, meaning: 'Test only', ipa: '', example: '', note: '',
  createdAt: today, updatedAt: today, ...srs.initialProgress(today), ...progress,
});
const words = [
  word(1),
  word(2, { level: 3, nextReviewOn: '2026-11-06' }),
  word(3, { level: 2, nextReviewOn: '2026-11-08' }),
  word(4, { level: 6, completed: true, nextReviewOn: null }),
  word(5, { level: 4, frozen: true, nextReviewOn: '2026-11-08' }),
  word(6, { level: 6, nextReviewOn: '2026-11-12' }),
];
const summary = reviewOverview(words, today);
assert.equal(summary.total, 6);
assert.deepEqual(summary.levels.map(row => row.count), [1, 1, 1, 1, 0, 2]);
assert.equal(summary.levels.reduce((sum, row) => sum + row.count, 0), summary.total);
assert.deepEqual(summary.dueWords.map(row => row.id), [2, 1], 'Overdue first; frozen/completed never due');
assert.equal(summary.nextReviewOn, '2026-11-08');
assert.equal(summary.frozen, 1);
assert.equal(summary.completed, 1);
assert.deepEqual(words.map(row => row.id), [1, 2, 3, 4, 5, 6], 'Summarizing must not reorder/mutate the source');
assert.deepEqual(reviewOverview([], today).levels.map(row => row.count), [0, 0, 0, 0, 0, 0]);
assert.equal(reviewOverview([], today).nextReviewOn, null);
assert.equal(reviewOverview([words[3], words[4]], today).nextReviewOn, null);
assert.equal(reviewOverview([words[3], words[4]], today).dueWords.length, 0);
assert.equal(reviewOverview([words[2]], today).dueWords.length, 0);
assert.equal(secondsUntilReview('2026-11-08', new Date('2026-11-07T23:59:59').getTime()), 1);
assert.equal(secondsUntilReview('2026-11-08', new Date('2026-11-08T00:00:00').getTime()), 0);
assert.equal(reviewOverview([words[2]], '2026-11-08').dueWords.length, 1, 'Expiry enables review on the new local day');
assert.equal(formatReviewCountdown(90061), '1 ngày 01:01:01');
assert.equal(formatReviewCountdown(0), '00:00:00');
assert.equal(formatReviewCountdown(0.1), '00:00:01');
assert.throws(() => formatReviewCountdown(-1));
assert.throws(() => secondsUntilReview('2026-02-30', Date.now()));
assert.throws(() => reviewOverview([word(7, { level: 7 })], today));
const reviewed = { ...words[0], ...srs.applyReview(words[0], true, today) };
const afterReview = reviewOverview([reviewed], today);
assert.equal(afterReview.levels[1].count, 1);
assert.equal(afterReview.dueWords.length, 0);
assert.equal(afterReview.nextReviewOn, '2026-11-08');
if (process.env.TZ === 'America/New_York') {
  assert.equal(secondsUntilReview('2026-03-09', new Date('2026-03-08T00:00:00').getTime()), 23 * 3600);
  assert.equal(secondsUntilReview('2026-11-02', new Date('2026-11-01T00:00:00').getTime()), 25 * 3600);
}

// Run the real focus/foreground hook against controlled native events/clock.
let timestamp = new Date('2026-11-07T23:59:58').getTime();
let current, focus, listener, nextId = 0;
const timers = new Map();
const appState = {
  currentState: 'active',
  addEventListener(event, callback) {
    assert.equal(event, 'change'); listener = callback;
    return { remove() { listener = null; } };
  },
};
const { useReviewClock } = loadTs(join(__dirname, '../hooks/useReviewClock.ts'), {
  react: { useCallback: callback => callback, useState: initial => {
    current = initial();
    return [current, next => { current = next; }];
  } },
  'expo-router': { useFocusEffect: callback => { focus = callback; } },
  'react-native': { AppState: appState },
}, {
  Date: { now: () => timestamp },
  setInterval: callback => { const id = ++nextId; timers.set(id, callback); return id; },
  clearInterval: id => timers.delete(id),
});
assert.equal(useReviewClock(), timestamp);
const cleanup = focus();
assert.equal(timers.size, 1);
timestamp += 1000;
timers.values().next().value();
assert.equal(current, timestamp);
appState.currentState = 'background'; listener('background');
assert.equal(timers.size, 0);
timestamp += 5 * 3600 * 1000;
assert.notEqual(current, timestamp);
appState.currentState = 'active'; listener('active');
assert.equal(current, timestamp, 'Resume must use real current time, not continue a stale decrement');
assert.equal(timers.size, 1);
cleanup();
assert.equal(timers.size, 0);
assert.equal(listener, null);
timestamp += 1000;
focus()();
assert.equal(current, timestamp);
assert.equal(timers.size, 0);
console.log(`PASS (${process.env.TZ || 'default TZ'}): six-level totals; due/overdue and frozen/completed rules; next real schedule; midnight expiry; countdown formatting/DST; review progress; foreground/focus timer cleanup/resume.`);
