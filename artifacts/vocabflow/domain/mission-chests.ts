export const CHEST_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;
export type ChestRarity = (typeof CHEST_RARITIES)[number];
export type ChestRuleSet = 1 | 2 | 3 | 4;

export const CHEST_RARITY_LABELS: Record<ChestRarity, string> = {
  common: "Copper",
  uncommon: "Silver",
  rare: "Gold",
  epic: "Platinum",
  legendary: "Corvi",
};

export const CHEST_RARITY_COLORS: Record<ChestRarity, string> = {
  common: "#C47A3D",
  uncommon: "#BDC7D3",
  rare: "#E9B949",
  epic: "#BBCDE3",
  legendary: "#111318",
};

export const CHEST_RARITY_ICON_COLORS: Record<ChestRarity, string> = {
  common: "#23232D",
  uncommon: "#23232D",
  rare: "#23232D",
  epic: "#23232D",
  legendary: "#F7F3EA",
};

export const CHEST_RARITY_TEXT_COLORS: Record<ChestRarity, string> = {
  common: "#B87333",
  uncommon: "#A7ADB4",
  rare: "#E9B949",
  epic: "#B5C7DD",
  legendary: "#D7D9DE",
};

export interface MissionChest {
  chestId: string;
  day: string;
  missionId: string;
  baseStone: number;
  upgradeAttempts: number;
  rarity: ChestRarity;
  ruleSet?: ChestRuleSet;
  superUpgrade?: boolean;
  opened: boolean;
  finalStone: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChestUpgrade {
  success: boolean;
  rarity: ChestRarity;
}

const LEGACY_STONE_BONUS: Record<ChestRarity, number> = {
  common: 0,
  uncommon: 2,
  rare: 5,
  epic: 10,
  legendary: 20,
};

export const CHEST_FIXED_STONE_REWARDS: Record<ChestRarity, number> = {
  common: 25,
  uncommon: 50,
  rare: 100,
  epic: 150,
  legendary: 1000,
};

export const COLLECTION_FRAGMENT_POINT_COSTS: Record<ChestRarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 9,
  epic: 27,
  legendary: 81,
};

export const CHEST_FRAGMENT_POINT_RANGES: Record<
  ChestRarity,
  { min: number; max: number }
> = {
  common: { min: 2, max: 10 },
  uncommon: { min: 6, max: 30 },
  rare: { min: 18, max: 90 },
  epic: { min: 54, max: 270 },
  legendary: { min: 162, max: 810 },
};

export type CollectionFragmentReward = Record<ChestRarity, number>;

export function chestFragmentPointBudget(
  chestId: string,
  rarity: ChestRarity,
): number {
  if (!chestId.trim()) throw new Error("Mã rương không hợp lệ.");
  const range = CHEST_FRAGMENT_POINT_RANGES[rarity];
  return (
    range.min +
    (stableHash(`fragment-points:${chestId}:${rarity}`) %
      (range.max - range.min + 1))
  );
}

export function chestFragmentReward(
  chestId: string,
  rarity: ChestRarity,
  ruleSet: ChestRuleSet = 1,
): CollectionFragmentReward {
  const reward: CollectionFragmentReward = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  if (ruleSet < 4) {
    reward[rarity] = 1;
    return reward;
  }
  if (!chestId.trim()) throw new Error("Mã rương không hợp lệ.");

  const tierIndex = CHEST_RARITIES.indexOf(rarity);
  let points = chestFragmentPointBudget(chestId, rarity);
  const budget = points;
  let roll = 0;

  // A stable per-chest pseudo-random choice makes the drop repeatable offline
  // and identical after account sync or backup restoration.
  while (points > 0) {
    const available = CHEST_RARITIES.slice(0, tierIndex + 1).filter(
      (candidate) => COLLECTION_FRAGMENT_POINT_COSTS[candidate] <= points,
    );
    const selectedHash = stableHash(
      `fragment-distribution:${chestId}:${rarity}:${roll}`,
    );
    const selected = available[selectedHash % available.length]!;
    reward[selected] += 1;
    points -= COLLECTION_FRAGMENT_POINT_COSTS[selected];
    roll += 1;
  }

  const spent = CHEST_RARITIES.reduce(
    (total, candidate) =>
      total + reward[candidate] * COLLECTION_FRAGMENT_POINT_COSTS[candidate],
    0,
  );
  if (spent > budget) throw new Error("Phần thưởng mảnh vượt quá Points.");
  return reward;
}

