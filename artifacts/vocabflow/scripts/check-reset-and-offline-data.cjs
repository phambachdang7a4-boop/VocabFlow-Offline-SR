const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createRepository, loadTs } = require("./test-support.cjs");

const root = mkdtempSync(join(tmpdir(), "vocabflow-reset-data-"));

(async () => {
  const reset = loadTs(join(__dirname, "../domain/data-reset.ts"));
  const calls = [];
  await reset.resetCloudFirst({
    replaceCloud: async () => {
      calls.push("cloud");
      return { revision: 12 };
    },
    clearLocal: async (revision) => {
      calls.push(`local:${revision}`);
    },
    clearOfflineResources: async () => {
      calls.push("offline");
    },
  });
  assert.deepEqual(
    calls,
    ["cloud", "local:12", "offline"],
    "Cloud reset succeeds before local data and assets are removed.",
  );

  const failedCloudCalls = [];
  await assert.rejects(
    () =>
      reset.resetCloudFirst({
        replaceCloud: async () => {
          failedCloudCalls.push("cloud");
          throw new Error("network");
        },
        clearLocal: async () => failedCloudCalls.push("local"),
        clearOfflineResources: async () => failedCloudCalls.push("offline"),
      }),
    /network/,
  );
  assert.deepEqual(
    failedCloudCalls,
    ["cloud"],
    "A cloud error retains both local learning data and offline resources.",
  );

  const failedLocalCalls = [];
  await assert.rejects(
    () =>
      reset.resetCloudFirst({
        replaceCloud: async () => {
          failedLocalCalls.push("cloud");
          return { revision: 13 };
        },
        clearLocal: async () => {
          failedLocalCalls.push("local");
          throw new Error("local");
        },
        clearOfflineResources: async () => failedLocalCalls.push("offline"),
      }),
    /local/,
  );
  assert.deepEqual(
    failedLocalCalls,
    ["cloud", "local"],
    "Offline resources are retained if local reset fails.",
  );

  const harness = createRepository(root);
  const values = new Map();
  const sync = loadTs(join(__dirname, "../data/vocabulary-sync.ts"), {
    "./vocabulary": harness.repo,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
    },
  });

  await harness.repo.listWords();
  await sync.initializeAccountDatabase("reset-test-account");
  await harness.repo.saveWord({
    term: "manual word",
    meaning: "Từ cá nhân",
    ipa: "",
    example: "",
    note: "Ghi chú cá nhân",
  });
  await harness.repo.saveWord({
    term: "course word",
    meaning: "Từ khóa học",
    ipa: "",
    example: "",
    note: "Khóa học: Family 1",
  });
  harness.db
    .prepare(
      `
    INSERT INTO course_lesson_progress (lesson_id, current_index, stage, completed_at, updated_at)
    VALUES ('legacy-lesson', 2, 'selection', NULL, '2026-11-10T12:00:00.000Z')
  `,
    )
    .run();
  harness.db
    .prepare(
      `
    INSERT INTO course_word_selection (lesson_id, word_id, selected, updated_at)
    VALUES ('legacy-lesson', 'legacy-word', 1, '2026-11-10T12:00:00.000Z')
  `,
    )
    .run();
  harness.db.exec("PRAGMA user_version = 13");
  await sync.activateGuestDatabase();
  await sync.initializeAccountDatabase("reset-test-account");

  const migratedWords = await harness.repo.listWords();
  assert.deepEqual(
    migratedWords.map((word) => word.term),
    ["manual word"],
    "The v14 migration deletes course-generated words but keeps hand-saved vocabulary.",
  );
  assert.equal(
    harness.db
      .prepare("SELECT COUNT(*) AS count FROM course_lesson_progress")
      .get().count,
    0,
  );
  assert.equal(
    harness.db
      .prepare("SELECT COUNT(*) AS count FROM course_word_selection")
      .get().count,
    0,
  );
  assert.equal(
    harness.db
      .prepare("SELECT COUNT(*) AS count FROM sync_word_tombstones")
      .get().count,
    1,
    "Removed course words create tombstones so sync cannot restore them.",
  );

  await harness.repo.recordReviewSessionResult({
    sessionId: "before-reset",
    startedAt: Date.parse("2026-11-10T12:00:00.000Z"),
    reviewedCount: 1,
    correctCount: 1,
    grade: "S",
    completed: true,
  });
  await sync.clearLocalAccountAfterCloudReset(14);
  const cleared = await sync.exportSyncSnapshot();
  assert.equal(cleared.payload.revision, 14);
  assert.equal(cleared.payload.words.length, 0);
  assert.equal(cleared.payload.deletedWords.length, 0);
  assert.equal(cleared.payload.reviewStats.length, 0);
  assert.equal(cleared.payload.reviewSessions.length, 0);
  assert.equal(cleared.pending, false);

  const settings = readFileSync(join(__dirname, "../app/settings.tsx"), "utf8");
  const context = readFileSync(
    join(__dirname, "../contexts/SyncContext.tsx"),
    "utf8",
  );
  const audio = readFileSync(
    join(__dirname, "../data/offline-audio.ts"),
    "utf8",
  );
  const dictionary = readFileSync(
    join(__dirname, "../data/dictionary.ts"),
    "utf8",
  );
  assert.match(settings, /testID="offline-dictionary-download"/);
  assert.match(settings, /testID="offline-audio-download"/);
  assert.match(settings, /testID="reset-app-data"/);
  assert.match(settings, /Xóa cloud và thiết bị/);
  assert.match(context, /resetCloudFirst/);
  assert.match(context, /cloudResetNeedsLocalRetry/);
  assert.match(audio, /digest\(["']SHA-256["']\)/);
  assert.match(audio, /audio_dictionary WHERE entry_id = \?/);
  assert.match(dictionary, /onProgress: \(progress\)/);

  await sync.activateGuestDatabase();
  harness.db.close();
  console.log(
    "Account reset order, cloud-failure safety, course cleanup migration, and offline resource controls passed.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => rmSync(root, { recursive: true, force: true }));
