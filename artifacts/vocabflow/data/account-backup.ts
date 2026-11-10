import type {
  SyncCourseProgress,
  SyncCourseSelection,
  SyncCollectionCraft,
  SyncDeletedWord,
  SyncMissionAward,
  SyncMissionChest,
  SyncPayload,
  SyncReviewSession,
  SyncReviewStat,
  SyncWord,
} from "./vocabulary-sync";
import { isValidMissionChest } from "../domain/mission-chests";
import {
  artworkForCraft,
  isCollectionArtwork,
} from "../domain/collection-artworks";

export const ACCOUNT_BACKUP_FORMAT = "vocabflow.account-backup";
export const ACCOUNT_BACKUP_VERSION = 1;
// Keep transfers below the API server's 5 MiB JSON request limit.
export const MAX_ACCOUNT_BACKUP_BYTES = 4 * 1024 * 1024;
const MAX_RECORDS = 10_000;

export interface AccountBackupFile {
  format: typeof ACCOUNT_BACKUP_FORMAT;
  version: typeof ACCOUNT_BACKUP_VERSION;
  exportedAt: string;
  payload: SyncPayload;
}

export interface AccountBackupSummary {
  personalWordCount: number;
  frozenWordCount: number;
  courseRecordCount: number;
  reviewStatDayCount: number;
}

export function summarizeAccountBackup(
  backup: AccountBackupFile,
): AccountBackupSummary {
  const { words, courseProgress, courseSelections, reviewStats } =
    backup.payload;
  return {
    personalWordCount: words.length,
    frozenWordCount: words.filter((word) => word.frozen).length,
    courseRecordCount: courseProgress.length + courseSelections.length,
    reviewStatDayCount: new Set(reviewStats.map((stat) => stat.day)).size,
  };
}

export function serializeAccountBackup(payload: SyncPayload): string {
  const backup: AccountBackupFile = {
    format: ACCOUNT_BACKUP_FORMAT,
    version: ACCOUNT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    payload: validatePayload(payload),
  };
  const text = JSON.stringify(backup);
  if (utf8ByteLength(text) > MAX_ACCOUNT_BACKUP_BYTES) {
    throw new Error("Gói sao lưu vượt quá 4 MiB.");
  }
  return text;
}

export function parseAccountBackup(text: string): AccountBackupFile {
  if (utf8ByteLength(text) > MAX_ACCOUNT_BACKUP_BYTES) {
    throw new Error("Tệp sao lưu vượt quá 4 MiB.");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Không đọc được tệp JSON sao lưu.");
  }
  if (
    !isRecord(value) ||
    value.format !== ACCOUNT_BACKUP_FORMAT ||
    value.version !== ACCOUNT_BACKUP_VERSION ||
    !isTimestamp(value.exportedAt)
  ) {
    throw new Error("Tệp không phải gói sao lưu VocabFlow được hỗ trợ.");
  }

  return {
    format: ACCOUNT_BACKUP_FORMAT,
    version: ACCOUNT_BACKUP_VERSION,
    exportedAt: value.exportedAt,
    payload: validatePayload(value.payload),
  };
}

