const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const {
  DAILY_MISSION_CHEST_RARITY,
  evaluateDailyMissions,
  isDailyReviewGradeQualified,
} = loadTs(join(__dirname, "../domain/daily-missions.ts"));
const {
  CHEST_RARITY_COLORS,
  CHEST_RARITY_LABELS,
  CHEST_RARITY_TEXT_COLORS,
  corviChestMilestoneCrossed,
} = loadTs(join(__dirname, "../domain/mission-chests.ts"));

assert.deepEqual(
  [1, 2, 3].map(
    (level) => CHEST_RARITY_LABELS[DAILY_MISSION_CHEST_RARITY[level]],
  ),
  ["Copper", "Silver", "Gold"],
  "Daily mission levels use their matching chest tiers.",
);
assert.equal(
  new Set(
    [1, 2, 3].map(
      (level) => CHEST_RARITY_COLORS[DAILY_MISSION_CHEST_RARITY[level]],
    ),
  ).size,
  3,
  "Each mission chest tier has a distinct face color.",
);
assert.equal(
  new Set(
    [1, 2, 3].map(
      (level) => CHEST_RARITY_TEXT_COLORS[DAILY_MISSION_CHEST_RARITY[level]],
    ),
  ).size,
  3,
  "Each mission chest tier has a distinct metallic edge.",
);
assert.equal(corviChestMilestoneCrossed(14, 15), 1);
assert.equal(corviChestMilestoneCrossed(15, 16), null);
assert.equal(corviChestMilestoneCrossed(14, 14), null);
const missionScreen = readFileSync(
  join(__dirname, "../app/(tabs)/blank.tsx"),
  "utf8",
);
const collectionScreen = readFileSync(
  join(__dirname, "../app/collection.tsx"),
  "utf8",
);
const missionCollectionTabs = readFileSync(
  join(__dirname, "../components/MissionCollectionTabs.tsx"),
  "utf8",
);
assert.match(
  missionScreen,
  /<MissionCollectionTabs active="shop" \/>/,
  "The shop tab remains selected in the shop panel.",
);
assert.match(
  missionScreen,
  /<MissionCollectionTabs active="missions" \/>/,
  "The missions tab remains selected in the daily-missions panel.",
);
assert.match(
  missionScreen,
  /<CorviChestCelebration[\s\S]*?onDismiss=\{\(\) => setCorviCelebrationIndex\(null\)\}/,
  "The celebration appears inline and can be dismissed without blocking missions.",
);
assert.match(missionScreen, /testID="corvi-chest-celebration"/);
assert.match(missionScreen, /corviChestCelebrationIndex/);
assert.match(missionScreen, /acknowledgeCorviChestCelebration/);
assert.match(missionScreen, /Rương Corvi đã mở!/);
assert.match(
  missionScreen,
  /\+\{CORVI_CHEST_STONE_REWARD\.toLocaleString\("vi-VN"\)\} Stone/,
);
assert.match(
  collectionScreen,
  /<MissionCollectionTabs active="collection" \/>/,
);
assert.match(missionCollectionTabs, /id: "missions", label: "Nhiệm Vụ"/);
assert.match(missionCollectionTabs, /id: "shop", label: "Cửa Hàng"/);
assert.match(missionCollectionTabs, /id: "collection", label: "Bộ Sưu Tập"/);
assert.doesNotMatch(missionScreen, /testID="open-collection"/);
assert.match(
  missionScreen,
  /`Rương \$\{CHEST_RARITY_LABELS\[rewardRarity\]\} khi hoàn thành`/,
  "Each mission tells learners which chest tier it awards.",
);
assert.match(
  missionScreen,
  /mission\.type === "combo"[\s\S]*?`\$\{mission\.progress\}\/\$\{mission\.target\} câu`/,
  "Combo progress includes its unit.",
);
assert.match(
  missionScreen,
  /`\$\{mission\.progress\}\/\$\{mission\.target\} từ`/,
  "Word-count progress includes its unit.",
);
assert.match(
  missionScreen,
  /`Nếu chốt ở bậc này: \$\{currentStone\} Stone · Còn \$\{attemptsLeft\}\/\$\{attemptLimit\}/,
  "The unopened chest card explains its current payout and remaining attempts.",
);

const dates = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];
const missionTypes = ["review", "add-words", "grade", "time", "combo"];
const plans = dates.map((day) =>
  evaluateDailyMissions(
    day,
    {
      reviewedCount: 0,
      addedWordCount: 0,
      reviewSessions: [],
      reviewDurationMs: 0,
    },
    [],
  ),
);

assert.ok(
  plans.every((missions) => missions.length === 3),
  "Each day has exactly three missions.",
);
assert.deepEqual(
  new Set(
    plans.flatMap((missions) =>
      missionTypes.filter(
        (type) => !missions.some((mission) => mission.type === type),
      ),
    ),
  ),
  new Set(missionTypes),
  "Every category rotates out over a five-day cycle.",
);
const omittedTypes = plans.flatMap((missions) =>
  missionTypes.filter(
    (type) => !missions.some((mission) => mission.type === type),
  ),
);
assert.equal(omittedTypes.length, 10, "Two categories are omitted each day.");
for (const type of missionTypes) {
  assert.equal(
    omittedTypes.filter((omittedType) => omittedType === type).length,
    2,
    `${type} rotates out twice in a five-day cycle.`,
  );
}
assert.ok(
  plans.every(
    (missions) =>
      missions[0].level === 1 &&
      missions[1].level === 2 &&
      missions[2].level === 3,
  ),
);

for (const [index, missions] of plans.entries()) {
  for (const mission of missions) {
    const [minimum, maximum] = [
      [1, 5],
      [5, 10],
      [10, 20],
    ][mission.level - 1];
    assert.ok(
      mission.stoneReward >= minimum && mission.stoneReward <= maximum,
      `${mission.id} reward is within its tier range.`,
    );
    assert.equal(
      evaluateDailyMissions(
        dates[index],
        {
          reviewedCount: 0,
          addedWordCount: 0,
          reviewSessions: [],
          reviewDurationMs: 0,
        },
        [],
      )[mission.level - 1].stoneReward,
      mission.stoneReward,
      "A daily reward stays stable when the screen reloads.",
    );
  }
}

const byTypeAndLevel = (type, level) => {
  for (const day of dates) {
    const mission = evaluateDailyMissions(
      day,
      {
        reviewedCount: 100,
        addedWordCount: 100,
        reviewSessions: [
          {
            grade: "S+",
            reviewedCount: 100,
            activeDurationMs: 0,
            maxCombo: 30,
          },
        ],
        reviewDurationMs: 0,
      },
      [],
    ).find((item) => item.type === type && item.level === level);
    if (mission) return mission;
  }
  return null;
};

assert.deepEqual(
  [1, 2, 3].map((level) => byTypeAndLevel("review", level)?.target),
  [30, 60, 90],
);
assert.deepEqual(
  [1, 2, 3].map((level) => byTypeAndLevel("add-words", level)?.target),
  [5, 10, 15],
);
assert.deepEqual(
  [1, 2, 3].map((level) => byTypeAndLevel("grade", level)?.target),
  [1, 1, 1],
);
assert.deepEqual(
  [1, 2, 3].map((level) => byTypeAndLevel("time", level)?.target),
  [5, 10, 20],
);
assert.deepEqual(
  [1, 2, 3].map((level) => byTypeAndLevel("combo", level)?.target),
  [5, 10, 25],
);

for (const [level, target] of [5, 10, 20].entries()) {
  const missionLevel = level + 1;
  const day = dates.find((candidate) =>
    evaluateDailyMissions(
      candidate,
      {
        reviewedCount: 0,
        addedWordCount: 0,
        reviewSessions: [],
        reviewDurationMs: 0,
      },
      [],
    ).some(
      (mission) => mission.type === "time" && mission.level === missionLevel,
    ),
  );
  assert.ok(day, `Time level ${missionLevel} appears during the rotation.`);
  const atThreshold = evaluateDailyMissions(
    day,
    {
      reviewedCount: 0,
      addedWordCount: 0,
      reviewSessions: [],
      reviewDurationMs: target * 60_000,
    },
    [],
  ).find((mission) => mission.type === "time");
  const beforeThreshold = evaluateDailyMissions(
    day,
    {
      reviewedCount: 0,
      addedWordCount: 0,
      reviewSessions: [],
      reviewDurationMs: target * 60_000 - 1,
    },
    [],
  ).find((mission) => mission.type === "time");
  assert.equal(atThreshold.completed, true);
  assert.equal(beforeThreshold.completed, false);
}

for (const [index, target] of [5, 10, 25].entries()) {
  const missionLevel = index + 1;
  const day = dates.find((candidate) =>
    evaluateDailyMissions(
      candidate,
      {
        reviewedCount: 0,
        addedWordCount: 0,
        reviewSessions: [],
        reviewDurationMs: 0,
      },
      [],
    ).some(
      (mission) => mission.type === "combo" && mission.level === missionLevel,
    ),
  );
  assert.ok(day, `Combo level ${missionLevel} appears during the rotation.`);
  const completedCombo = evaluateDailyMissions(
    day,
    {
      reviewedCount: target,
      addedWordCount: 0,
      reviewSessions: [
        {
          grade: "C",
          reviewedCount: target,
          activeDurationMs: 0,
          maxCombo: target,
        },
      ],
      reviewDurationMs: 0,
    },
    [],
  ).find((mission) => mission.type === "combo");
  const shorterStreaks = [
    Math.floor(target / 2),
    target - Math.floor(target / 2),
  ];
  const splitCombo = evaluateDailyMissions(
    day,
    {
      reviewedCount: target,
      addedWordCount: 0,
      reviewSessions: shorterStreaks.map((maxCombo) => ({
        grade: "C",
        reviewedCount: maxCombo,
        activeDurationMs: 0,
        maxCombo,
      })),
      reviewDurationMs: 0,
    },
    [],
  ).find((mission) => mission.type === "combo");
  assert.equal(completedCombo.completed, true);
  assert.equal(
    splitCombo.completed,
    false,
    "Separate shorter streaks cannot be combined into one combo.",
  );
}

assert.equal(isDailyReviewGradeQualified("A-", 30, "A-"), true);
assert.equal(isDailyReviewGradeQualified("A-", 30, "A"), false);
assert.equal(isDailyReviewGradeQualified("A", 30, "A"), true);
assert.equal(isDailyReviewGradeQualified("A", 30, "A+"), false);
assert.equal(isDailyReviewGradeQualified("A+", 30, "A+"), true);
assert.equal(isDailyReviewGradeQualified("S+", 29, "A-"), false);

assert.deepEqual(
  [1, 2, 3].map((level) => byTypeAndLevel("grade", level)?.title),
  ["Đạt hạng A- trở lên", "Đạt hạng A trở lên", "Đạt hạng A+ trở lên"],
);

const activeDay = dates[0];
const activity = {
  reviewedCount: 100,
  addedWordCount: 100,
  reviewSessions: [
    {
      grade: "S+",
      reviewedCount: 100,
      activeDurationMs: 30 * 60_000,
      maxCombo: 100,
    },
  ],
  reviewDurationMs: 30 * 60_000,
};
const unclaimed = evaluateDailyMissions(activeDay, activity, []);
const claimed = evaluateDailyMissions(
  activeDay,
  activity,
  unclaimed.map((mission) => ({
    missionDay: activeDay,
    missionId: mission.id,
    stone: mission.stoneReward,
    completedAt: `${activeDay}T12:00:00.000Z`,
  })),
);
assert.ok(
  claimed.every((mission) => mission.completed && mission.rewarded),
  "Completed daily missions become claimed exactly once.",
);

console.log(
  "Daily mission rotation, levels, rewards, grade, time, and combo requirements passed.",
);
