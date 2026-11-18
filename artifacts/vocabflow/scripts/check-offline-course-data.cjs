const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const root = join(__dirname, "..");
const packageManifest = loadTs(
  join(root, "domain/course-data-package.ts"),
);
const courseMigration = loadTs(
  join(root, "domain/course-attempt-migration.ts"),
);
const migration = {
  originalLessonTerms: {
    "ielts-old-lesson": ["alpha", "removed", "beta", "gamma"],
  },
  standardTerms: ["alpha", "beta", "gamma"],
  advancedSourceLessonIds: {},
};
const standardLessons = [
  {
    id: "ielts-old-lesson",
    title: "A standard lesson",
    focus: "",
    questions: [
      { term: "alpha", prompt: "", choices: ["alpha"] },
      { term: "beta", prompt: "", choices: ["beta"] },
      { term: "gamma", prompt: "", choices: ["gamma"] },
    ],
  },
];

const resumedRetry = courseMigration.mapIeltsStandardAttempt(
  {
    lessonId: "ielts-old-lesson",
    currentIndex: 2,
    correctCount: 1,
    wrongQuestionIndices: [2],
    retryIndex: 0,
    retrying: true,
    selectedAnswer: "beta",
    updatedAt: "2026-11-18T00:00:00.000Z",
  },
  migration,
  standardLessons,
);
assert.deepEqual(resumedRetry.wrongQuestionIndices, [1]);
assert.equal(resumedRetry.currentIndex, 1);
assert.equal(resumedRetry.selectedAnswer, "beta");
assert.equal(resumedRetry.retrying, true);

const resumedAttempt = courseMigration.mapIeltsStandardAttempt(
  {
    lessonId: "ielts-old-lesson",
    currentIndex: 3,
    correctCount: 1,
    wrongQuestionIndices: [2],
    retryIndex: 0,
    retrying: false,
    selectedAnswer: null,
    updatedAt: "2026-11-18T00:00:00.000Z",
  },
  migration,
  standardLessons,
);
assert.deepEqual(resumedAttempt.wrongQuestionIndices, [1]);
assert.equal(resumedAttempt.currentIndex, 2);
assert.equal(resumedAttempt.correctCount, 1);

assert.equal(
  packageManifest.courseDataResumeOffset(2 * 1024 * 1024 + 53),
  2 * 1024 * 1024,
  "A retry resumes from the last complete megabyte.",
);
assert.equal(
  packageManifest.OFFLINE_COURSE_DATA_NATIVE_CHUNK_BYTES,
  4 * 1024 * 1024,
  "Native downloads use larger chunks to reduce network round trips.",
);
assert.equal(
  packageManifest.courseDataResumeOffset(
    packageManifest.OFFLINE_COURSE_DATA.bytes,
  ),
  packageManifest.OFFLINE_COURSE_DATA.bytes,
  "A complete package does not request another range.",
);
assert.equal(
  packageManifest.courseDataResumeOffset(
    packageManifest.OFFLINE_COURSE_DATA.bytes + 1,
  ),
  0,
  "An oversized partial package restarts safely.",
);
assert.throws(
  () => packageManifest.courseDataResumeOffset(-1),
  /không hợp lệ/,
);

const runtimeFiles = [
  "app/(tabs)/courses.tsx",
  "data/dictionary.ts",
  "data/dictionary-course-index.ts",
  "domain/learning-goals.ts",
  "domain/review-exercises.ts",
];
for (const relativePath of runtimeFiles) {
  const source = require("node:fs").readFileSync(
    join(root, relativePath),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /from ["'][^"']*(?:basic-vocabulary-course|idiom-course|phrasal-verb-course|conjunction-course|linking-adverb-course|sentence-structure-patterns|ielts-topic-course|toeic-topic-course|office-apps-course|course-dictionary-index\.json)["']/,
    `${relativePath} must not bundle course lesson data.`,
  );
}

const workspaceRoot = resolve(root, "../..");
const serverRoute = readFileSync(
  join(workspaceRoot, "artifacts/api-server/src/routes/dictionary.ts"),
  "utf8",
);
const storageLookup = readFileSync(
  join(workspaceRoot, "artifacts/api-server/src/lib/dictionary-storage.ts"),
  "utf8",
);
const uploader = readFileSync(
  join(workspaceRoot, "artifacts/api-server/scripts/upload-course-data.mjs"),
  "utf8",
);
const normalizedUploader = uploader.replaceAll("_", "");
for (const [label, source] of [
  ["App Storage lookup", storageLookup],
  ["package uploader", uploader],
]) {
  assert.ok(
    source.includes(packageManifest.OFFLINE_COURSE_DATA.objectKey),
    `${label} must use the pinned course object key.`,
  );
}
assert.ok(
  serverRoute.includes(packageManifest.OFFLINE_COURSE_DATA.sha256),
  "The API route must advertise the package checksum.",
);
assert.ok(
  serverRoute.includes(`"X-Course-Data-Version": "${packageManifest.OFFLINE_COURSE_DATA.version}"`),
  "The API route must advertise the package version.",
);
assert.ok(
  normalizedUploader.includes(String(packageManifest.OFFLINE_COURSE_DATA.bytes)),
  "The upload script must verify the package size.",
);
assert.ok(
  uploader.includes(packageManifest.OFFLINE_COURSE_DATA.sha256),
  "The upload script must verify the package checksum.",
);

console.log("Offline course package and migration checks passed.");
