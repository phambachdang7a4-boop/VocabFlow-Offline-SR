const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  loadTs,
  missionChests,
  collectionArtworks,
} = require("./test-support.cjs");
const rewardQueue = loadTs(
  join(__dirname, "../domain/mission-reward-queue.ts"),
);

const {
  CHEST_RARITY_LABELS,
  chestUpgradeChance,
  CHEST_FRAGMENT_POINT_RANGES,
  COLLECTION_FRAGMENT_POINT_COSTS,
  chestFragmentPointBudget,
  chestFragmentReward,
  chestStoneReward,
  hasSuperUpgradeChance,
  isValidMissionChest,
  maxChestUpgradeAttempts,
  reopenPrematureMissionChest,
  resolveChestUpgrade,
  startingRarityForMission,
} = missionChests;
const {
  COLLECTION_ARTWORKS,
  artworkForCraft,
  isCollectionArtwork,
  isValidCollectionCraftArtwork,
} = collectionArtworks;

const queuedChest = (chestId, missionId, createdAt) => ({
  chestId,
  missionId,
  createdAt,
});
const queueMissions = [
  { id: "review-1", level: 1, title: "Ôn 30 từ" },
  { id: "review-2", level: 2, title: "Ôn 60 từ" },
  { id: "review-3", level: 3, title: "Ôn 90 từ" },
];
const initialQueue = [
  {
    chestId: "pending-older",
    missionId: "review-2",
    title: "Ôn 60 từ",
    level: 2,
  },
];
const reconciledQueue = rewardQueue.reconcileMissionRewardQueue(
  initialQueue,
  [
    queuedChest("pending-older", "review-2", "2026-11-13T10:00:00Z"),
    queuedChest("new-level-3", "review-3", "2026-11-13T10:01:00Z"),
    queuedChest("new-level-1", "review-1", "2026-11-13T10:02:00Z"),
  ],
  queueMissions,
);
assert.deepEqual(
  reconciledQueue.map((item) => item.chestId),
  ["pending-older", "new-level-1", "new-level-3"],
  "Newly completed mission chests queue once in task-level order.",
);
assert.deepEqual(
  rewardQueue
    .reconcileMissionRewardQueue(
      reconciledQueue,
      [
        queuedChest("new-level-3", "review-3", "2026-11-13T10:01:00Z"),
        queuedChest("new-level-1", "review-1", "2026-11-13T10:02:00Z"),
      ],
      queueMissions,
    )
    .map((item) => item.chestId),
  ["new-level-1", "new-level-3"],
  "Opened chests leave the queue while unopened rewards remain in order.",
);

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
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map(
    (rarity) => CHEST_FRAGMENT_POINT_RANGES[rarity],
  ),
  [
    { min: 2, max: 10 },
    { min: 6, max: 30 },
    { min: 18, max: 90 },
    { min: 54, max: 270 },
    { min: 162, max: 810 },
  ],
  "Fragment point ranges are doubled, stay hidden from the UI, and depend on chest rarity.",
);
assert.deepEqual(
  ["common", "uncommon", "rare", "epic", "legendary"].map(
    (rarity) => COLLECTION_FRAGMENT_POINT_COSTS[rarity],
  ),
  [1, 3, 9, 27, 81],
);
for (const rarity of ["common", "uncommon", "rare", "epic", "legendary"]) {
  const chestId = `fragment-seed-${rarity}`;
  const reward = chestFragmentReward(chestId, rarity, 4);
  const spent = Object.entries(reward).reduce(
    (total, [pieceRarity, count]) =>
      total + count * COLLECTION_FRAGMENT_POINT_COSTS[pieceRarity],
    0,
  );
  assert.equal(
    spent,
    chestFragmentPointBudget(chestId, rarity),
    "A drop uses its full hidden budget without exceeding it.",
  );
  assert.deepEqual(
    reward,
    chestFragmentReward(chestId, rarity, 4),
    "Opening or syncing the same chest yields the same random-looking drop.",
  );
  const chestTier = ["common", "uncommon", "rare", "epic", "legendary"].indexOf(
    rarity,
  );
  assert.ok(
    Object.entries(reward).every(
      ([pieceRarity, count]) =>
        count === 0 ||
        ["common", "uncommon", "rare", "epic", "legendary"].indexOf(
          pieceRarity,
        ) <= chestTier,
    ),
    "A chest never awards fragments above its rarity.",
  );
}
const observedDistributions = new Set();
let mixedRarityDrop = false;
for (let index = 0; index < 500; index += 1) {
  const reward = chestFragmentReward(`varied-drop-${index}`, "uncommon", 4);
  observedDistributions.add(JSON.stringify(reward));
  mixedRarityDrop ||=
    Object.values(reward).filter((count) => count > 0).length > 1;
}
assert.ok(
  observedDistributions.size > 1 && mixedRarityDrop,
  "Random-looking chest drops vary and can award multiple fragment rarities.",
);
const twoPointCopperChest = Array.from(
  { length: 500 },
  (_, index) => `copper-two-points-${index}`,
).find((chestId) => chestFragmentPointBudget(chestId, "common") === 2);
assert.ok(twoPointCopperChest, "A Copper chest can roll exactly two Points.");
assert.deepEqual(
  chestFragmentReward(twoPointCopperChest, "common", 4),
  { common: 2, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  "Two hidden Points from a Copper chest award exactly two Copper fragments.",
);
assert.deepEqual(
  chestFragmentReward("legacy-chest", "epic", 3),
  { common: 0, uncommon: 0, rare: 0, epic: 1, legendary: 0 },
  "Older opened chests keep their original single-fragment award.",
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
  /chest\.opened \? \(\s*<Animated\.View[\s\S]*?testID="chest-reward-preview"/,
  "Reward details appear only after the chest is finalized.",
);
assert.match(
  chestScreen,
  /testID="chest-tap-prompt"/,
  "The unopened chest screen prompts the learner to tap the chest.",
);
assert.match(
  chestScreen,
  /testID="tap-chest-art"/,
  "The chest illustration is the upgrade control.",
);
assert.doesNotMatch(
  chestScreen,
  /testID="upgrade-mission-chest"/,
  "There is no second upgrade button separate from the chest.",
);
assert.match(
  chestScreen,
  /rewardFlow === "1"[\s\S]*?router\.back\(\)/,
  "Reward-flow chest screens return to the app screen that was interrupted.",
);
const rewardCoordinator = readFileSync(
  join(__dirname, "../components/MissionRewardCoordinator.tsx"),
  "utf8",
);
assert.match(
  rewardCoordinator,
  /subscribeSyncChanges/,
  "Task completion is detected from local database changes across app tabs.",
);
assert.match(
  rewardCoordinator,
  /Animated\.timing/,
  "The task completion popup animates its progress bar before opening a chest.",
);
assert.match(
  rewardCoordinator,
  /AsyncStorage\.setItem/,
  "The unopened chest sequence survives navigation and app restarts.",
);
assert.match(
  rewardCoordinator,
  /testID="mission-completion-popup"/,
  "A dedicated completion popup appears before the chest screen.",
);
assert.match(
  chestScreen,
  /Bạn nhận \$\{result\.awardedStone\} Stone và \$\{fragmentRewardLabel\(result\.awardedFragments\)\}/,
  "The chest result reports the Stone and fragments actually awarded.",
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
  "Legacy rule-set chests keep their original early-finalization behavior.",
);

let retryChestId;
for (let index = 0; index < 100_000; index += 1) {
  const id = `retry-mission-${index}`;
  if (
    !hasSuperUpgradeChance(id) &&
    !resolveChestUpgrade(id, 1, "common", 4, false).success
  ) {
    retryChestId = id;
    break;
  }
}
assert.ok(retryChestId, "The new rules can roll a failed first tap.");
const retryFirst = resolveChestUpgrade(retryChestId, 1, "common", 4, false);
const retryingChest = {
  ...failedChest,
  chestId: retryChestId,
  missionId: "review-1",
  upgradeAttempts: 1,
  rarity: retryFirst.rarity,
  ruleSet: 4,
  superUpgrade: false,
  opened: false,
  finalStone: null,
};
assert.equal(
  isValidMissionChest(retryingChest),
  true,
  "A failed tap under current rules leaves the chest valid and available.",
);
const oldPrematureChest = {
  ...retryingChest,
  opened: true,
  finalStone: chestStoneReward(5, retryingChest.rarity, 4),
};
assert.equal(
  isValidMissionChest(oldPrematureChest),
  true,
  "A previously finalized early chest remains readable for migration.",
);
const reopenedChest = reopenPrematureMissionChest(
  oldPrematureChest,
  "2026-11-13T12:00:00.000Z",
);
assert.equal(reopenedChest.opened, false);
assert.equal(reopenedChest.finalStone, null);
assert.equal(reopenedChest.upgradeAttempts, 1);
assert.equal(isValidMissionChest(reopenedChest), true);
assert.equal(
  reopenPrematureMissionChest(failedChest),
  failedChest,
  "Legacy chests retain their historical rewards.",
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

assert.throws(
  () => artworkForCraft("common", 1),
  /Chưa có tượng/,
  "Rarities without statues cannot consume fragments.",
);
const statue = COLLECTION_ARTWORKS.find(
  (item) => item.id === collectionArtworks.FIRST_STATUE_ID,
);
assert.ok(statue);
assert.equal(statue.rarity, "legendary");
assert.equal(statue.title, "Tượng Chủ tịch Hồ Chí Minh");
assert.equal(statue.shortTitle, "Bác Hồ");
assert.equal(statue.material, "Cẩm thạch");
assert.equal(statue.unlockMode, "automatic");
assert.ok(statue.biography.includes("19.05.1890 – 02.09.1969"));
assert.ok(statue.biography.includes("Nguyễn Sinh Cung"));
assert.ok(statue.biography.includes("Tuyên ngôn Độc lập"));
assert.equal(statue.quote, "Không có gì quý hơn độc lập, tự do.");
assert.ok(statue.biographyEn.includes("Nothing is more precious than independence and freedom."));
assert.ok(statue.biographyEn.includes("PERSONAL BACKGROUND"));
assert.ok(statue.biographyEn.includes("LIFE AND REVOLUTIONARY CAREER"));
assert.ok(statue.biographyEn.includes("February 3"));
assert.equal(
  statue.sourceLabel,
  "Cổng thông tin điện tử Hồ Chí Minh",
);
const alexander = COLLECTION_ARTWORKS.find(
  (item) => item.id === "legendary-alexander-marble",
);
assert.ok(alexander);
assert.equal(alexander.rarity, "legendary");
assert.equal(alexander.title, "Tượng Alexander Đại đế");
assert.equal(alexander.shortTitle, "Alexander");
assert.equal(alexander.material, "Cẩm thạch");
assert.equal(alexander.unlockMode, "automatic");
assert.ok(alexander.biography.includes("Aristotle"));
assert.ok(alexander.biography.includes("Hydaspes"));
assert.ok(alexander.biographyEn.includes("Gaugamela"));
assert.ok(alexander.biographyEn.includes("location of his tomb"));
const leonardo = COLLECTION_ARTWORKS.find(
  (item) => item.id === "legendary-leonardo-marble",
);
assert.ok(leonardo);
assert.equal(leonardo.rarity, "legendary");
assert.equal(leonardo.title, "Tượng Leonardo da Vinci");
assert.equal(leonardo.shortTitle, "Leonardo");
assert.equal(leonardo.material, "Cẩm thạch");
assert.equal(leonardo.unlockMode, "automatic");
assert.ok(leonardo.biography.includes("Andrea del Verrocchio"));
assert.ok(leonardo.biography.includes("Bữa ăn tối cuối cùng"));
assert.ok(leonardo.biographyEn.includes("Salvator Mundi"));
assert.ok(leonardo.biographyEn.includes("detailed studies of human anatomy"));
const kant = COLLECTION_ARTWORKS.find(
  (item) => item.id === "legendary-immanuel-kant-marble",
);
assert.ok(kant);
assert.equal(kant.rarity, "common");
assert.equal(kant.title, "Tượng Immanuel Kant");
assert.equal(kant.shortTitle, "Kant");
assert.equal(kant.material, "Cẩm thạch");
assert.equal(kant.unlockMode, "automatic");
assert.ok(kant.biography.includes("Chủ nghĩa duy tâm siêu nghiệm"));
assert.ok(kant.biography.includes("Phê phán lý tính thuần túy"));
assert.ok(kant.biographyEn.includes("Transcendental Idealism"));
assert.ok(kant.biographyEn.includes("Critique of Practical Reason"));
const marcus = COLLECTION_ARTWORKS.find(
  (item) => item.id === "epic-marcus-aurelius-marble",
);
assert.ok(marcus);
assert.equal(marcus.rarity, "epic");
assert.equal(marcus.title, "Tượng Marcus Aurelius");
assert.equal(marcus.shortTitle, "Marcus Aurelius");
assert.equal(marcus.material, "Cẩm thạch");
assert.equal(marcus.unlockMode, "automatic");
assert.ok(marcus.biography.includes("đại dịch Antonine"));
assert.ok(marcus.biographyEn.includes("Meditations"));
const franklin = COLLECTION_ARTWORKS.find(
  (item) => item.id === "rare-benjamin-franklin-marble",
);
assert.ok(franklin);
assert.equal(franklin.rarity, "rare");
assert.equal(franklin.title, "Tượng Benjamin Franklin");
assert.equal(franklin.shortTitle, "Benjamin Franklin");
assert.equal(franklin.material, "Cẩm thạch");
assert.equal(franklin.unlockMode, "automatic");
assert.ok(franklin.biography.includes("Tuyên ngôn Độc lập Hoa Kỳ"));
assert.ok(franklin.biographyEn.includes("Poor Richard's Almanack"));
const napoleon = COLLECTION_ARTWORKS.find(
  (item) => item.id === "legendary-napoleon-bonaparte-marble",
);
assert.ok(napoleon);
assert.equal(napoleon.rarity, "legendary");
assert.equal(napoleon.title, "Tượng Napoléon Bonaparte");
assert.equal(napoleon.shortTitle, "Napoléon");
assert.equal(napoleon.material, "Cẩm thạch");
assert.equal(napoleon.unlockMode, "automatic");
assert.ok(napoleon.biography.includes("Code Napoléon"));
assert.ok(napoleon.biographyEn.includes("Battle of Waterloo"));
assert.throws(
  () => artworkForCraft("legendary", 0),
  /không hợp lệ/,
  "Legendary craft indices must remain positive.",
);
assert.throws(
  () => artworkForCraft("legendary", 1),
  /Chưa có tượng/,
  "All currently available statues are unlocked without fragment costs.",
);
assert.equal(
  isValidCollectionCraftArtwork("legendary", 1, statue.id),
  true,
  "Backups created before automatic unlocking still accept the old HCM craft.",
);
const collectionScreen = readFileSync(
  join(__dirname, "../app/collection.tsx"),
  "utf8",
);
assert.match(
  collectionScreen,
  /statue\.unlockMode === "automatic"/,
  "Automatically unlocked statues appear without saved craft records.",
);
assert.match(
  collectionScreen,
  /item\.unlockMode !== "automatic"/,
  "Automatically unlocked statues are excluded from fragment crafting.",
);
assert.match(
  collectionScreen,
  /width:\s*"23%"/,
  "Unlocked statues are arranged in four columns on the collection grid.",
);
assert.match(
  collectionScreen,
  /justifyContent:\s*"space-between"/,
  "Four statue tiles are spaced across each grid row.",
);
assert.equal(COLLECTION_ARTWORKS.length, 7);
assert.ok(
  COLLECTION_ARTWORKS.every((item) => item.unlockMode === "automatic"),
  "All currently available statues are unlocked without fragments.",
);
assert.equal(isCollectionArtwork("legendary", statue.id), true);
assert.equal(isCollectionArtwork("legendary", alexander.id), true);
assert.equal(isCollectionArtwork("legendary", leonardo.id), true);
assert.equal(isCollectionArtwork("common", kant.id), true);
assert.equal(isCollectionArtwork("epic", marcus.id), true);
assert.equal(isCollectionArtwork("rare", franklin.id), true);
assert.equal(isCollectionArtwork("legendary", napoleon.id), true);
assert.equal(isCollectionArtwork("epic", "epic-repose"), false);
assert.ok(
  existsSync(join(__dirname, "../assets/images/ho-chi-minh-marble.png")),
  "The Legendary marble statue is bundled for offline display.",
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/alexander-marble.png")),
  "Alexander's marble statue is bundled for offline display.",
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/leonardo-marble.png")),
  "Leonardo's marble statue is bundled for offline display.",
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/kant-marble.png")),
  "Kant's marble statue is bundled for offline display.",
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/marcus-aurelius-marble.png")),
  "Marcus Aurelius's marble statue is bundled for offline display.",
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/benjamin-franklin-marble.png")),
  "Benjamin Franklin's marble statue is bundled for offline display.",
);
assert.ok(
  existsSync(join(__dirname, "../assets/images/napoleon-marble.png")),
  "Napoleon's marble statue is bundled for offline display.",
);
assert.match(
  collectionScreen,
  /setSelectedStatue\(statue\)/,
  "Tapping a statue opens its information.",
);
assert.match(
  collectionScreen,
  /visible=\{selectedStatue !== null\}/,
  "The statue biography is shown in a dismissible modal.",
);
assert.match(
  collectionScreen,
  /selectedStatue\.biography/,
  "The detail view renders the full biography.",
);
assert.match(collectionScreen, /selectedStatue\.quote/);
assert.match(collectionScreen, /statue-translation-toggle/);
assert.match(collectionScreen, /MaterialCommunityIcons\s+name="translate"/);
assert.match(collectionScreen, /selectedStatue\.biographyEn/);
assert.match(
  collectionScreen,
  /testID=\{\s*showEnglishBiography && selectedStatue\.biographyEn\s*\?\s*"statue-biography-english"\s*:\s*"statue-biography-vietnamese"/,
);
assert.match(collectionScreen, /Dịch tiểu sử sang tiếng Anh/);
assert.match(collectionScreen, /Hiện tiểu sử bằng tiếng Việt/);
assert.doesNotMatch(
  collectionScreen,
  /translationBlock|translationLabel/,
  "The translated biography replaces the original instead of appearing below it.",
);
assert.throws(
  () => artworkForCraft("epic", 1),
  /Chưa có tượng/,
  "Other qualities remain unavailable until their statue catalog is added.",
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
assert.equal(chestUpgradeChance("epic", 4, 4, true), 100);
assert.equal(maxChestUpgradeAttempts(2, false), 3);
assert.equal(maxChestUpgradeAttempts(2, true), 4);
assert.equal(maxChestUpgradeAttempts(3, false), 3);
assert.equal(maxChestUpgradeAttempts(3, true), 4);
assert.equal(maxChestUpgradeAttempts(4, false), 3);
assert.equal(maxChestUpgradeAttempts(4, true), 4);
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
  ["review-1", "add-words-2", "lesson-3", "time-2", "combo-1"].map(
    startingRarityForMission,
  ),
  ["common", "uncommon", "rare", "uncommon", "common"],
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
    ruleSet: 4,
    upgradeAttempts: 4,
    rarity: "legendary",
    opened: true,
    finalStone: chestStoneReward(5, "legendary", 3),
  }),
  true,
  "Points-rule chests validate the fixed 1,000 Stone Corvi reward.",
);
assert.equal(
  isValidMissionChest({ ...superChest, superUpgrade: false }),
  false,
  "The lucky state is stable for each chest.",
);

console.log(
  "PASS: legacy reward compatibility, fixed rarity rewards, upgrade odds, task starting tiers, super upgrade, and statue collection.",
);
