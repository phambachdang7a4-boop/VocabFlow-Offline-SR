const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const {
  loadTs,
} = require("./test-support.cjs");

const appDir = join(__dirname, "..");
const assetPath = join(appDir, "assets/offline/vocabflow-courses.db");
const manifest = require("../assets/offline/bundle-manifest.json");
const dbManifest = manifest.courses.database;
const tempDir = join(tmpdir(), `vocabflow-course-sqlite-${process.pid}`);
rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

async function run() {
  let runtimeDb;
  const runtimeQueries = [];
  try {
  const assetBytes = require("node:fs").readFileSync(assetPath);
  assert.equal(assetBytes.byteLength, dbManifest.bytes);
  assert.equal(
    createHash("sha256").update(assetBytes).digest("hex"),
    dbManifest.sha256,
    "Bundled course SQLite hash must match its manifest",
  );

  const sourceDb = new DatabaseSync(assetPath, { readOnly: true });
  assert.equal(sourceDb.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  const metadata = Object.fromEntries(
    sourceDb
      .prepare("SELECT key, value FROM course_metadata")
      .all()
      .map((row) => [row.key, row.value]),
  );
  assert.equal(metadata.formatVersion, String(manifest.courses.sourceVersion));
  assert.equal(metadata.packageSha256, manifest.courses.sha256);
  assert.equal(Number(metadata.courseCount), manifest.courses.courseCount);
  assert.equal(Number(metadata.lessonCount), manifest.courses.lessonCount);
  assert.equal(
    JSON.parse(metadata.dictionaryIndex).contentSha256,
    manifest.courses.dictionaryIndexSha256,
    "The lightweight course-index revision matches the bundled index.",
  );
  assert.equal(
    sourceDb.prepare("SELECT COUNT(*) AS count FROM courses").get().count,
    manifest.courses.courseCount,
  );
  assert.equal(
    sourceDb.prepare("SELECT COUNT(*) AS count FROM lessons").get().count,
    manifest.courses.lessonCount,
  );
  assert.equal(
    sourceDb.prepare("SELECT COUNT(*) AS count FROM questions").get().count,
    14610,
  );
  sourceDb.close();

  const sqliteModule = loadTs(
    join(appDir, "data/offline-course-sqlite.native.ts"),
    {
      "expo-sqlite": {
        importDatabaseFromAssetAsync: async (name, options) => {
          const destination = join(tempDir, name);
          if (options.forceOverwrite || !existsSync(destination)) {
            copyFileSync(assetPath, destination);
          }
        },
        openDatabaseAsync: async (name) => {
          runtimeDb = new DatabaseSync(join(tempDir, name));
          return {
            getFirstAsync: async (query, ...params) => {
              runtimeQueries.push(query);
              return runtimeDb.prepare(query).get(...params);
            },
            getAllAsync: async (query, ...params) => {
              runtimeQueries.push(query);
              return runtimeDb.prepare(query).all(...params);
            },
            execAsync: async (query) => runtimeDb.exec(query),
            closeAsync: async () => runtimeDb.close(),
          };
        },
      },
      "../assets/offline/bundle-manifest.json": manifest,
      "../assets/offline/vocabflow-courses.db": 1,
      "../domain/course-ids": loadTs(
        join(appDir, "domain/course-ids.ts"),
      ),
    },
  );

  const status = await sqliteModule.getBundledCourseDataStatus();
  assert.equal(status.state, "installed");
  assert.equal(status.bytes, dbManifest.bytes);
  assert.match(runtimeQueries[0], /WHERE key IN/);
  assert.doesNotMatch(runtimeQueries[0], /SELECT key, value FROM course_metadata\s*$/);
  assert.equal(
    sqliteModule.getBundledCourseDictionaryIndexRevision(),
    manifest.courses.dictionaryIndexSha256,
    "The lightweight revision marker comes from the bundled SQLite manifest.",
  );
  const indexQueryStart = runtimeQueries.length;
  const indexData = await sqliteModule.getBundledCourseDictionaryIndexData();
  const indexQueries = runtimeQueries.slice(indexQueryStart);
  assert.equal(indexData.dictionaryIndex.terms.length > 10_000, true);
  assert.ok(Object.keys(indexData.toeicEntriesByTerm).length > 0);
  assert.equal(indexQueries.length, 2);
  assert.doesNotMatch(
    indexQueries.join("\n"),
    /FROM lessons|FROM questions|ORDER BY course_id, sequence/,
    "Dictionary migration data must not materialize all course lessons/questions.",
  );
  const bundle = await sqliteModule.getBundledOfflineCourseBundle();
  assert.equal(bundle.courses.length, 9);
  assert.equal(
    bundle.courses.reduce((sum, course) => sum + course.lessons.length, 0),
    1594,
  );
  assert.ok(bundle.courses.some((course) => course.id === "toeic-basic-collocations-v1"));
  assert.ok(bundle.courses.some((course) => course.id === "toeic-advanced-collocations-v1"));
  assert.ok(bundle.courses.every((course) => Object.keys(course.entriesByTerm).length > 0));
  assert.equal(
    bundle.courses.reduce(
      (sum, course) =>
        sum + course.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.questions.length, 0),
      0,
    ),
    14610,
  );
  assert.throws(() => runtimeDb.exec("CREATE TABLE forbidden_write(id INTEGER)"));

  const migration = loadTs(join(appDir, "domain/course-attempt-migration.ts"));
  const toeicBasic = bundle.courses.find(
    (course) => course.id === "toeic-basic-collocations-v1",
  );
  const targetLesson = toeicBasic.lessons[0];
  const sourceLessonIds =
    bundle.toeicAttemptMigration.basicSourceLessonIdsByLesson[
      targetLesson.id
    ];
  assert.ok(sourceLessonIds.length > 0);
  const firstTargetTerm = targetLesson.questions[0].term;
  const sourceLessonId = sourceLessonIds.find((lessonId) =>
    bundle.toeicAttemptMigration.originalLessonTerms[lessonId].includes(
      firstTargetTerm,
    ),
  );
  assert.ok(sourceLessonId);
  const sourceIndex =
    bundle.toeicAttemptMigration.originalLessonTerms[
      sourceLessonId
    ].indexOf(firstTargetTerm);
  const migratedAttempt = migration.mapToeicSplitCourseAttempt(
    targetLesson,
    sourceLessonIds,
    bundle.toeicAttemptMigration,
    [
      {
        lessonId: sourceLessonId,
        currentIndex: sourceIndex,
        correctCount: sourceIndex,
        wrongQuestionIndices: [],
        retryIndex: 0,
        retrying: false,
        selectedAnswer: null,
        updatedAt: "2026-11-23T00:00:00.000Z",
      },
    ],
    new Set(),
  );
  assert.equal(migratedAttempt.attempt.lessonId, targetLesson.id);
  assert.equal(migratedAttempt.attempt.currentIndex, 0);
  assert.equal(
    migration.mapToeicSplitCourseAttempt(
      targetLesson,
      sourceLessonIds,
      bundle.toeicAttemptMigration,
      [],
      new Set(sourceLessonIds),
    ).completed,
    true,
  );

  const settings = require("node:fs").readFileSync(
    join(appDir, "app/settings.tsx"),
    "utf8",
  );
  assert.match(settings, /Platform\.OS === "web" \? \(\s*<>/);
  const courseScreen = require("node:fs").readFileSync(
    join(appDir, "app/(tabs)/courses.tsx"),
    "utf8",
  );
  const courseIds = loadTs(join(appDir, "domain/course-ids.ts"));
  for (const course of bundle.courses) {
    const constantName = Object.entries(courseIds).find(
      ([name, value]) => name.endsWith("_COURSE_ID") && value === course.id,
    )?.[0];
    assert.ok(constantName, `Course ${course.id} has an application ID.`);
    assert.match(
      courseScreen,
      new RegExp(`id: ${constantName}`),
      `Course ${course.id} appears in the native course catalog.`,
    );
  }
  assert.match(courseScreen, /TOEIC_BASIC_COURSE_ID/);
  assert.match(courseScreen, /TOEIC_ADVANCED_COURSE_ID/);
  const appConfig = require("../app.json").expo;
  assert.equal(appConfig.version, "1.08");
  assert.equal(appConfig.android.versionCode, 15);

  console.log(
    "Bundled SQLite course package verified: 9 courses, 1,594 lessons, 14,610 questions; native reads are query-only.",
  );
} finally {
    runtimeDb?.close();
  rmSync(tempDir, { recursive: true, force: true });
}
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
