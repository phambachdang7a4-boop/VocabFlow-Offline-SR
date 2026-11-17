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
  chestCommonFragmentStoneBonus,
  chestStoneReward,
  chestTotalStoneReward,
  STONE_PER_COMMON_FRAGMENT,
  hasSuperUpgradeChance,
  isValidMissionChest,
  maxChestUpgradeAttempts,
  reopenPrematureMissionChest,
  resolveChestUpgrade,
  startingRarityForMission,
} = missionChests;
const {
  COLLECTION_ARTWORKS,
  artworkForCorviChest,
  artworkForCraft,
  collectionCraftIndex,
  isCurrentCycleCollectionCraft,
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
  assert.ok(
    spent <= chestFragmentPointBudget(chestId, rarity),
    "A drop never exceeds its hidden budget after low-rarity pieces are removed.",
  );
  assert.equal(reward.common, 0);
  assert.equal(reward.uncommon, 0);
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
  const reward = chestFragmentReward(`varied-drop-${index}`, "epic", 4);
  observedDistributions.add(JSON.stringify(reward));
  mixedRarityDrop ||=
    Object.values(reward).filter((count) => count > 0).length > 1;
}
assert.ok(
  observedDistributions.size > 1 && mixedRarityDrop,
  "Random-looking high-tier chest drops vary across the retained fragment rarities.",
);
const twoPointCopperChest = Array.from(
  { length: 500 },
  (_, index) => `copper-two-points-${index}`,
).find((chestId) => chestFragmentPointBudget(chestId, "common") === 2);
assert.ok(twoPointCopperChest, "A Copper chest can roll exactly two Points.");
assert.deepEqual(
  chestFragmentReward(twoPointCopperChest, "common", 4),
  { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  "Copper chests no longer award removed low-rarity fragments.",
);
assert.deepEqual(
  chestFragmentReward("legacy-chest", "epic", 3),
  { common: 0, uncommon: 0, rare: 0, epic: 1, legendary: 0 },
  "Older opened chests keep their original single-fragment award.",
);
const convertedChestId = Array.from(
  { length: 500 },
  (_, index) => `common-fragment-conversion-${index}`,
).find(
  (chestId) => chestCommonFragmentStoneBonus(chestId, "rare", 5) > 0,
);
assert.ok(convertedChestId, "A compatible chest can retain its Stone conversion.");
const convertedStone = chestCommonFragmentStoneBonus(
  convertedChestId,
  "rare",
  5,
);
assert.ok(convertedStone > 0);
assert.equal(
  convertedStone % STONE_PER_COMMON_FRAGMENT,
  0,
  "Each removed Common fragment becomes five Stone.",
);
assert.equal(
  chestTotalStoneReward(convertedChestId, 2, "rare", 5),
  chestStoneReward(2, "rare", 5) + convertedStone,
  "The chest Stone reward includes converted Common fragments.",
);
assert.equal(
  chestCommonFragmentStoneBonus(convertedChestId, "rare", 6),
  0,
  "Current chests do not convert Common fragments to Stone.",
);
assert.equal(
  chestTotalStoneReward(convertedChestId, 2, "rare", 6),
  chestStoneReward(2, "rare", 6),
  "Current chest payouts contain no Common or Uncommon conversion.",
);
assert.deepEqual(
  chestFragmentReward(convertedChestId, "rare", 6),
  chestFragmentReward(convertedChestId, "rare", 5),
  "Removing fragment conversions does not alter the retained Rare-or-higher drops.",
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
  /mở hết tượng/,
  "Common fragments are disabled for statue unlocks.",
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
assert.equal(statue.quoteTranslation, statue.quote);
assert.equal(
  statue.quoteSource,
  "Lời kêu gọi ngày 17 tháng 7 năm 1966",
  "The quote attribution belongs to the quote field, not the biography.",
);
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
assert.equal(
  alexander.quoteTranslation,
  "Không gì là không thể với người dám thử.",
);
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
assert.equal(kant.rarity, "rare");
assert.equal(kant.title, "Tượng Immanuel Kant");
assert.equal(kant.shortTitle, "Kant");
assert.equal(kant.material, "Cẩm thạch");
assert.equal(kant.unlockMode, "automatic");
assert.equal(kant.id, "legendary-immanuel-kant-marble");
assert.equal(isCollectionArtwork("rare", kant.id), true);
assert.equal(
  isValidCollectionCraftArtwork("common", 1, kant.id),
  true,
  "Existing backups may still refer to promoted statues as Common.",
);
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
const firstLegendary = artworkForCraft("legendary", 1);
assert.equal(
  firstLegendary.id,
  collectionArtworks.FIRST_STATUE_ID,
  "The first Legendary unlock is always Hồ Chí Minh.",
);
assert.notEqual(
  artworkForCraft("legendary", 2, new Set([firstLegendary.id])).id,
  firstLegendary.id,
  "A later Legendary unlock cannot repeat the first statue.",
);
assert.notEqual(
  artworkForCorviChest("corvi-first", new Set()).rarity,
  "legendary",
  "Corvi does not reveal another Legendary before Hồ Chí Minh.",
);
assert.ok(
  isCurrentCycleCollectionCraft({ craftId: "cycle2-corvi-example" }),
);
assert.equal(
  isCurrentCycleCollectionCraft({ craftId: "craft-legendary-1" }),
  false,
  "Pre-cycle statue unlocks are locked again.",
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
const missionsScreen = readFileSync(
  join(__dirname, "../app/(tabs)/blank.tsx"),
  "utf8",
);
const missionCollectionTabs = readFileSync(
  join(__dirname, "../components/MissionCollectionTabs.tsx"),
  "utf8",
);
const rootLayout = readFileSync(join(__dirname, "../app/_layout.tsx"), "utf8");
const bottomTabsLayout = readFileSync(
  join(__dirname, "../app/(tabs)/_layout.tsx"),
  "utf8",
);
assert.match(
  rootLayout,
  /name="collection"\s+options=\{\{\s*headerShown:\s*false,\s*animation:\s*"slide_from_right"/,
  "The collection route has no extra title bar and enters from the right.",
);
assert.match(
  rootLayout,
  /name="\(\s*tabs\s*\)"\s+options=\{\{[\s\S]*?animation:\s*"slide_from_left"/,
  "Returning to missions slides the screen in from the left.",
);
assert.equal(
  (bottomTabsLayout.match(/<Tabs\.Screen\s+name=/g) ?? []).length,
  5,
  "The bottom navigation keeps its five existing tabs.",
);
assert.match(
  collectionScreen,
  /overview\?\.crafts\.map\(\(craft\) => craft\.artworkId\)/,
  "Only saved cycle-two statue unlocks appear as owned.",
);
assert.match(
  collectionScreen,
  /FRAGMENT_RARITY_ORDER: FragmentRarity\[\] = \["rare", "epic", "legendary"\]/,
  "Fragment cards display in Rare, Epic, Legendary order without changing their rarity keys.",
);
assert.match(
  collectionScreen,
  /rare:\s*require\("\.\.\/assets\/images\/puzzle-silver\.png"\)[\s\S]*epic:\s*require\("\.\.\/assets\/images\/puzzle-gold\.png"\)[\s\S]*legendary:\s*require\("\.\.\/assets\/images\/puzzle-platinum\.png"\)/,
  "Collection fragment artwork is mapped by rarity key.",
);
assert.match(
  collectionScreen,
  /fragmentImage:\s*\{\s*width:\s*72,\s*height:\s*72/,
  "Collection fragment artwork uses the requested 72dp size.",
);
assert.match(collectionScreen, /resizeMode="contain"/);
assert.match(collectionScreen, /resizeMethod="scale"/);
assert.match(collectionScreen, /imageRendering:\s*"pixelated"/);
assert.match(
  collectionScreen,
  /STATUE_UNLOCK_COST = 10/,
  "Statues unlock at the new 10-fragment threshold.",
);
assert.match(collectionScreen, /<StatuePuzzleModal/);
assert.match(collectionScreen, /soundCueFor\("lessonCompleted"\)/);
const statuePuzzleModal = readFileSync(
  join(__dirname, "../components/StatuePuzzleModal.tsx"),
  "utf8",
);
assert.match(statuePuzzleModal, /testID="statue-puzzle-board"/);
assert.match(statuePuzzleModal, /testID="statue-puzzle-skip"/);
assert.match(statuePuzzleModal, /Bỏ qua, nhận tượng/);
assert.match(collectionScreen, /progressTrack/);
assert.match(
  collectionScreen,
  /width:\s*"23%"/,
  "Unlocked statues use four columns when the screen has room.",
);
assert.match(
  collectionScreen,
  /const compactGallery = useWindowDimensions\(\)\.width < 360/,
  "The statue gallery switches to its compact layout below 360 pixels.",
);
assert.match(
  collectionScreen,
  /artCardCompact:\s*\{\s*width:\s*"31\.5%"\s*\}/,
  "The compact statue gallery fits three readable cards per row.",
);
assert.match(
  collectionScreen,
  /paddingBottom:\s*bottomPad/,
  "The collection reserves scroll space above bottom navigation.",
);
assert.match(
  collectionScreen,
  /justifyContent:\s*"space-between"/,
  "Statue tiles are spaced across each grid row.",
);
assert.match(
  missionCollectionTabs,
  /useWindowDimensions\(\)\.width < 360/,
  "Mission, shop, and collection tabs use compact labels on narrow screens.",
);
assert.match(
  collectionScreen,
  /GALLERY_RARITY_ORDER\.map\(\(rarity\) =>/,
  "The statue gallery is grouped in the requested high-to-low rarity order.",
);
assert.match(
  collectionScreen,
  /const GALLERY_RARITY_ORDER: ChestRarity\[\] = \[\s*"legendary",\s*"epic",\s*"rare",?\s*\];/,
  "Common is no longer shown as a statue rarity.",
);
assert.match(
  collectionScreen,
  /testID=\{`collection-section-\$\{group\.key\}`\}/,
  "Each statue rarity group has its own identifiable section.",
);
assert.match(
  collectionScreen,
  /statues:\s*rarityStatues\s*\.filter\(\(statue\) => unlockedStatueIds\.has\(statue\.id\)\)/,
  "Only unlocked statues are included in the visible gallery tiles.",
);
assert.match(
  collectionScreen,
  /total:\s*rarityStatues\.length/,
  "Rarity sections retain full unlock totals after hidden statues are filtered.",
);
assert.match(
  collectionScreen,
  /group\.statues\.map\(\(\{ artwork: statue, unlocked \}\) =>/,
  "Visible statues retain their unlocked collection details.",
);
assert.doesNotMatch(
  collectionScreen,
  /Mở khóa tượng bằng cách tích đủ mảnh cùng phẩm chất/,
  "The introductory collection notice is removed.",
);
assert.match(
  missionCollectionTabs,
  /params: \{ panel: "collection" \}/,
  "Opening the collection keeps navigation inside the missions tab.",
);
assert.match(
  missionsScreen,
  /showingCollection \? \(\s*<CollectionScreen \/>/,
  "The collection is rendered inside the five-tab missions route.",
);
assert.match(missionsScreen, /SlideInRight\.duration\(250\)/);
assert.match(missionsScreen, /SlideInLeft\.duration\(250\)/);
assert.equal(COLLECTION_ARTWORKS.length, 111);
assert.ok(
  COLLECTION_ARTWORKS.every((item) => item.unlockMode === "automatic"),
  "Legacy artwork metadata remains readable while cycle data controls ownership.",
);
assert.ok(
  COLLECTION_ARTWORKS.every(
    (item) => item.quote && item.quoteSource && item.quoteTranslation,
  ),
  "Every statue has a quote, attribution note, and full Vietnamese translation.",
);
const namedHistoricalStatues = COLLECTION_ARTWORKS.filter(
  (item) => item.collectionGroup !== "bonus",
);
assert.equal(namedHistoricalStatues.length, 111);
assert.ok(
  namedHistoricalStatues.every((item) => item.rarity !== "common"),
  "No named statue remains in the Common tier.",
);
const formerlyCommonStatues = namedHistoricalStatues.filter((item) =>
  item.id.startsWith("common-"),
);
assert.equal(formerlyCommonStatues.length, 39);
assert.ok(
  formerlyCommonStatues.every(
    (item) =>
      (item.title === "Tượng Karl Marx"
        ? item.rarity === "epic"
        : item.rarity === "rare") &&
      isCollectionArtwork("common", item.id),
  ),
  "Former Common statues are promoted, Karl Marx is Epic, and old rarity records remain readable.",
);
assert.equal(statue.rarity, "legendary");
assert.equal(statue.collectionGroup, undefined);
assert.deepEqual(
  Object.fromEntries(
    ["common", "uncommon", "rare", "epic", "legendary"].map((rarity) => [
      rarity,
      namedHistoricalStatues.filter((item) => item.rarity === rarity).length,
    ]),
  ),
  { common: 0, uncommon: 0, rare: 73, epic: 25, legendary: 13 },
  "All 111 statues, including Hồ Chí Minh, are grouped by their rarity.",
);
const expectedHistoricalNames = [
  "Alexander Đại đế",
  "Julius Caesar",
  "Leonardo da Vinci",
  "Isaac Newton",
  "Napoléon Bonaparte",
  "Socrates",
  "Aristotle",
  "Archimedes",
  "Cleopatra VII",
  "Augustus",
  "Marcus Aurelius",
  "Khổng Tử",
  "Michelangelo",
  "William Shakespeare",
  "Galileo Galilei",
  "Plato",
  "Pythagoras",
  "Hippocrates",
  "Homer",
  "Cicero",
  "Hannibal",
  "Dante Alighieri",
  "Nicolaus Copernicus",
  "Johannes Kepler",
  "Voltaire",
  "Charles Darwin",
  "Ludwig van Beethoven",
  "Wolfgang Amadeus Mozart",
  "George Washington",
  "Benjamin Franklin",
  "Euclid",
  "Herodotus",
  "Pericles",
  "Demosthenes",
  "Virgil",
  "Seneca",
  "Ptolemy",
  "Charlemagne",
  "Avicenna",
  "Marco Polo",
  "Johannes Gutenberg",
  "Erasmus",
  "Francis Bacon",
  "René Descartes",
  "Rembrandt",
  "Johann Sebastian Bach",
  "Immanuel Kant",
  "Johann Wolfgang von Goethe",
  "Victor Hugo",
  "Tôn Tử",
  "Hai Bà Trưng",
  "Trần Hưng Đạo",
  "Nguyễn Trãi",
  "Lê Thánh Tông",
  "Nguyễn Bỉnh Khiêm",
  "Nguyễn Du",
  "Hồ Xuân Hương",
  "Phan Châu Trinh",
  "Võ Nguyên Giáp",
  "Thích Nhất Hạnh",
  "Albert Einstein",
  "Mahatma Gandhi",
  "Marie Curie",
  "Thành Cát Tư Hãn",
  "Nelson Mandela",
  "Ramses II",
  "Hatshepsut",
  "Ashoka Đại đế",
  "Tần Thủy Hoàng",
  "Ibn Khaldun",
  "Saladin",
  "Joan of Arc",
  "Elizabeth I",
  "Ada Lovelace",
  "Nikola Tesla",
  "Hammurabi",
  "Cyrus Đại đế",
  "Ibn Battuta",
  "Rumi",
  "Al-Khwarizmi",
  "Omar Khayyam",
  "Akbar Đại đế",
  "Tokugawa Ieyasu",
  "Florence Nightingale",
  "Harriet Tubman",
  "Frederick Douglass",
  "Michael Faraday",
  "Louis Pasteur",
  "Raphael",
  "Vincent van Gogh",
  "Catherine Đại đế",
  "Peter Đại đế",
  "Nữ hoàng Victoria",
  "Abraham Lincoln",
  "Martin Luther King Jr.",
  "Simón Bolívar",
  "José de San Martín",
  "Tôn Trung Sơn",
  "Rabindranath Tagore",
  "Katsushika Hokusai",
  "Frida Kahlo",
  "Claude Monet",
  "Charles Dickens",
  "Jane Austen",
  "Miguel de Cervantes",
  "Karl Marx",
  "Sigmund Freud",
  "Mary Wollstonecraft",
  "Alexander Fleming",
  "Emmeline Pankhurst",
  "Chủ tịch Hồ Chí Minh",
].sort();
assert.deepEqual(
  namedHistoricalStatues
    .map((item) => item.title.replace(/^Tượng /, ""))
    .sort(),
  expectedHistoricalNames,
  "The catalog includes Hồ Chí Minh among all named historical figures.",
);
const aiRecreatedStatues = namedHistoricalStatues.filter((item) =>
  item.sourceLabel?.includes("Tượng nghệ thuật AI tái hiện"),
);
assert.equal(aiRecreatedStatues.length, 50);
assert.ok(
  aiRecreatedStatues.every(
    (item) => item.portraitSourceType === "uncertain-likeness",
  ),
  "AI-recreated portraits are identified as artistic likenesses, not authenticated portraits.",
);
for (const artwork of namedHistoricalStatues) {
  assert.ok(artwork.biography, `${artwork.title} has a Vietnamese biography.`);
  assert.ok(artwork.biographyEn, `${artwork.title} has an English biography.`);
  assert.ok(artwork.imageAssetKey, `${artwork.title} has an image key.`);
}

for (const artwork of COLLECTION_ARTWORKS.filter((item) => item.imageAssetKey)) {
  const imageFile = `${artwork.imageAssetKey}.png`;
  const imagePath = join(__dirname, `../assets/images/${imageFile}`);
  assert.ok(
    existsSync(imagePath),
    `${artwork.title} (${imageFile}) is bundled for offline display.`,
  );
  assert.ok(
    collectionScreen.includes(
      `"${artwork.imageAssetKey}": require("../assets/images/${imageFile}")`,
    ),
    `${artwork.title} (${imageFile}) is registered for the collection screen.`,
  );

  const image = readFileSync(imagePath);
  assert.ok(
    image.length >= 24 &&
      image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `${artwork.title} (${imageFile}) is not a valid PNG image.`,
  );
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  assert.equal(
    `${width}x${height}`,
    "768x768",
    `${artwork.title} (${imageFile}) must be 768x768; found ${width}x${height}.`,
  );
}
const karlMarxArtwork = COLLECTION_ARTWORKS.find(
  (item) => item.title === "Tượng Karl Marx",
);
assert.ok(karlMarxArtwork, "Karl Marx remains in the statue collection.");
assert.equal(karlMarxArtwork.rarity, "epic",
  "Karl Marx is displayed in the Epic tier.");
assert.equal(karlMarxArtwork.id, "common-karl-marx-marble",
  "Promoting Karl Marx keeps the existing collection ID and biography record.");
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
assert.match(
  collectionScreen,
  /Famous Quote/,
  "The statue detail view exposes the Famous Quote after the user opens it.",
);
assert.doesNotMatch(
  collectionScreen,
  /statue-famous-quote|statue\.quote/,
  "Collection cards hide Famous Quotes until a statue is opened.",
);
assert.match(
  collectionScreen,
  /selectedStatue\.quoteSource \?\? selectedStatue\.title/,
  "Quote attribution comes from the statue data rather than a fixed person.",
);
assert.match(collectionScreen, /selectedStatue\.quote/);
assert.match(collectionScreen, /selectedStatue\.quoteTranslation/);
assert.match(collectionScreen, /BẢN DỊCH TIẾNG VIỆT/);
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
assert.equal(
  artworkForCraft("epic", 1).rarity,
  "epic",
  "Epic fragments unlock an Epic statue.",
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
