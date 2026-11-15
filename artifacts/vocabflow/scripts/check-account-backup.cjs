const assert = require("node:assert/strict");
const { join } = require("node:path");
const {
  loadTs,
  missionChests,
  missionShop,
  stoneInvestments,
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
  "../domain/mission-shop": missionShop,
  "../domain/stone-investments": stoneInvestments,
  "../domain/collection-artworks": collectionArtworks,
});

const backupShopDay = "2026-11-08";
const backupShopOffer = missionShop.missionShopOffersForDay(backupShopDay)[2];
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
  reviewComboRewards: [
    {
      sessionId: "session-1",
      deviceId: "device-test",
      day: "2026-11-08",
      comboIndex: 1,
      comboLength: 20,
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
      craftId: "cycle2-legendary-1234567890",
      rarity: "legendary",
      craftIndex: 1234567890,
      artworkId: collectionArtworks.COLLECTION_ARTWORKS.find(
        (item) => item.id === collectionArtworks.FIRST_STATUE_ID,
      ).id,
      craftedAt: "2026-11-08T10:00:00.000Z",
      pieceCost: 10,
    },
    {
      craftId: "cycle2-corvi-mission-2026-11-08-lesson-1",
      rarity: "rare",
      craftIndex: 123,
      artworkId: collectionArtworks.COLLECTION_ARTWORKS.find(
        (item) => item.rarity === "rare",
      ).id,
      craftedAt: "2026-11-08T10:01:00.000Z",
      pieceCost: -20,
    },
  ],
  collectionPieceSpends: [],
  missionShopPurchases: [
    {
      purchaseId: missionShop.missionShopPurchaseId(
        backupShopDay,
        backupShopOffer.slot,
      ),
      day: backupShopDay,
      slot: backupShopOffer.slot,
      rarity: backupShopOffer.rarity,
      stoneCost: backupShopOffer.price,
      discountPercent: backupShopOffer.discountPercent,
      purchasedAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  stoneInvestments: [
    {
      investmentId: "investment:backup-contract",
      plan: "safe",
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
assert.equal(
  restored.payload.collectionCrafts[0].pieceCost,
  10,
  "Backups retain the current 10-fragment statue unlock cost.",
);
const legacyPaintings = JSON.parse(serialized);
legacyPaintings.payload.collectionCrafts = [
  {
    craftId: "craft-epic-1",
    rarity: "epic",
    craftIndex: 1,
    artworkId: "epic-repose",
    craftedAt: "2026-11-08T10:00:00.000Z",
    pieceCost: 100,
  },
];
delete legacyPaintings.payload.collectionPieceSpends;
const migratedLegacyBackup = parseAccountBackup(
  JSON.stringify(legacyPaintings),
);
assert.deepEqual(
  migratedLegacyBackup.payload.collectionCrafts,
  [],
  "Legacy paintings are not restored into the statue collection.",
);
assert.deepEqual(
  migratedLegacyBackup.payload.collectionPieceSpends,
  [
    {
      spendId: "legacy:craft-epic-1",
      rarity: "epic",
      pieceCost: 100,
      spentAt: "2026-11-08T10:00:00.000Z",
    },
  ],
  "The spent fragment balance survives removing legacy paintings.",
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
delete olderBackup.payload.reviewComboRewards;
delete olderBackup.payload.missionAwards;
delete olderBackup.payload.missionShopPurchases;
delete olderBackup.payload.stoneInvestments;
delete olderBackup.payload.investmentStudyDays;
assert.deepEqual(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.missionShopPurchases,
  [],
  "Older backups remain readable without store purchase history.",
);
assert.deepEqual(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.stoneInvestments,
  [],
  "Older backups without investment records remain importable.",
);
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
let prematureChestId;
for (let index = 0; index < 100_000; index += 1) {
  const candidate = `backup-premature-${index}`;
  if (
    !missionChests.hasSuperUpgradeChance(candidate) &&
    !missionChests.resolveChestUpgrade(candidate, 1, "common", 4, false).success
  ) {
    prematureChestId = candidate;
    break;
  }
}
assert.ok(prematureChestId);
const prematureBackup = JSON.parse(serialized);
prematureBackup.payload.missionChests.push({
  ...payload.missionChests[0],
  chestId: prematureChestId,
  missionId: "review-1",
  upgradeAttempts: 1,
  rarity: "common",
  ruleSet: 4,
  superUpgrade: false,
  opened: true,
  finalStone: 25,
});
const migratedBackupChest = parseAccountBackup(JSON.stringify(prematureBackup))
  .payload.missionChests[1];
assert.equal(migratedBackupChest.opened, false);
assert.equal(migratedBackupChest.finalStone, null);
assert.equal(migratedBackupChest.upgradeAttempts, 1);
assert.ok(
  Date.parse(migratedBackupChest.updatedAt) >
    Date.parse(payload.missionChests[0].updatedAt),
  "Backup migration timestamps the reopened chest for sync conflict resolution.",
);
delete olderBackup.payload.collectionCrafts[0].pieceCost;
assert.equal(
  parseAccountBackup(JSON.stringify(olderBackup)).payload.collectionCrafts[0]
    .pieceCost,
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
  parseAccountBackup(JSON.stringify(olderBackup)).payload.reviewComboRewards,
  [],
  "Older backups restore with no invented Combo Stone rewards.",
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
