const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadTs,
  missionChests,
  missionShop,
  stoneInvestments,
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
  "../domain/mission-chests": missionChests,
  "../domain/mission-shop": missionShop,
  "../domain/stone-investments": stoneInvestments,
  "../domain/collection-artworks": collectionArtworks,
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
    activeDurationMs: 45_000,
    maxCombo: 20,
    reviewedCount: 30,
    correctCount: 20,
    grade: "C",
    completed: true,
  });
  await repo.recordReviewComboReward({
    sessionId: "session-account-a",
    startedAt: Date.parse("2026-11-08T08:00:00.000Z"),
    comboIndex: 1,
    comboLength: 20,
  });
  const reviewTotals = await repo.getReviewStatistics("2026-01-01");
  assert.equal(reviewTotals.totalSessions, 1);
  assert.equal(reviewTotals.totalReviewed, 0);
  let snapshot = await sync.exportSyncSnapshot();
  assert.deepEqual(
    snapshot.payload.missionShopPurchases,
    [],
    "Store purchase history is included in sync snapshots.",
  );
  assert.equal(snapshot.payload.words.length, 2);
  assert.equal(snapshot.payload.reviewStats[0].sessionCount, 1);
  assert.equal(
    snapshot.payload.reviewSessions.length,
    1,
    "Review grades sync with account data for daily missions.",
  );
  assert.equal(
    snapshot.payload.reviewSessions[0].activeDurationMs,
    45_000,
    "Active review time is included in the sync snapshot.",
  );
  assert.equal(snapshot.payload.reviewSessions[0].maxCombo, 20);
  assert.equal(snapshot.payload.reviewComboRewards.length, 1);
  assert.equal(snapshot.payload.reviewComboRewards[0].comboLength, 20);
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
    ruleSet: 4,
    superUpgrade: missionChests.hasSuperUpgradeChance(
      "mission-2026-11-08-grade-1",
    ),
    opened: false,
    finalStone: null,
    createdAt: "2026-11-08T10:00:00.000Z",
    updatedAt: "2026-11-08T10:00:00.000Z",
  };
  let prematureChestId;
  for (let index = 0; index < 100_000; index += 1) {
    const candidate = `sync-premature-${index}`;
    if (
      !missionChests.hasSuperUpgradeChance(candidate) &&
      !missionChests.resolveChestUpgrade(candidate, 1, "uncommon", 4, false)
        .success
    ) {
      prematureChestId = candidate;
      break;
    }
  }
  assert.ok(prematureChestId);
  const prematurelyOpenedChest = {
    ...syncedChest,
    chestId: prematureChestId,
    missionId: "review-2",
    upgradeAttempts: 1,
    rarity: "uncommon",
    superUpgrade: false,
    opened: true,
    finalStone: 50,
    updatedAt: "2026-11-08T10:05:00.000Z",
  };
  const chestPayload = {
    ...snapshot.payload,
    missionChests: [syncedChest, prematurelyOpenedChest],
    collectionCrafts: [],
  };
  await sync.mergeSyncSnapshot(chestPayload);
  await sync.mergeSyncSnapshot(chestPayload);
  snapshot = await sync.exportSyncSnapshot();
  assert.equal(
    snapshot.payload.missionChests.length,
    2,
    "Repeating an offline chest sync cannot duplicate the chest.",
  );
  const migratedSyncedChest = snapshot.payload.missionChests.find(
    (chest) => chest.chestId === prematureChestId,
  );
  assert.equal(migratedSyncedChest.opened, false);
  assert.equal(migratedSyncedChest.finalStone, null);
  assert.equal(
    migratedSyncedChest.upgradeAttempts,
    1,
    "Sync reopens a prematurely finalized chest without erasing its tap history.",
  );
  let completedRarity = "uncommon";
  let completedAttempts = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const upgrade = missionChests.resolveChestUpgrade(
      prematureChestId,
      attempt,
      completedRarity,
      4,
      false,
    );
    if (upgrade.success) completedRarity = upgrade.rarity;
    completedAttempts = attempt;
    if (attempt === 3 || completedRarity === "legendary") break;
  }
  const completedChest = {
    ...prematurelyOpenedChest,
    upgradeAttempts: completedAttempts,
    rarity: completedRarity,
    opened: true,
    finalStone: missionChests.chestStoneReward(
      prematurelyOpenedChest.baseStone,
      completedRarity,
      4,
    ),
    updatedAt: "2026-11-08T10:10:00.000Z",
  };
  await sync.mergeSyncSnapshot({
    ...chestPayload,
    missionChests: [syncedChest, completedChest],
  });
  await sync.mergeSyncSnapshot(chestPayload);
  snapshot = await sync.exportSyncSnapshot();
  const completedSyncedChest = snapshot.payload.missionChests.find(
    (chest) => chest.chestId === prematureChestId,
  );
  assert.equal(completedSyncedChest.opened, true);
  assert.ok(
    completedSyncedChest.upgradeAttempts > 1,
    "A stale early chest snapshot cannot overwrite later upgrade progress.",
  );

  const remoteSession = {
    sessionId: "session-account-b",
    deviceId: "device-account-b",
    day: "2026-11-08",
    reviewedCount: 8,
    correctCount: 6,
    activeDurationMs: 120_000,
    maxCombo: 6,
    grade: "A-",
    completed: false,
    createdAt: "2026-11-08T09:00:00.000Z",
  };
  const remoteComboReward = {
    sessionId: "session-account-b",
    deviceId: "device-account-b",
    day: "2026-11-08",
    comboIndex: 1,
    comboLength: 6,
    createdAt: "2026-11-08T09:00:00.000Z",
  };
  await sync.mergeSyncSnapshot({
    ...snapshot.payload,
    reviewSessions: [...snapshot.payload.reviewSessions, remoteSession],
    reviewComboRewards: [
      ...snapshot.payload.reviewComboRewards,
      remoteComboReward,
    ],
  });
  snapshot = await sync.exportSyncSnapshot();
  assert.equal(
    snapshot.payload.reviewSessions.find(
      (session) => session.sessionId === remoteSession.sessionId,
    ).activeDurationMs,
    120_000,
    "Active review time from another device is restored without loss.",
  );
  assert.equal(
    snapshot.payload.reviewSessions.find(
      (session) => session.sessionId === remoteSession.sessionId,
    ).maxCombo,
    6,
    "The imported peak combo stays associated with its own session.",
  );
  assert.deepEqual(
    {
      ...snapshot.payload.reviewComboRewards.find(
        (reward) => reward.sessionId === remoteComboReward.sessionId,
      ),
    },
    remoteComboReward,
    "Combo Stone rewards restore from another device without duplication.",
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
  const artwork = collectionArtworks.COLLECTION_ARTWORKS.find(
    (item) => item.id === collectionArtworks.FIRST_STATUE_ID,
  );
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
        craftId: "cycle2-legendary-1234567890",
        rarity: "legendary",
        craftIndex: 1234567890,
        artworkId: artwork.id,
        craftedAt: "2026-11-08T10:00:00.000Z",
        pieceCost: 10,
      },
      {
        craftId: "craft-rare-2",
        rarity: "rare",
        craftIndex: 2,
        artworkId: collectionArtworks.COLLECTION_ARTWORKS.find(
          (item) => item.rarity === "rare",
        ).id,
        craftedAt: "2026-11-08T09:30:00.000Z",
        pieceCost: 100,
      },
      {
        craftId: "cycle2-corvi-duplicate-compensation",
        rarity: "rare",
        craftIndex: 987654321,
        artworkId: collectionArtworks.COLLECTION_ARTWORKS.find(
          (item) => item.rarity === "rare",
        ).id,
        craftedAt: "2026-11-08T10:01:00.000Z",
        pieceCost: -20,
      },
    ],
    collectionPieceSpends: [
      {
        spendId: "legacy:craft-epic-2",
        rarity: "epic",
        pieceCost: 100,
        spentAt: "2026-11-08T09:00:00.000Z",
      },
    ],
    stoneInvestments: [
      {
        investmentId: "investment:backup-sync",
        plan: "balanced",
        principal: 100,
        durationDays: 7,
        startDay: "2026-11-08",
        endDay: "2026-11-14",
        status: "active",
        settlementAmount: null,
        createdAt: "2026-11-08T10:00:00.000Z",
        settledAt: null,
      },
    ],
    investmentStudyDays: [
      {
        day: "2026-11-08",
        reviewed: true,
        studiedCourse: false,
        updatedAt: "2026-11-08T10:00:00.000Z",
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
    2,
    "Account replacement restores crafted statues and Corvi compensation.",
  );
  assert.equal(
    restoredSnapshot.payload.collectionCrafts[0].pieceCost,
    10,
    "Account replacement preserves the current 10-fragment statue cost.",
  );
  assert.equal(
    restoredSnapshot.payload.collectionCrafts.find(
      (craft) => craft.craftId === "cycle2-corvi-duplicate-compensation",
    ).pieceCost,
    -20,
    "Account replacement preserves duplicate Corvi compensation.",
  );
  assert.deepEqual(
    restoredSnapshot.payload.collectionPieceSpends
      .map((spend) => spend.spendId)
      .sort(),
    ["legacy:craft-epic-2", "legacy:craft-rare-2"],
    "Old statues stay locked while their historical fragment spending remains.",
  );
  assert.equal(restoredSnapshot.payload.stoneInvestments.length, 1);
  assert.deepEqual(restoredSnapshot.payload.investmentStudyDays, [
    {
      day: "2026-11-08",
      reviewed: true,
      studiedCourse: false,
      updatedAt: "2026-11-08T10:00:00.000Z",
    },
  ]);
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
  assert.match(
    serverSource,
    /hasInvalidStoneInvestments/,
    "The server validates investment rules before accepting account sync.",
  );
  assert.match(
    serverSource,
    /userInvestmentStudyDays/,
    "Study-day history is included in account sync.",
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
  const tabsLayout = readFileSync(
    join(__dirname, "../app/(tabs)/_layout.tsx"),
    "utf8",
  );
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
  assert.doesNotMatch(
    rootLayout,
    /if\s*\(!isSignedIn\s*&&\s*!inAuthFlow\)\s*return\s*<Redirect/,
    "An unauthenticated user is not redirected away from the app.",
  );
  assert.match(
    rootLayout,
    /activateGuestDatabase[\s\S]*<SyncProvider key="guest" userId="">\s*<VocabularyProvider key="guest">/,
    "Guest mode opens local storage and mounts app data providers without cloud sync.",
  );
  assert.match(
    rootLayout,
    /unstable_settings\s*=\s*\{\s*anchor:\s*["']\(tabs\)["']/,
    "The root navigator opens the guest tab group by default.",
  );
  assert.match(
    settings,
    /Chế độ khách[\s\S]*Đăng nhập để đồng bộ giữa các thiết bị[\s\S]*testID="guest-sign-in"/,
    "Guest settings explain local-only storage and offer optional account access.",
  );
  assert.match(
    tabsLayout,
    /unstable_settings\s*=\s*\{\s*anchor:\s*["']dictionary["']/,
    "Guests land on the dictionary tab rather than a sign-in form.",
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