function validatePayload(value: unknown): SyncPayload {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.revision) ||
    !isRecordArrays(value, [
      "words",
      "deletedWords",
      "courseProgress",
      "courseSelections",
      "reviewStats",
    ])
  ) {
    throw new Error("Gói sao lưu thiếu dữ liệu hoặc sai cấu trúc.");
  }

  const words = value.words.map(parseWord);
  const deletedWords = value.deletedWords.map(parseDeletedWord);
  const courseProgress = value.courseProgress.map(parseCourseProgress);
  const courseSelections = value.courseSelections.map(parseCourseSelection);
  const reviewStats = value.reviewStats.map(parseReviewStat);
  const reviewSessions = optionalRecordArray(value, "reviewSessions").map(
    parseReviewSession,
  );
  const missionAwards = optionalRecordArray(value, "missionAwards").map(
    parseMissionAward,
  );
  const missionChests = optionalRecordArray(value, "missionChests").map(
    parseMissionChest,
  );
  const collectionCrafts = optionalRecordArray(value, "collectionCrafts").map(
    parseCollectionCraft,
  );
  if (
    words.some((item) => item === null) ||
    deletedWords.some((item) => item === null) ||
    courseProgress.some((item) => item === null) ||
    courseSelections.some((item) => item === null) ||
    reviewStats.some((item) => item === null) ||
    reviewSessions.some((item) => item === null) ||
    missionAwards.some((item) => item === null) ||
    missionChests.some((item) => item === null) ||
    collectionCrafts.some((item) => item === null)
  ) {
    throw new Error("Gói sao lưu có mục dữ liệu không hợp lệ.");
  }

  const validWords = words as SyncWord[];
  const validDeletedWords = deletedWords as SyncDeletedWord[];
  const validCourseProgress = courseProgress as SyncCourseProgress[];
  const validCourseSelections = courseSelections as SyncCourseSelection[];
  const validReviewStats = reviewStats as SyncReviewStat[];
  const validReviewSessions = reviewSessions as SyncReviewSession[];
  const validMissionAwards = missionAwards as SyncMissionAward[];
  const validMissionChests = missionChests as SyncMissionChest[];
  const validCollectionCrafts = collectionCrafts as SyncCollectionCraft[];
  if (
    hasDuplicates(validWords, (word) => word.syncId) ||
    hasDuplicates(validDeletedWords, (word) => word.syncId) ||
    hasDuplicates(validCourseProgress, (item) => item.lessonId) ||
    hasDuplicates(
      validCourseSelections,
      (item) => `${item.lessonId}\u0000${item.wordId}`,
    ) ||
    hasDuplicates(
      validReviewStats,
      (item) => `${item.deviceId}\u0000${item.day}`,
    ) ||
    hasDuplicates(validReviewSessions, (item) => item.sessionId) ||
    hasDuplicates(
      validMissionAwards,
      (item) => `${item.day}\u0000${item.missionId}`,
    ) ||
    hasDuplicates(validMissionChests, (item) => item.chestId) ||
    hasDuplicates(
      validMissionChests,
      (item) => `${item.day}\u0000${item.missionId}`,
    ) ||
    hasDuplicates(validCollectionCrafts, (item) => item.craftId) ||
    hasDuplicates(
      validCollectionCrafts,
      (item) => `${item.rarity}\u0000${item.craftIndex}`,
    )
  ) {
    throw new Error("Gói sao lưu có mục bị lặp.");
  }

  const wordIds = new Set(validWords.map((word) => word.syncId));
  if (
    validDeletedWords.some((word) => wordIds.has(word.syncId)) ||
    validReviewStats.some((stat) => stat.correctCount > stat.reviewedCount) ||
    validReviewSessions.some(
      (session) => session.correctCount > session.reviewedCount,
    )
  ) {
    throw new Error("Gói sao lưu có trạng thái dữ liệu mâu thuẫn.");
  }

  return {
    revision: value.revision as number,
    words: validWords,
    deletedWords: validDeletedWords,
    courseProgress: validCourseProgress,
    courseSelections: validCourseSelections,
    reviewStats: validReviewStats,
    reviewSessions: validReviewSessions,
    missionAwards: validMissionAwards,
    missionChests: validMissionChests,
    collectionCrafts: validCollectionCrafts,
  };
}

