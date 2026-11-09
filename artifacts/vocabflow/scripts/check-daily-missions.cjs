const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const { evaluateDailyMissions, isDailyReviewGradeQualified } = loadTs(join(__dirname, '../domain/daily-missions.ts'));

const dates = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
const plans = dates.map((day) => evaluateDailyMissions(day, {
  reviewedCount: 0,
  addedWordCount: 0,
  completedLessonCount: 0,
  qualifiedGradeCount: 0,
}, []));

assert.ok(plans.every((missions) => missions.length === 3), 'Each day has exactly three missions.');
assert.deepEqual(
  new Set(plans.flatMap((missions) => ['review', 'add-words', 'lesson', 'grade'].filter((type) => !missions.some((mission) => mission.type === type)))),
  new Set(['review', 'add-words', 'lesson', 'grade']),
  'The omitted mission type rotates through all four categories.',
);
assert.ok(plans.every((missions) => missions[0].level === 1 && missions[1].level === 2 && missions[2].level === 3));

for (const [index, missions] of plans.entries()) {
  for (const mission of missions) {
    const [minimum, maximum] = [[1, 5], [5, 10], [10, 20]][mission.level - 1];
    assert.ok(mission.stoneReward >= minimum && mission.stoneReward <= maximum, `${mission.id} reward is within its tier range.`);
    assert.equal(
      evaluateDailyMissions(dates[index], {
        reviewedCount: 0,
        addedWordCount: 0,
        completedLessonCount: 0,
        qualifiedGradeCount: 0,
      }, [])[mission.level - 1].stoneReward,
      mission.stoneReward,
      'A daily reward stays stable when the screen reloads.',
    );
  }
}

const byTypeAndLevel = (type, level) => {
  for (const day of dates) {
    const mission = evaluateDailyMissions(day, {
      reviewedCount: 100,
      addedWordCount: 100,
      completedLessonCount: 100,
      qualifiedGradeCount: 100,
    }, []).find((item) => item.type === type && item.level === level);
    if (mission) return mission;
  }
  return null;
};

assert.deepEqual([1, 2, 3].map((level) => byTypeAndLevel('review', level)?.target), [5, 10, 20]);
assert.deepEqual([1, 2, 3].map((level) => byTypeAndLevel('add-words', level)?.target), [1, 5, 10]);
assert.deepEqual([1, 2, 3].map((level) => byTypeAndLevel('lesson', level)?.target), [1, 2, 3]);
assert.deepEqual([1, 2, 3].map((level) => byTypeAndLevel('grade', level)?.target), [1, 2, 3]);

assert.equal(isDailyReviewGradeQualified('A', 30), true);
assert.equal(isDailyReviewGradeQualified('S+', 30), true);
assert.equal(isDailyReviewGradeQualified('A-', 30), false);
assert.equal(isDailyReviewGradeQualified('S+', 29), false);

const activeDay = dates[0];
const activity = {
  reviewedCount: 100,
  addedWordCount: 100,
  completedLessonCount: 100,
  qualifiedGradeCount: 100,
};
const unclaimed = evaluateDailyMissions(activeDay, activity, []);
const claimed = evaluateDailyMissions(activeDay, activity, unclaimed.map((mission) => ({
  missionDay: activeDay,
  missionId: mission.id,
  stone: mission.stoneReward,
  completedAt: `${activeDay}T12:00:00.000Z`,
})));
assert.ok(claimed.every((mission) => mission.completed && mission.rewarded), 'Completed daily missions become claimed exactly once.');

console.log('Daily mission rotation, levels, rewards, and grade requirements passed.');
