import type {
  SyncCourseProgress,
  SyncCourseSelection,
  SyncDeletedWord,
  SyncPayload,
  SyncReviewStat,
  SyncWord,
} from "./vocabulary-sync";

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
  if (
    words.some((item) => item === null) ||
    deletedWords.some((item) => item === null) ||
    courseProgress.some((item) => item === null) ||
    courseSelections.some((item) => item === null) ||
    reviewStats.some((item) => item === null)
  ) {
    throw new Error("Gói sao lưu có mục dữ liệu không hợp lệ.");
  }

  const validWords = words as SyncWord[];
  const validDeletedWords = deletedWords as SyncDeletedWord[];
  const validCourseProgress = courseProgress as SyncCourseProgress[];
  const validCourseSelections = courseSelections as SyncCourseSelection[];
  const validReviewStats = reviewStats as SyncReviewStat[];
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
    )
  ) {
    throw new Error("Gói sao lưu có mục bị lặp.");
  }

  const wordIds = new Set(validWords.map((word) => word.syncId));
  if (
    validDeletedWords.some((word) => wordIds.has(word.syncId)) ||
    validReviewStats.some((stat) => stat.correctCount > stat.reviewedCount)
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