function parseMissionChest(value: unknown): SyncMissionChest | null {
  if (
    !isRecord(value) ||
    !isString(value.chestId, 160, false) ||
    !isDay(value.day) ||
    !isString(value.missionId, 40, false) ||
    !isPositiveInteger(value.baseStone) ||
    value.baseStone > 20 ||
    !isNonNegativeInteger(value.upgradeAttempts) ||
    value.upgradeAttempts > 4 ||
    (value.ruleSet !== undefined &&
      value.ruleSet !== 1 &&
      value.ruleSet !== 2 &&
      value.ruleSet !== 3 &&
      value.ruleSet !== 4) ||
    (value.superUpgrade !== undefined &&
      typeof value.superUpgrade !== "boolean") ||
    !isChestRarity(value.rarity) ||
    typeof value.opened !== "boolean" ||
    (value.finalStone !== null &&
      (!isPositiveInteger(value.finalStone) || value.finalStone > 1000)) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }
  const chest: SyncMissionChest = {
    chestId: value.chestId,
    day: value.day,
    missionId: value.missionId,
    baseStone: value.baseStone as number,
    upgradeAttempts: value.upgradeAttempts,
    rarity: value.rarity,
    ruleSet:
      value.ruleSet === 4
        ? 4
        : value.ruleSet === 3
          ? 3
          : value.ruleSet === 2
            ? 2
            : 1,
    superUpgrade: value.superUpgrade === true,
    opened: value.opened,
    finalStone: value.finalStone as number | null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  return isValidMissionChest(chest) ? chest : null;
}

function parseCollectionCraft(value: unknown): SyncCollectionCraft | null {
  if (
    !isRecord(value) ||
    !isString(value.craftId, 120, false) ||
    !isChestRarity(value.rarity) ||
    !isPositiveInteger(value.craftIndex) ||
    !isString(value.artworkId, 80, false) ||
    !isTimestamp(value.craftedAt) ||
    (value.pieceCost !== undefined &&
      value.pieceCost !== 20 &&
      value.pieceCost !== 100) ||
    value.craftId !== `craft-${value.rarity}-${value.craftIndex}` ||
    !isCollectionArtwork(value.rarity, value.artworkId) ||
    artworkForCraft(value.rarity, value.craftIndex as number).id !==
      value.artworkId
  ) {
    return null;
  }
  return {
    craftId: value.craftId,
    rarity: value.rarity,
    craftIndex: value.craftIndex as number,
    artworkId: value.artworkId,
    craftedAt: value.craftedAt,
    pieceCost: value.pieceCost === 100 ? 100 : 20,
  };
}

function parseReviewSession(value: unknown): SyncReviewSession | null {
  const grades = ["S+", "S", "A+", "A", "A-", "B+", "B", "B-", "C"];
  if (
    !isRecord(value) ||
    !isString(value.sessionId, 120, false) ||
    !isString(value.deviceId, 80, false) ||
    !isDay(value.day) ||
    !isNonNegativeInteger(value.reviewedCount) ||
    !isNonNegativeInteger(value.correctCount) ||
    value.correctCount > value.reviewedCount ||
    typeof value.grade !== "string" ||
    !grades.includes(value.grade) ||
    typeof value.completed !== "boolean" ||
    !isTimestamp(value.createdAt)
  ) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    deviceId: value.deviceId,
    day: value.day,
    reviewedCount: value.reviewedCount,
    correctCount: value.correctCount,
    grade: value.grade as SyncReviewSession["grade"],
    completed: value.completed,
    createdAt: value.createdAt,
  };
}

function parseMissionAward(value: unknown): SyncMissionAward | null {
  if (
    !isRecord(value) ||
    !isDay(value.day) ||
    !isString(value.missionId, 40, false) ||
    !isIntegerInRange(value.stone, 1, 20) ||
    !isTimestamp(value.completedAt)
  ) {
    return null;
  }
  return {
    day: value.day,
    missionId: value.missionId,
    stone: value.stone,
    completedAt: value.completedAt,
  };
}

function parseWord(value: unknown): SyncWord | null {
  if (
    !isRecord(value) ||
    !isString(value.syncId, 7000, false) ||
    !isString(value.term, 200, false) ||
    !isString(value.meaning, 2000, false) ||
    !isString(value.ipa, 200) ||
    !isString(value.example, 4000) ||
    !isString(value.note, 4000) ||
    !isNullablePositiveInteger(value.dictionaryEntryId) ||
    !isNullablePositiveInteger(value.dictionarySenseId) ||
    (value.dictionaryEntryId === null) !== (value.dictionarySenseId === null) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.contentUpdatedAt) ||
    !isNonNegativeInteger(value.reviewCount) ||
    !isIntegerInRange(value.level, 1, 6) ||
    !isDay(value.learnedOn) ||
    !(value.nextReviewOn === null || isDay(value.nextReviewOn)) ||
    typeof value.completed !== "boolean" ||
    !(value.lastReviewedOn === null || isDay(value.lastReviewedOn)) ||
    typeof value.frozen !== "boolean" ||
    !isTimestamp(value.progressUpdatedAt)
  ) {
    return null;
  }
  return {
    syncId: value.syncId,
    term: value.term,
    meaning: value.meaning,
    ipa: value.ipa,
    example: value.example,
    note: value.note,
    dictionaryEntryId: value.dictionaryEntryId,
    dictionarySenseId: value.dictionarySenseId,
    createdAt: value.createdAt,
    contentUpdatedAt: value.contentUpdatedAt,
    reviewCount: value.reviewCount,
    level: value.level,
    learnedOn: value.learnedOn,
    nextReviewOn: value.nextReviewOn,
    completed: value.completed,
    lastReviewedOn: value.lastReviewedOn,
    frozen: value.frozen,
    progressUpdatedAt: value.progressUpdatedAt,
  };
}