export function chestStoneReward(
  baseStone: number,
  rarity: ChestRarity,
  ruleSet: ChestRuleSet = 1,
): number {
  if (!Number.isSafeInteger(baseStone) || baseStone < 1 || baseStone > 20) {
    throw new Error("Stone trong rương không hợp lệ.");
  }
  return ruleSet >= 3
    ? CHEST_FIXED_STONE_REWARDS[rarity]
    : baseStone + LEGACY_STONE_BONUS[rarity];
}

export function startingRarityForMission(missionId: string): ChestRarity {
  const match = /^(review|add-words|lesson|grade|time|combo)-([1-3])$/.exec(
    missionId,
  );
  if (!match) throw new Error("Nhiệm vụ gắn với rương không hợp lệ.");
  if (match[2] === "1") return "common";
  if (match[2] === "2") return "uncommon";
  return "rare";
}

export function hasSuperUpgradeChance(chestId: string): boolean {
  if (!chestId.trim()) throw new Error("Mã rương không hợp lệ.");
  return stableHash(`super-upgrade:${chestId}`) % 100 < 2;
}

export function maxChestUpgradeAttempts(
  ruleSet: ChestRuleSet,
  superUpgrade: boolean,
): number {
  return ruleSet >= 2 && superUpgrade ? 4 : 3;
}

export function reopenPrematureMissionChest(
  chest: MissionChest,
  updatedAt = new Date().toISOString(),
): MissionChest {
  const ruleSet = chest.ruleSet ?? 1;
  const superUpgrade = chest.superUpgrade ?? false;
  const attemptLimit = maxChestUpgradeAttempts(ruleSet, superUpgrade);
  if (
    ruleSet < 2 ||
    !chest.opened ||
    chest.upgradeAttempts >= attemptLimit ||
    chest.rarity === "legendary" ||
    !isValidMissionChest(chest)
  ) {
    return chest;
  }
  return { ...chest, opened: false, finalStone: null, updatedAt };
}

export function chestUpgradeChance(
  rarity: ChestRarity,
  attempt: number,
  ruleSet: ChestRuleSet,
  superUpgrade: boolean,
): number | null {
  if (ruleSet === 1) return null;
  if (attempt === 4 && superUpgrade) return 100;
  const tierIndex = CHEST_RARITIES.indexOf(rarity);
  if (tierIndex < 0 || tierIndex >= 4) return null;
  return [70, 50, 25, 10][tierIndex] ?? null;
}

/**
 * Stable per chest and attempt so offline devices resolve the same upgrade.
 * The roll is only used for game rewards; it is not a security boundary.
 */
export function resolveChestUpgrade(
  chestId: string,
  attempt: number,
  currentRarity: ChestRarity = "common",
  ruleSet: ChestRuleSet = 1,
  superUpgrade = false,
): ChestUpgrade {
  const attemptLimit = maxChestUpgradeAttempts(ruleSet, superUpgrade);
  if (
    !chestId.trim() ||
    !Number.isSafeInteger(attempt) ||
    attempt < 1 ||
    attempt > attemptLimit
  ) {
    throw new Error("Lượt nâng cấp rương không hợp lệ.");
  }
  if (ruleSet === 1) return resolveLegacyChestUpgrade(chestId, attempt);

  const tierIndex = CHEST_RARITIES.indexOf(currentRarity);
  if (tierIndex < 0 || tierIndex >= CHEST_RARITIES.length - 1) {
    throw new Error("Rương đã ở phẩm chất cao nhất.");
  }
  const rarity = CHEST_RARITIES[tierIndex + 1]!;
  if (attempt === 4 && superUpgrade) return { success: true, rarity };

  const chance = chestUpgradeChance(
    currentRarity,
    attempt,
    ruleSet,
    superUpgrade,
  );
  if (chance === null) throw new Error("Không xác định được tỉ lệ nâng cấp.");
  const roll =
    stableHash(`rarity-upgrade-v2:${chestId}:${attempt}:${currentRarity}`) %
    100;
  return roll < chance
    ? { success: true, rarity }
    : { success: false, rarity: currentRarity };
}

