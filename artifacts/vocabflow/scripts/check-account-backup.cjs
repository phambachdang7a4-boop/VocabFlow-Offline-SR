const assert = require("node:assert/strict");
const { join } = require("node:path");
const {
  loadTs,
  missionChests,
  collectionArtworks,
} = require("./test-support.cjs");

const {
  ACCOUNT_BACKUP_FORMAT,
  ACCOUNT_BACKUP_VERSION,
  MAX_ACCOUNT_BACKUP_BYTES,
  parseAccountBackup,
  serializeAccountBackup,
  summarizeAccountBackup,
} = loadTs(join(__dirname, "../data/account-backup.ts"), {
  "../domain/mission-chests": missionChests,
  "../domain/collection-artworks": collectionArtworks,
});

const payload = {
  revision: 0,
  words: [
    {
      syncId: "manual:go:di",
      term: "go",
      meaning: "Đi",
      ipa: "/ɡəʊ/",
      example: "We go to school.",
      note: "",
      dictionaryEntryId: null,
      dictionarySenseId: null,
      createdAt: "2026-11-01T10:00:00.000Z",
      contentUpdatedAt: "2026-11-01T10:00:00.000Z",
      reviewCount: 2,
      level: 2,
      learnedOn: "2026-11-01",
      nextReviewOn: "2026-11-09",
      completed: false,
      lastReviewedOn: "2026-11-08",
      frozen: false,
      progressUpdatedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  deletedWords: [
    { syncId: "manual:old:word", deletedAt: "2026-11-07T12:00:00.000Z" },
  ],
  courseProgress: [
    {
      lessonId: "basic-lesson-1",
      currentIndex: 3,
      stage: "answer",
      completedAt: null,
      updatedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  courseSelections: [
    {
      lessonId: "basic-lesson-1",
      wordId: "dict:1:2",
      selected: true,
      updatedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  reviewStats: [
    {
      deviceId: "device-test",
      day: "2026-11-08",
      reviewedCount: 4,
      correctCount: 3,
      sessionCount: 2,
      updatedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  reviewSessions: [
    {
      sessionId: "session-1",
      deviceId: "device-test",
      day: "2026-11-08",
      reviewedCount: 30,
      correctCount: 27,
      activeDurationMs: 125_000,
      maxCombo: 18,
      grade: "A",
      completed: true,
      createdAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  missionAwards: [
    {
      day: "2026-11-08",
      missionId: "review-1",
      stone: 3,
      completedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  missionChests: [
    {
      chestId: "mission-2026-11-08-lesson-1",
      day: "2026-11-08",
      missionId: "lesson-1",
      baseStone: 3,
      upgradeAttempts: 0,
      rarity: "common",
      ruleSet: 4,
      superUpgrade: missionChests.hasSuperUpgradeChance(
        "mission-2026-11-08-lesson-1",
      ),
      opened: false,
      finalStone: null,
      createdAt: "2026-11-08T10:00:00.000Z",
      updatedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  collectionCrafts: [
    {
      craftId: "craft-common-1",
      rarity: "common",
      craftIndex: 1,
      artworkId: collectionArtworks.artworkForCraft("common", 1).id,
      craftedAt: "2026-11-08T10:00:00.000Z",
      pieceCost: 20,
    },
  ],
};

const serialized = serializeAccountBackup(payload);
const restored = parseAccountBackup(serialized);
assert.equal(restored.format, ACCOUNT_BACKUP_FORMAT);
assert.equal(restored.version, ACCOUNT_BACKUP_VERSION);
assert.deepEqual(
  restored.payload,
  payload,
  "All learning data round-trips without account credentials.",
);
assert.equal(Object.hasOwn(restored, "userId"), false);
assert.equal(
  restored.payload.collectionCrafts[0].artworkId,
  payload.collectionCrafts[0].artworkId,
);
const olderBackup = JSON.parse(serialized);
delete olderBackup.payload.reviewStats[0].sessionCount;
assert.equal(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.reviewStats[0]
    .sessionCount,
  0,
  "Backups without session history start at zero instead of fabricating data.",
);
delete olderBackup.payload.reviewSessions[0].activeDurationMs;
assert.equal(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.reviewSessions[0]
    .activeDurationMs,
  0,
  "Older session records default to zero active time instead of inventing duration.",
);
delete olderBackup.payload.reviewSessions[0].maxCombo;
assert.equal(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.reviewSessions[0]
    .maxCombo,
  0,
  "Older session records default missing combo history to zero.",
);
delete olderBackup.payload.reviewSessions;
delete olderBackup.payload.missionAwards;
delete olderBackup.payload.missionChests[0].ruleSet;
delete olderBackup.payload.missionChests[0].superUpgrade;
const legacyChest = parseAccountBackup(JSON.stringify(olderBackup)).payload
  .missionChests[0];
assert.equal(
  legacyChest.ruleSet,
  1,
  "Older backups keep their legacy chest rules.",
);
assert.equal(
  legacyChest.superUpgrade,
  false,
  "Older backups do not gain a lucky attempt.",
);
assert.equal(
  parseAccountBackup(serialized).payload.collectionCrafts[0].pieceCost,
  20,
  "Older collection crafts retain their original piece cost.",
);
delete olderBackup.payload.missionChests;
delete olderBackup.payload.collectionCrafts;
assert.deepEqual(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.reviewSessions,
  [],
  "Older backups restore without daily mission data.",
);
assert.deepEqual(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.missionChests,
  [],
  "Older backups restore without chest data.",
);
assert.deepEqual(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.collectionCrafts,
  [],
  "Older backups restore without collection data.",
);

const preview = summarizeAccountBackup({
  ...restored,
  payload: {
    ...restored.payload,
    words: [
      ...restored.payload.words,
      {
        ...restored.payload.words[0],
        syncId: "manual:frozen:word",
        frozen: true,
      },
    ],
    courseSelections: [
      ...restored.payload.courseSelections,
      {
        ...restored.payload.courseSelections[0],
        wordId: "dict:3:4",
      },
    ],
    reviewStats: [
      ...restored.payload.reviewStats,
      {
        ...restored.payload.reviewStats[0],
        deviceId: "another-device",
      },
      {
        ...restored.payload.reviewStats[0],
        day: "2026-11-07",
      },
    ],
  },
});
assert.deepEqual(preview, {
  personalWordCount: 2,
  frozenWordCount: 1,
  courseRecordCount: 3,
  reviewStatDayCount: 2,
});

assert.throws(() => parseAccountBackup("not JSON"), /JSON/);
assert.throws(
  () =>
    parseAccountBackup(
      JSON.stringify({
        format: ACCOUNT_BACKUP_FORMAT,
        version: ACCOUNT_BACKUP_VERSION + 1,
        exportedAt: "2026-11-08T10:00:00.000Z",
        payload,
      }),
    ),
  /không phải gói sao lưu/,
);
assert.throws(
  () => parseAccountBackup("x".repeat(MAX_ACCOUNT_BACKUP_BYTES + 1)),
  /4 MiB/,
);
assert.throws(
  () => parseAccountBackup("ế".repeat(Math.ceil(MAX_ACCOUNT_BACKUP_BYTES / 2))),
  /4 MiB/,
  "Multibyte Vietnamese text is measured by its UTF-8 size.",
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      words: [{ ...payload.words[0], level: 7 }],
    }),
  /không hợp lệ/,
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      words: Array.from({ length: 1024 }, (_, index) => ({
        ...payload.words[0],
        syncId: `manual:large-${index}`,
        note: "é".repeat(2000),
      })),
    }),
  /4 MiB/,
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      revision: -1,
    }),
  /sai cấu trúc/,
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      collectionCrafts: [
        { ...payload.collectionCrafts[0], artworkId: "unknown-image" },
      ],
    }),
  /không hợp lệ/,
  "Collection backups cannot introduce unknown or mismatched artwork.",
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      deletedWords: [
        {
          syncId: payload.words[0].syncId,
          deletedAt: "2026-11-08T10:00:00.000Z",
        },
      ],
    }),
  /mâu thuẫn/,
);

console.log(
  "PASS: versioned backup round-trip, supported-version and size checks, record validation, and conflicting data rejection.",
);