function parseDeletedWord(value: unknown): SyncDeletedWord | null {
  if (
    !isRecord(value) ||
    !isString(value.syncId, 7000, false) ||
    !isTimestamp(value.deletedAt)
  ) {
    return null;
  }
  return { syncId: value.syncId, deletedAt: value.deletedAt };
}

function parseCourseProgress(value: unknown): SyncCourseProgress | null {
  if (
    !isRecord(value) ||
    !isString(value.lessonId, 200, false) ||
    !isNonNegativeInteger(value.currentIndex) ||
    !(["flashcard", "answer", "selection", "completed"] as unknown[]).includes(
      value.stage,
    ) ||
    !(value.completedAt === null || isTimestamp(value.completedAt)) ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }
  return {
    lessonId: value.lessonId,
    currentIndex: value.currentIndex,
    stage: value.stage as SyncCourseProgress["stage"],
    completedAt: value.completedAt,
    updatedAt: value.updatedAt,
  };
}

function parseCourseSelection(value: unknown): SyncCourseSelection | null {
  if (
    !isRecord(value) ||
    !isString(value.lessonId, 200, false) ||
    !isString(value.wordId, 200, false) ||
    typeof value.selected !== "boolean" ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }
  return {
    lessonId: value.lessonId,
    wordId: value.wordId,
    selected: value.selected,
    updatedAt: value.updatedAt,
  };
}

function parseReviewStat(value: unknown): SyncReviewStat | null {
  if (
    !isRecord(value) ||
    !isString(value.deviceId, 80, false) ||
    !isDay(value.day) ||
    !isNonNegativeInteger(value.reviewedCount) ||
    !isNonNegativeInteger(value.correctCount) ||
    !(
      value.sessionCount === undefined ||
      isNonNegativeInteger(value.sessionCount)
    ) ||
    value.correctCount > value.reviewedCount ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }
  return {
    deviceId: value.deviceId,
    day: value.day,
    reviewedCount: value.reviewedCount,
    correctCount: value.correctCount,
    sessionCount: (value.sessionCount as number | undefined) ?? 0,
    updatedAt: value.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecordArrays(
  value: Record<string, unknown>,
  keys: string[],
): value is Record<string, unknown[]> {
  return keys.every(
    (key) => Array.isArray(value[key]) && value[key].length <= MAX_RECORDS,
  );
}

function optionalRecordArray(
  value: Record<string, unknown>,
  key: string,
): unknown[] {
  const items = value[key];
  if (items === undefined) return [];
  if (!Array.isArray(items) || items.length > MAX_RECORDS) {
    throw new Error("Gói sao lưu có danh sách dữ liệu không hợp lệ.");
  }
  return items;
}

function isString(
  value: unknown,
  maxLength: number,
  allowEmpty = true,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0)
  );
}

function isTimestamp(value: unknown): value is string {
  return isString(value, 64, false) && Number.isFinite(Date.parse(value));
}

function isDay(value: unknown): value is string {
  if (!isString(value, 10, false) || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isChestRarity(value: unknown): value is SyncMissionChest["rarity"] {
  return (
    value === "common" ||
    value === "uncommon" ||
    value === "rare" ||
    value === "epic" ||
    value === "legendary"
  );
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes +=
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;
  }
  return bytes;
}

function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= min &&
    (value as number) <= max
  );
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return (
    value === null || (Number.isSafeInteger(value) && (value as number) > 0)
  );
}

function hasDuplicates<T>(items: T[], keyFor: (item: T) => string): boolean {
  const keys = new Set<string>();
  for (const item of items) {
    const key = keyFor(item);
    if (keys.has(key)) return true;
    keys.add(key);
  }
  return false;
}
