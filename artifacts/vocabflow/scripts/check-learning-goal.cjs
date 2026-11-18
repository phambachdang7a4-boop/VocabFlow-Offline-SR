const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const courseIds = loadTs(join(__dirname, "../domain/course-ids.ts"));
const goals = loadTs(join(__dirname, "../domain/learning-goals.ts"), {
  "./course-ids": courseIds,
});
assert.equal(goals.LEARNING_GOAL_OPTIONS.length, 7);
assert.equal(
  new Set(goals.LEARNING_GOAL_OPTIONS.map((goal) => goal.id)).size,
  goals.LEARNING_GOAL_OPTIONS.length,
  "Every goal has a unique persistent id.",
);
assert.equal(
  goals.getLearningGoalOption("basic-vocabulary").courseId,
  "basic-vocabulary-a1-a2-v1",
);
assert.equal(
  goals.getLearningGoalOption("ielts-reading").courseId,
  "ielts-topic-vocabulary-v1",
);
assert.equal(
  goals.getLearningGoalOption("sentence-structures").courseId,
  "subordinating-conjunctions-v1",
);
assert.equal(goals.getLearningGoalOption("not-a-goal"), null);
assert.equal(goals.isLearningGoalId("toeic"), true);
assert.equal(goals.isLearningGoalId("not-a-goal"), false);

const cardSource = readFileSync(
  join(__dirname, "../components/LearningGoalCard.tsx"),
  "utf8",
);
const coursesSource = readFileSync(
  join(__dirname, "../app/(tabs)/courses.tsx"),
  "utf8",
);
assert.match(cardSource, /testID="learning-goal-card"/);
assert.match(cardSource, /LEARNING_GOAL_OPTIONS\.map/);
assert.match(cardSource, /testID="learning-goal-open-course"/);
assert.match(coursesSource, /<LearningGoalCard/);
assert.match(coursesSource, /writeLearningGoal\(goal\)/);

const stored = new Map();
const asyncStorage = {
  async getItem(key) {
    return stored.get(key) ?? null;
  },
  async setItem(key, value) {
    stored.set(key, value);
  },
};
const preferences = loadTs(join(__dirname, "../data/learning-goal.ts"), {
  "@react-native-async-storage/async-storage": {
    ...asyncStorage,
    default: asyncStorage,
  },
  "../domain/learning-goals": goals,
});

(async () => {
  assert.equal(await preferences.readLearningGoal(), null);
  await preferences.writeLearningGoal("ielts-reading");
  assert.equal(
    stored.get(preferences.LEARNING_GOAL_KEY),
    "ielts-reading",
    "The selected goal is stored locally without a server request.",
  );
  assert.equal(await preferences.readLearningGoal(), "ielts-reading");
  stored.set(preferences.LEARNING_GOAL_KEY, "removed-goal");
  assert.equal(
    await preferences.readLearningGoal(),
    null,
    "Unknown goals from older app versions safely return to the unselected state.",
  );
  await assert.rejects(
    preferences.writeLearningGoal("unknown"),
    /Mục tiêu học tập không hợp lệ/,
  );
  console.log(
    "PASS: goal options map to existing courses and persist safely on-device.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
