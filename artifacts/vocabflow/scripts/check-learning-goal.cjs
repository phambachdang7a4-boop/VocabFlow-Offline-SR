const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const courseIds = {
  "./conjunction-course": { CONJUNCTION_COURSE_ID: "sentence-structure" },
  "./idiom-course": { IDIOM_COURSE_ID: "idioms" },
  "./ielts-topic-course": { IELTS_TOPIC_COURSE_ID: "ielts" },
  "./office-apps-course": { OFFICE_APPS_COURSE_ID: "office-apps" },
  "./phrasal-verb-course": { PHRASAL_VERB_COURSE_ID: "phrasal-verbs" },
  "./toeic-topic-course": { TOEIC_TOPIC_COURSE_ID: "toeic" },
};
const goals = loadTs(join(__dirname, "../domain/learning-goals.ts"), courseIds);
assert.equal(goals.LEARNING_GOAL_OPTIONS.length, 6);
assert.equal(
  new Set(goals.LEARNING_GOAL_OPTIONS.map((goal) => goal.id)).size,
  goals.LEARNING_GOAL_OPTIONS.length,
  "Every goal has a unique persistent id.",
);
assert.equal(
  goals.getLearningGoalOption("ielts-reading").courseId,
  "ielts",
);
assert.equal(
  goals.getLearningGoalOption("sentence-structures").courseId,
  "sentence-structure",
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