function resolveLegacyChestUpgrade(
  chestId: string,
  attempt: number,
): ChestUpgrade {
  const roll = stableHash(`${chestId}:${attempt}`) % 100;
  if (attempt === 1)
    return roll < 55
      ? { success: true, rarity: "uncommon" }
      : { success: false, rarity: "common" };
  if (attempt === 2)
    return roll < 40
      ? { success: true, rarity: "rare" }
      : { success: false, rarity: "uncommon" };
  if (roll < 5) return { success: true, rarity: "legendary" };
  if (roll < 25) return { success: true, rarity: "epic" };
  return { success: false, rarity: "rare" };
}

export function isValidMissionChest(chest: MissionChest): boolean {
  const ruleSet = chest.ruleSet ?? 1;
  const superUpgrade = chest.superUpgrade ?? false;
  if (
    !chest.chestId.trim() ||
    !isDay(chest.day) ||
    !/^(review|add-words|lesson|grade|time|combo)-[1-3]$/.test(
      chest.missionId,
    ) ||
    !Number.isSafeInteger(chest.baseStone) ||
    chest.baseStone < 1 ||
    chest.baseStone > 20 ||
    !Number.isSafeInteger(chest.upgradeAttempts) ||
    chest.upgradeAttempts < 0 ||
    chest.upgradeAttempts > maxChestUpgradeAttempts(ruleSet, superUpgrade) ||
    (ruleSet !== 1 && ruleSet !== 2 && ruleSet !== 3 && ruleSet !== 4) ||
    (ruleSet === 1 && superUpgrade) ||
    (ruleSet >= 2 && superUpgrade !== hasSuperUpgradeChance(chest.chestId)) ||
    !CHEST_RARITIES.includes(chest.rarity) ||
    typeof chest.opened !== "boolean" ||
    !isTimestamp(chest.createdAt) ||
    !isTimestamp(chest.updatedAt)
  ) {
    return false;
  }

  let expectedRarity =
    ruleSet === 1 ? "common" : startingRarityForMission(chest.missionId);
  let expectedOpened = false;
  let resolvedAttempts = 0;
  let lastUpgradeSucceeded = true;
  const attemptLimit = maxChestUpgradeAttempts(ruleSet, superUpgrade);
  for (let attempt = 1; attempt <= chest.upgradeAttempts; attempt += 1) {
    if (expectedOpened) return false;
    const result = resolveChestUpgrade(
      chest.chestId,
      attempt,
      expectedRarity,
      ruleSet,
      superUpgrade,
    );
    resolvedAttempts = attempt;
    lastUpgradeSucceeded = result.success;
    if (result.success) expectedRarity = result.rarity;
    expectedOpened =
      attempt === attemptLimit ||
      expectedRarity === "legendary" ||
      (ruleSet === 1 && !result.success);
  }

  const wasPrematurelyFinalized =
    ruleSet >= 2 &&
    chest.opened &&
    !expectedOpened &&
    !lastUpgradeSucceeded &&
    chest.upgradeAttempts < attemptLimit &&
    expectedRarity !== "legendary";
  if (
    resolvedAttempts !== chest.upgradeAttempts ||
    chest.rarity !== expectedRarity ||
    (chest.opened !== expectedOpened && !wasPrematurelyFinalized)
  ) {
    return false;
  }
  return chest.opened
    ? chest.finalStone ===
        chestStoneReward(chest.baseStone, chest.rarity, ruleSet)
    : chest.finalStone === null;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isTimestamp(value: string): boolean {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    Number.isFinite(Date.parse(value))
  );
}
