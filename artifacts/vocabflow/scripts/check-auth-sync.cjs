const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadTs,
  missionChests,
  collectionArtworks,
} = require("./test-support.cjs");

const root = mkdtempSync(join(tmpdir(), "vocabflow-auth-sync-"));
const harness = createRepository(root);
const values = new Map();
const asyncStorage = {
  getItem: async (key) => values.get(key) ?? null,
  setItem: async (key, value) => {
    values.set(key, value);
  },
};
const sync = loadTs(join(__dirname, "../data/vocabulary-sync.ts"), {
  "./vocabulary": harness.repo,
  "@react-native-async-storage/async-storage": asyncStorage,
});

(async () => {
  const { repo } = harness;
  assert.equal((await repo.listWords()).length, 0);
  await repo.saveWord({
    term: "guest word",
    meaning: "Từ khách",
    ipa: "",
    example: "",
    note: "",
  });

  await sync.initializeAccountDatabase("user_A");
  assert.equal(repo.getDatabaseScope(), "user_A");
  assert.equal(
    (await repo.listWords()).length,
    1,
    "Existing local data imports into the first account.",
  );
  await repo.saveWord({
    term: "account A word",
    meaning: "Từ tài khoản A",
    ipa: "",
    example: "",
    note: "",
  });

  await repo.recordReviewSessionStart();
  await repo.recordReviewSessionResult({
    sessionId: "session-account-a",
    startedAt: Date.parse("2026-11-08T08:00:00.000Z"),
    reviewedCount: 30,
    correctCount: 27,
    grade: "A",
    completed: true,
  });
  const reviewTotals = await repo.getReviewStatistics("2026-01-01");
  assert.equal(reviewTotals.totalSessions, 1);
  assert.equal(reviewTotals.totalReviewed, 0);
  let snapshot = await sync.exportSyncSnapshot();
  assert.equal(snapshot.payload.words.length, 2);
  assert.equal(snapshot.payload.reviewStats[0].sessionCount, 1);
  assert.equal(
    snapshot.payload.reviewSessions.length,
    1,
    "Review grades sync with account data for daily missions.",
  );
  assert.equal(
    Object.hasOwn(snapshot.payload, "userId"),
    false,
    "Client payload never chooses its owner.",
  );
  assert.equal(
    snapshot.pending,
    true,
    "Local writes stay queued until the server acknowledges them.",
  );

  const syncedChest = {
    chestId: "mission-2026-11-08-grade-1",
    day: "2026-11-08",
    missionId: "grade-1",
    baseStone: 3,
    upgradeAttempts: 0,
    rarity: "common",
    ruleSet: 3,
    superUpgrade: missionChests.hasSuperUpgradeChance(
      "mission-2026-11-08-grade-1",
    ),
    opened: false,
    finalStone: null,
    createdAt: "2026-11-08T10:00:00.000Z",
    updatedAt: "2026-11-08T10:00:00.000Z",
  };
  const chestPayload = {
    ...snapshot.payload,
    missionChests: [syncedChest],
    collectionCrafts: [],
  };
  await sync.mergeSyncSnapshot(chestPayload);
  await sync.mergeSyncSnapshot(chestPayload);
  snapshot = await sync.exportSyncSnapshot();
  assert.equal(
    snapshot.payload.missionChests.length,
    1,
    "Repeating an offline chest sync cannot duplicate the chest.",
  );

  const generationBeforeEdit = snapshot.generation;
  await repo.saveWord({
    term: "new offline word",
    meaning: "Từ ngoại tuyến",
    ipa: "",
    example: "",
    note: "",
  });
  assert.equal(
    await repo.markSyncClean(generationBeforeEdit),
    false,
    "An old acknowledgement cannot clear newer edits.",
  );
  snapshot = await sync.exportSyncSnapshot();
  assert.equal(await repo.markSyncClean(snapshot.generation), true);
  assert.equal((await sync.getLocalSyncState()).pending, false);

  const progressSnapshot = await sync.exportSyncSnapshot();
  assert.deepEqual(progressSnapshot.payload.courseProgress, []);
  assert.deepEqual(progressSnapshot.payload.courseSelections, []);

  const newest = progressSnapshot.payload.words[0];
  await sync.mergeSyncSnapshot({
    revision: progressSnapshot.payload.revision,
    words: [
      {
        ...newest,
        meaning: "Nghĩa cũ không được ghi đè",
        contentUpdatedAt: "2000-01-01T00:00:00.000Z",
      },
    ],
    deletedWords: [],
    courseProgress: [],
    courseSelections: [],
    reviewStats: [],
  });
  assert.notEqual(
    (await repo.listWords()).find((word) => word.term === newest.term)?.meaning,
    "Nghĩa cũ không được ghi đè",
    "An older remote edit cannot overwrite a newer local record.",
  );

  const wordToDelete = (await repo.listWords()).find(
    (word) => word.term === "account A word",
  );
  await repo.deleteWord(wordToDelete.id);
  snapshot = await sync.exportSyncSnapshot();
  assert.ok(
    snapshot.payload.deletedWords.some(
      (deleted) =>
        deleted.syncId ===
        "manual:account%20a%20word:t%E1%BB%AB%20t%C3%A0i%20kho%E1%BA%A3n%20a",
    ),
  );

  await sync.activateGuestDatabase();
  assert.equal(
    (await repo.listWords()).length,
    1,
    "Guest data remains intact after switching accounts.",
  );
  await sync.initializeAccountDatabase("user_B");
  assert.equal(
    (await repo.listWords()).length,
    0,
    "A new account cannot see another account or guest data.",
  );
  await repo.saveWord({
    term: "account B word",
    meaning: "Từ tài khoản B",
    ipa: "",
    example: "",
    note: "",
  });
  await sync.initializeAccountDatabase("user_A");
  const accountAWords = await repo.listWords();
  assert.equal(
    accountAWords.length,
    2,
    "The original account keeps its own local cache.",
  );
  assert.equal(
    accountAWords.some((word) => word.term === "account B word"),
    false,
  );

  const beforeRestore = await sync.exportSyncSnapshot();
  const restoredWord = beforeRestore.payload.words[0];
  const artwork = collectionArtworks.artworkForCraft("common", 1);
  const backupPayload = {
    revision: beforeRestore.payload.revision,
    words: [restoredWord],
    deletedWords: [],
    courseProgress: [
      {
        lessonId: "backup-lesson",
        currentIndex: 1,
        stage: "selection",
        completedAt: null,
        updatedAt: "2026-11-08T10:00:00.000Z",
      },
    ],
    courseSelections: [
      {
        lessonId: "backup-lesson",
        wordId: "backup-word",
        selected: true,
        updatedAt: "2026-11-08T10:00:00.000Z",
      },
    ],
    reviewStats: [
      {
        deviceId: "backup-device",
        day: "2026-11-08",
        reviewedCount: 3,
        correctCount: 2,
        sessionCount: 2,
        updatedAt: "2026-11-08T10:00:00.000Z",
      },
    ],
    missionAwards: [],
    missionChests: [syncedChest],
    collectionCrafts: [
      {
        craftId: "craft-common-1",
        rarity: "common",
        craftIndex: 1,
        artworkId: artwork.id,
        craftedAt: "2026-11-08T10:00:00.000Z",
      },
    ],
  };
  await sync.replaceAccountSyncSnapshot(backupPayload);
  let restoredSnapshot = await sync.exportSyncSnapshot();
  assert.deepEqual(
    restoredSnapshot.payload.words.map((word) => word.syncId),
    [restoredWord.syncId],
  );
  assert.deepEqual(restoredSnapshot.payload.deletedWords, []);
  assert.deepEqual(
    restoredSnapshot.payload.courseProgress,
    [],
    "Legacy backup course data is ignored.",
  );
  assert.deepEqual(
    restoredSnapshot.payload.courseSelections,
    [],
    "Legacy backup course selections are ignored.",
  );
  assert.equal(restoredSnapshot.payload.reviewStats[0].reviewedCount, 3);
  assert.equal(restoredSnapshot.payload.reviewStats[0].sessionCount, 2);
  assert.equal(
    restoredSnapshot.payload.missionChests.length,
    1,
    "Account replacement restores unopened chests.",
  );
  assert.equal(
    restoredSnapshot.payload.collectionCrafts.length,
    1,
    "Account replacement restores crafted artwork.",
  );
  assert.equal(
    await sync.hasPendingAccountReplacement(),
    true,
    "An offline restore queues full replacement of the signed-in account.",
  );
  assert.equal(
    await sync.clearPendingAccountReplacement(restoredSnapshot.generation + 1),
    false,
    "A stale sync response cannot clear a newer restore request.",
  );
  assert.equal(
    await sync.clearPendingAccountReplacement(restoredSnapshot.generation),
    true,
  );
  assert.equal(await repo.markSyncClean(restoredSnapshot.generation), true);
  restoredSnapshot = await sync.exportSyncSnapshot();
  assert.equal(await sync.hasPendingAccountReplacement(), false);
  assert.equal(restoredSnapshot.pending, false);

  const nextRevision = restoredSnapshot.payload.revision + 1;
  await sync.mergeSyncSnapshot({
    ...restoredSnapshot.payload,
    revision: nextRevision,
    courseProgress: [],
    courseSelections: [],
    reviewStats: [],
  });
  restoredSnapshot = await sync.exportSyncSnapshot();
  assert.equal(restoredSnapshot.payload.revision, nextRevision);
  assert.deepEqual(
    restoredSnapshot.payload.courseProgress,
    [],
    "A newer account revision replaces old course progress instead of merging it.",
  );
  await sync.mergeSyncSnapshot({
    ...restoredSnapshot.payload,
    revision: nextRevision - 1,
    words: [],
    courseProgress: backupPayload.courseProgress,
    courseSelections: backupPayload.courseSelections,
    reviewStats: backupPayload.reviewStats,
  });
  restoredSnapshot = await sync.exportSyncSnapshot();
  assert.deepEqual(
    restoredSnapshot.payload.courseProgress,
    [],
    "Stale device data cannot reintroduce deleted progress after an account replacement.",
  );
  assert.equal(restoredSnapshot.payload.words.length, 1);

  const serverSource = readFileSync(
    join(__dirname, "../../api-server/src/routes/sync.ts"),
    "utf8",
  );
  assert.match(
    serverSource,
    /const \{ userId \} = getAuth\(req\)/,
    "Server owner comes from verified Clerk auth.",
  );
  assert.match(
    serverSource,
    /res\.locals\.userId/,
    "The trusted Clerk user ID scopes server writes.",
  );
  assert.doesNotMatch(
    serverSource,
    /req\.body\.userId|snapshot\.userId/,
    "Request data cannot set an owner.",
  );
  assert.match(
    serverSource,
    /router\.post\(["']\/sync\/replace["']/,
    "Full restore uses a separate authenticated endpoint.",
  );
  assert.match(
    serverSource,
    /userSyncRevisions/,
    "Full replacement advances the account revision.",
  );
  assert.match(
    serverSource,
    /status === ["']stale["']/,
    "Older devices receive the authoritative replacement snapshot.",
  );
  assert.match(
    serverSource,
    /delete\(userVocabulary\).*?delete\(userWordTombstones\)/s,
    "Confirmed restore replaces prior cloud rows inside one transaction.",
  );
  const rootLayout = readFileSync(
    join(__dirname, "../app/_layout.tsx"),
    "utf8",
  );
  const signIn = readFileSync(
    join(__dirname, "../app/(auth)/sign-in.tsx"),
    "utf8",
  );
  const signUp = readFileSync(
    join(__dirname, "../app/(auth)/sign-up.tsx"),
    "utf8",
  );
  const settings = readFileSync(join(__dirname, "../app/settings.tsx"), "utf8");
  assert.match(
    rootLayout,
    /ClerkProvider[\s\S]*tokenCache/,
    "Clerk sessions use the Expo secure token cache.",
  );
  assert.match(
    rootLayout,
    /Platform\.OS !== ["']web["'] && isSignedIn/,
    "Native API calls use bearer tokens while web uses same-origin Clerk cookies.",
  );
  assert.match(
    signIn,
    /useSignIn[\s\S]*oauth_google/,
    "Email/password and Google sign-in are wired.",
  );
  assert.match(
    signUp,
    /useSignUp[\s\S]*verifyEmailCode/,
    "Account creation verifies the email address.",
  );
  assert.match(
    signIn,
    /StyleSheet\.flatten\(\[styles\.textLink/,
    "Router Link children flatten styles for web.",
  );
  assert.match(
    signUp,
    /StyleSheet\.flatten\(\[styles\.textLink/,
    "Router Link children flatten styles for web.",
  );
  assert.match(settings, /useSyncStatus/, "Settings exposes sync status.");
  assert.match(settings, /signOut\(/, "Settings exposes sign-out.");
  assert.match(
    settings,
    /testID="account-export-data"/,
    "Settings exposes a shareable account backup.",
  );
  assert.match(
    settings,
    /testID="account-import-data"/,
    "Settings exposes backup import.",
  );
  assert.match(
    settings,
    /Thay thế dữ liệu hiện tại\?/,
    "Import explicitly confirms before overwriting.",
  );

  const persisted = new DatabaseSync(join(root, "vocabflow-account-user_A.db"));
  assert.equal(persisted.prepare("SELECT COUNT(*) AS n FROM words").get().n, 1);
  persisted.close();
  harness.db.close();
  console.log(
    "PASS: legacy import, account-scoped SQLite, queued offline edits, stale acknowledgements, merge conflict handling, tombstones and trusted server ownership.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      harness.db.close();
    } catch {}
    rmSync(root, { recursive: true, force: true });
  });
