const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { missionChests, collectionArtworks } = require("./test-support.cjs");

const {
  CHEST_RARITY_LABELS,
  chestUpgradeChance,
  chestStoneReward,
  hasSuperUpgradeChance,
  isValidMissionChest,
  maxChestUpgradeAttempts,
  resolveChestUpgrade,
  startingRarityForMission,
} = missionChests;
const { COLLECTION_ARTWORKS, artworkForCraft, isCollectionArtwork } =
  collectionArtworks;

assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) =>
    chestStoneReward(5, rarity),
  ),
  [5, 7, 10, 15, 25],
  "Stone increases by the rarity bonus while preserving the mission reward.",
);
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) =>
    chestStoneReward(1, rarity),
  ),
  [1, 3, 6, 11, 21],
  "The displayed reward preview handles the smallest mission payout.",
);
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) =>
    chestStoneReward(20, rarity),
  ),
  [20, 22, 25, 30, 40],
  "The displayed reward preview handles the largest mission payout.",
);
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) =>
    chestStoneReward(5, rarity, 3),
  ),
  [25, 50, 100, 150, 1000],
  "The new chest rules pay a fixed total by final rarity.",
);
const chestScreen = readFileSync(
  join(__dirname, "../app/chest/[chestId].tsx"),
  "utf8",
);
assert.match(
  chestScreen,
  /testID="tap-chest-art"/,
  "The chest illustration itself is tappable.",
);
assert.match(
  chestScreen,
  /withSequence/,
  "Each tap plays the multi-beat chest animation.",
);
assert.match(
  chestScreen,
  /chest-reward-preview/,
  "The screen shows current and next-rarity rewards.",
);
assert.match(
  chestScreen,
  /Mỗi lần chạm là một lượt/,
  "Animation beats do not create extra upgrade attempts.",
);
assert.throws(() => resolveChestUpgrade("sample", 4), /không hợp lệ/);

for (const attempt of [1, 2, 3]) {
  assert.deepEqual(
    resolveChestUpgrade("stable-chest", attempt),
    resolveChestUpgrade("stable-chest", attempt),
    "An offline retry keeps the same result.",
  );
}

let failedFirstId;
let fullyUpgradedId;
for (
  let index = 0;
  index < 100_000 && (!failedFirstId || !fullyUpgradedId);
  index += 1
) {
  const id = `mission-seed-${index}`;
  const first = resolveChestUpgrade(id, 1);
  if (!first.success && !failedFirstId) failedFirstId = id;
  const second = first.success && resolveChestUpgrade(id, 2);
  const third = second?.success && resolveChestUpgrade(id, 3);
  if (first.success && second?.success && third?.success) fullyUpgradedId = id;
}
assert.ok(failedFirstId, "Some chests can fail the first upgrade.");
assert.ok(fullyUpgradedId, "Three successful upgrades are possible.");

const firstFailure = resolveChestUpgrade(failedFirstId, 1);
const failedChest = {
  chestId: failedFirstId,
  day: "2026-11-10",
  missionId: "review-1",
  baseStone: 5,
  upgradeAttempts: 1,
  rarity: firstFailure.rarity,
  opened: true,
  finalStone: chestStoneReward(5, firstFailure.rarity),
  createdAt: "2026-11-10T12:00:00.000Z",
  updatedAt: "2026-11-10T12:00:00.000Z",
};
assert.equal(isValidMissionChest(failedChest), true);
assert.equal(
  isValidMissionChest({ ...failedChest, opened: false, finalStone: null }),
  false,
  "A failed chest cannot be rerolled.",
);

const upgrades = [1, 2, 3].map((attempt) =>
  resolveChestUpgrade(fullyUpgradedId, attempt),
);
assert.ok(
  upgrades.every((upgrade) => upgrade.success),
  "The successful path reaches all three upgrades.",
);
const upgradedRarity = upgrades[2].rarity;
const upgradedChest = {
  ...failedChest,
  chestId: fullyUpgradedId,
  upgradeAttempts: 3,
  rarity: upgradedRarity,
  opened: true,
  finalStone: chestStoneReward(5, upgradedRarity),
};
assert.equal(isValidMissionChest(upgradedChest), true);

for (const rarity of ["common", "uncommon", "rare", "epic", "legendary"]) {
  const artwork = artworkForCraft(rarity, 1);
  assert.equal(artwork.rarity, rarity);
  assert.equal(isCollectionArtwork(rarity, artwork.id), true);
  assert.equal(
    artwork.id,
    artworkForCraft(rarity, 1).id,
    "The same craft index resolves consistently across devices.",
  );
}
assert.ok(
  COLLECTION_ARTWORKS.some(
    (artwork) =>
      artwork.rarity === "epic" && artwork.imageAssetKey === "epic-repose",
  ),
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/epic-repose.png")),
  "The Epic painting asset is bundled with the app.",
);
assert.ok(
  COLLECTION_ARTWORKS.some(
    (artwork) =>
      artwork.rarity === "epic" && artwork.imageAssetKey === "epic-study",
  ),
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/epic-study.png")),
  "The second Epic painting asset is bundled with the app.",
);
assert.ok(
  Array.from({ length: 100 }, (_, index) =>
    artworkForCraft("epic", index + 1),
  ).some((artwork) => artwork.id === "epic-repose"),
  "The supplied painting can be selected as an Epic collection reward.",
);
assert.ok(
  Array.from({ length: 100 }, (_, index) =>
    artworkForCraft("epic", index + 1),
  ).some((artwork) => artwork.id === "epic-study"),
  "The second supplied painting can be selected as an Epic collection reward.",
);
assert.ok(
  COLLECTION_ARTWORKS.some(
    (artwork) =>
      artwork.rarity === "legendary" &&
      artwork.imageAssetKey === "legendary-crossing",
  ),
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/legendary-crossing.png")),
  "The Legendary painting asset is bundled with the app.",
);
assert.ok(
  Array.from({ length: 100 }, (_, index) =>
    artworkForCraft("legendary", index + 1),
  ).some((artwork) => artwork.id === "legendary-crossing"),
  "The supplied painting can be selected as a Legendary collection reward.",
);

assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map(
    (rarity) => CHEST_RARITY_LABELS[rarity],
  ),
  ["Copper", "Silver", "Gold", "Platinum", "Corvi"],
);
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) =>
    chestUpgradeChance(rarity, 1, 2, false),
  ),
  [70, 50, 25, 10, null],
);
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) =>
    chestUpgradeChance(rarity, 1, 3, false),
  ),
  [70, 50, 25, 10, null],
  "The fixed-reward rules keep the agreed upgrade odds.",
);
assert.equal(chestUpgradeChance("epic", 4, 2, true), 100);
assert.equal(chestUpgradeChance("epic", 4, 3, true), 100);
assert.equal(maxChestUpgradeAttempts(2, false), 3);
assert.equal(maxChestUpgradeAttempts(2, true), 4);
assert.equal(maxChestUpgradeAttempts(3, false), 3);
assert.equal(maxChestUpgradeAttempts(3, true), 4);
assert.equal(
  maxChestUpgradeAttempts(1, false),
  3,
  "Legacy chests retain their original attempt limit.",
);
const luckyChestCount = Array.from({ length: 10_000 }, (_, index) =>
  hasSuperUpgradeChance(`lucky-rate-${index}`),
).filter(Boolean).length;
assert.ok(
  luckyChestCount >= 150 && luckyChestCount <= 250,
  `The special fourth attempt stays near 2% (got ${luckyChestCount}/10000).`,
);
assert.deepEqual(
  ["review-1", "add-words-2", "lesson-3"].map(startingRarityForMission),
  ["common", "uncommon", "rare"],
);

let superChestId;
let superChestRarity = "common";
for (let index = 0; index < 100_000 && !superChestId; index += 1) {
  const candidate = `super-chest-${index}`;
  if (!hasSuperUpgradeChance(candidate)) continue;
  let rarity = "common";
  let passedFirstThree = true;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = resolveChestUpgrade(candidate, attempt, rarity, 2, true);
    if (!result.success) {
      passedFirstThree = false;
      break;
    }
    rarity = result.rarity;
  }
  if (passedFirstThree) {
    superChestId = candidate;
    superChestRarity = rarity;
  }
}
assert.ok(
  superChestId,
  "A lucky chest can pass all three ordinary upgrade attempts.",
);
assert.equal(superChestRarity, "epic");
const guaranteedFourth = resolveChestUpgrade(
  superChestId,
  4,
  superChestRarity,
  2,
  true,
);
assert.deepEqual(guaranteedFourth, { success: true, rarity: "legendary" });
assert.deepEqual(
  resolveChestUpgrade(superChestId, 4, superChestRarity, 2, true),
  guaranteedFourth,
  "A repeated offline request yields the same guaranteed super upgrade.",
);
assert.throws(
  () => resolveChestUpgrade("ordinary-v2", 4, "epic", 2, false),
  /không hợp lệ/,
);

const superChest = {
  chestId: superChestId,
  day: "2026-11-10",
  missionId: "review-1",
  baseStone: 5,
  upgradeAttempts: 3,
  rarity: "epic",
  ruleSet: 2,
  superUpgrade: true,
  opened: false,
  finalStone: null,
  createdAt: "2026-11-10T12:00:00.000Z",
  updatedAt: "2026-11-10T12:00:00.000Z",
};
assert.equal(isValidMissionChest(superChest), true);
assert.equal(
  isValidMissionChest({
    ...superChest,
    upgradeAttempts: 4,
    rarity: "legendary",
    opened: true,
    finalStone: chestStoneReward(5, "legendary"),
  }),
  true,
);
assert.equal(
  isValidMissionChest({
    ...superChest,
    ruleSet: 3,
    upgradeAttempts: 4,
    rarity: "legendary",
    opened: true,
    finalStone: chestStoneReward(5, "legendary", 3),
  }),
  true,
  "New-rule chests validate the fixed 1,000 Stone Corvi reward.",
);
assert.equal(
  isValidMissionChest({ ...superChest, superUpgrade: false }),
  false,
  "The lucky state is stable for each chest.",
);

console.log(
  "PASS: legacy reward compatibility, fixed rarity rewards, upgrade odds, task starting tiers, super upgrade, and collection artwork.",
);
