import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import * as Crypto from "expo-crypto";
import type { VocabularyWord, WordInput } from "./types";
import { openDatabaseSafely } from "./sqlite-connection";
import {
  applyReview,
  freezeProgress,
  initialProgress,
  localDay,
  rescheduleProgress,
  unfreezeProgress,
  type SrsProgress,
} from "../domain/srs";
import {
  buildReviewStatistics,
  reviewMonthRange,
  reviewWeekRange,
  type ReviewStatistics,
} from "../domain/review-statistics";
import {
  evaluateDailyMissions,
  missionAwardIsEarned,
  type DailyMission,
  type DailyMissionActivity,
  type DailyMissionAward,
  type DailyReviewGrade,
} from "../domain/daily-missions";
import {
  CORVI_CHEST_FRAGMENT_COST,
  CORVI_CHEST_STONE_REWARD,
  MAX_TAP_CHEST_RARITY,
  chestFragmentReward,
  chestTotalStoneReward,
  hasSuperUpgradeChance,
  isValidMissionChest,
  maxChestUpgradeAttempts,
  reopenPrematureMissionChest,
  resolveChestUpgrade,
  startingRarityForMission,
  type ChestRarity,
  type MissionChest,
} from "../domain/mission-chests";
import {
  artworkForCorviChest,
  artworkForCraft,
  COLLECTION_CYCLE_PREFIX,
  COLLECTION_ARTWORKS,
  collectionCraftIndex,
  isCurrentCycleCollectionCraft,
  type CollectionArtwork,
  type CollectionCraft,
} from "../domain/collection-artworks";
import {
  MISSION_SHOP_PRODUCTS,
  isValidMissionShopPurchase,
  missionShopOffersForDay,
  missionShopPurchaseId,
  type MissionShopOffer,
  type MissionShopProductId,
  type MissionShopPurchase,
} from "../domain/mission-shop";
import {
  evaluateStoneInvestment,
  forceMajeureOccurs,
  investmentEndDay,
  isValidStoneInvestment,
  type InvestmentStudyDay,
  type StoneInvestment,
  type StoneInvestmentDuration,
  type StoneInvestmentPlan,
  type StoneInvestmentCapitalInvite,
  MAX_STONE_INVESTMENT_PRINCIPAL,
} from "../domain/stone-investments";

let connection: Promise<SQLiteDatabase> | undefined;
let databaseScope: string | null = null;
const syncListeners = new Set<() => void>();
const syncAppliedListeners = new Set<() => void>();

export interface DailyMissionOverview {
  day: string;
  stoneBalance: number;
  missions: DailyMission[];
  chests: MissionChest[];
  corviFragments: number;
  corviChestsOpened: number;
  corviLatestStoneReward: number | null;
}

export interface MissionCollectionOverview {
  fragments: Record<ChestRarity, number>;
  crafts: CollectionCraft[];
}

export interface MissionShopOverview {
  day: string;
  stoneBalance: number;
  fragments: Record<ChestRarity, number>;
  inventory: Record<MissionShopProductId, number>;
  offers: (MissionShopOffer & {
    purchased: number;
    remainingStock: number;
  })[];
}

export interface StoneInvestmentOverview {
  today: string;
  stoneBalance: number;
  inventory: Record<MissionShopProductId, number>;
  investments: StoneInvestment[];
  studyDays: InvestmentStudyDay[];
}

export interface MissionChestUpgradeResult {
  chest: MissionChest;
  succeeded: boolean;
  finished: boolean;
  awardedStone: number | null;
  awardedFragments: Record<ChestRarity, number> | null;
  awardedStatue: CollectionArtwork | null;
  compensatedPieces: number;
}

export interface CorviStatueReward {
  artwork: CollectionArtwork;
  compensationPieces: number;
}

export interface ReviewSessionResultInput {
  sessionId: string;
  startedAt: number;
  activeDurationMs: number;
  maxCombo: number;
  reviewedCount: number;
  correctCount: number;
  grade: DailyReviewGrade;
  completed: boolean;
}

export interface ReviewComboRewardInput {
  sessionId: string;
  startedAt: number;
  comboIndex: number;
  comboLength: number;
}

export interface ReviewSessionSummaryMetrics {
  stoneEarned: number;
  personalComboRecord: number;
}

export function normalizeTerm(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function cleanWordInput(input: WordInput): WordInput {
  const clean: WordInput = {
    term: input.term.normalize("NFKC").trim().replace(/\s+/g, " "),
    meaning: input.meaning.trim(),
    ipa: input.ipa.trim(),
    example: input.example.trim(),
    note: input.note.trim(),
    dictionaryEntryId: input.dictionaryEntryId ?? null,
    dictionarySenseId: input.dictionarySenseId ?? null,
  };
  if (!clean.term || !clean.meaning) {
    throw new Error("Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.");
  }
  if (
    clean.term.length > 200 ||
    clean.meaning.length > 2000 ||
    clean.ipa.length > 200 ||
    clean.example.length > 4000 ||
    clean.note.length > 4000
  ) {
    throw new Error(
      "Nội dung quá dài. Từ và IPA tối đa 200 ký tự, nghĩa 2.000, ví dụ và ghi chú 4.000.",
    );
  }
  return clean;
}

function validateDictionarySense(
  entryId: number | null,
  senseId: number | null,
): void {
  if (
    (entryId === null) !== (senseId === null) ||
    (entryId !== null &&
      (!Number.isSafeInteger(entryId) ||
        entryId < 1 ||
        !Number.isSafeInteger(senseId) ||
        senseId! < 1))
  ) {
    throw new Error("Vui lòng chọn một nghĩa từ điển hợp lệ.");
  }
}

async function assertWordIsNotDuplicate(
  db: SQLiteDatabase,
  clean: WordInput,
  entryId: number | null,
  senseId: number | null,
  excludedId = -1,
): Promise<void> {
  const key = normalizeTerm(clean.term);
  const meaningKey = normalizeTerm(clean.meaning);
  const duplicate = await db.getFirstAsync<{ id: number }>(
    entryId === null
      ? "SELECT id FROM words WHERE normalized_term = ? AND normalized_meaning = ? AND id != ?"
      : `SELECT id FROM words WHERE ((dictionary_entry_id = ? AND dictionary_sense_id = ?) OR
          (dictionary_entry_id IS NULL AND normalized_term = ? AND normalized_meaning = ?)) AND id != ?`,
    ...(entryId === null
      ? [key, meaningKey, excludedId]
      : [entryId, senseId, key, meaningKey, excludedId]),
  );
  if (duplicate) {
    throw new Error(
      "Từ này với nghĩa đã chọn đã có trong danh sách. Hãy sửa mục đã lưu.",
    );
  }
}

function syncIdForWord(
  term: string,
  meaning: string,
  entryId: number | null,
  senseId: number | null,
): string {
  if (entryId !== null && senseId !== null) return `dict:${entryId}:${senseId}`;
  return `manual:${encodeURIComponent(normalizeTerm(term))}:${encodeURIComponent(normalizeTerm(meaning))}`;
}

function databaseFilename(): string {
  if (!databaseScope) return "vocabflow.db";
  const scope = encodeURIComponent(databaseScope).replace(/%/g, "_");
  return `vocabflow-account-${scope}.db`;
}

function getDeviceId(db: SQLiteDatabase): Promise<string> {
  return db
    .getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_state WHERE key = 'device_id'",
    )
    .then((row) => {
      if (!row?.value)
        throw new Error("Không thể khởi tạo mã thiết bị để đồng bộ.");
      return row.value;
    });
}

async function markSyncDirty(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`
    INSERT INTO sync_state (key, value) VALUES ('generation', '1')
    ON CONFLICT(key) DO UPDATE SET value = CAST(sync_state.value AS INTEGER) + 1
  `);
  await db.runAsync(`
    INSERT INTO sync_state (key, value) VALUES ('pending', '1')
    ON CONFLICT(key) DO UPDATE SET value = '1'
  `);
}

async function repairKnownExtractionExample(
  db: SQLiteDatabase,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const repaired = await db.runAsync(
      `UPDATE words
       SET example = ?, updated_at = ?
       WHERE normalized_term = 'terrific'
         AND lower(trim(example)) = 'grudge terrific'`,
      "The meal was terrific and fresh.",
      new Date().toISOString(),
    );
    if (repaired.changes > 0) await markSyncDirty(db);
  });
}

function notifySyncListeners(): void {
  for (const listener of syncListeners) listener();
}

/** Rebuild both sides of the FK in one transaction to remove the old UNIQUE
 * headword constraint without cascading away anyone's progress. */
async function migrateIndependentSenses(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const sequence = await db.getFirstAsync<{ seq: number }>(
      "SELECT seq FROM sqlite_sequence WHERE name = 'words'",
    );
    const meanings = await db.getAllAsync<{ id: number; meaning: string }>(
      "SELECT id, meaning FROM words",
    );
    await db.execAsync(`
      CREATE TABLE words_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL, normalized_term TEXT NOT NULL,
        meaning TEXT NOT NULL, normalized_meaning TEXT NOT NULL,
        ipa TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        dictionary_entry_id INTEGER, dictionary_sense_id INTEGER,
        CHECK ((dictionary_entry_id IS NULL AND dictionary_sense_id IS NULL) OR
          (dictionary_entry_id IS NOT NULL AND dictionary_sense_id IS NOT NULL AND
           dictionary_entry_id > 0 AND dictionary_sense_id > 0))
      );
      INSERT INTO words_next (id, term, normalized_term, meaning, normalized_meaning, ipa, example, note, created_at, updated_at)
        SELECT id, term, normalized_term, meaning, meaning, ipa, example, note, created_at, updated_at FROM words;
      CREATE TABLE word_progress_next (
        word_id INTEGER PRIMARY KEY REFERENCES words_next(id) ON DELETE CASCADE,
        review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
        level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6),
        learned_on TEXT NOT NULL DEFAULT '', next_review_on TEXT,
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        last_reviewed_on TEXT,
        frozen INTEGER NOT NULL DEFAULT 0 CHECK (frozen IN (0, 1))
      );
      INSERT INTO word_progress_next
        (word_id, review_count, level, learned_on, next_review_on, completed, last_reviewed_on, frozen)
        SELECT word_id, review_count, level, learned_on, next_review_on, completed, last_reviewed_on, frozen FROM word_progress;
      DROP TABLE word_progress;
      DROP TABLE words;
      ALTER TABLE words_next RENAME TO words;
      ALTER TABLE word_progress_next RENAME TO word_progress;
    `);
    for (const word of meanings) {
      await db.runAsync(
        "UPDATE words SET normalized_meaning = ? WHERE id = ?",
        normalizeTerm(word.meaning),
        word.id,
      );
    }
    if (sequence) {
      await db.runAsync(
        "INSERT INTO sqlite_sequence(name, seq) SELECT 'words', ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'words')",
        sequence.seq,
      );
      await db.runAsync(
        "UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'words'",
        sequence.seq,
      );
    }
    await db.execAsync(`
      CREATE UNIQUE INDEX idx_words_manual_sense ON words(normalized_term, normalized_meaning)
        WHERE dictionary_entry_id IS NULL;
      CREATE UNIQUE INDEX idx_words_dictionary_sense ON words(dictionary_entry_id, dictionary_sense_id)
        WHERE dictionary_entry_id IS NOT NULL;
      CREATE INDEX idx_words_term ON words(normalized_term);
      CREATE INDEX idx_progress_due ON word_progress(completed, next_review_on);
      PRAGMA user_version = 5;
    `);
    const invalid = await db.getFirstAsync("PRAGMA foreign_key_check");
    if (invalid)
      throw new Error(
        "Không thể chuyển dữ liệu an toàn. Dữ liệu cũ được giữ nguyên.",
      );
  });
}

async function initialize(): Promise<SQLiteDatabase> {
  const db = await openDatabaseSafely(() =>
    openDatabaseAsync(databaseFilename()),
  );
  try {
    await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    const version = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    if ((version?.user_version ?? 0) > 31) {
      throw new Error(
        "Dữ liệu thuộc phiên bản mới hơn. Hãy cập nhật VocabFlow.",
      );
    }
    if ((version?.user_version ?? 0) < 1) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT NOT NULL,
            normalized_term TEXT NOT NULL UNIQUE,
            meaning TEXT NOT NULL,
            ipa TEXT NOT NULL DEFAULT '',
            example TEXT NOT NULL DEFAULT '',
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS word_progress (
            word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
            review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0)
          );
          PRAGMA user_version = 1;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 2) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          ALTER TABLE word_progress ADD COLUMN level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6);
          ALTER TABLE word_progress ADD COLUMN learned_on TEXT NOT NULL DEFAULT '';
          ALTER TABLE word_progress ADD COLUMN next_review_on TEXT;
          ALTER TABLE word_progress ADD COLUMN completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1));
          ALTER TABLE word_progress ADD COLUMN last_reviewed_on TEXT;
          INSERT OR IGNORE INTO word_progress (word_id) SELECT id FROM words;
        `);
        const existing = await db.getAllAsync<{
          id: number;
          createdAt: string;
        }>("SELECT id, created_at AS createdAt FROM words");
        for (const word of existing) {
          const progress = initialProgress(localDay(new Date(word.createdAt)));
          await db.runAsync(
            "UPDATE word_progress SET learned_on = ?, next_review_on = ? WHERE word_id = ?",
            progress.learnedOn,
            progress.nextReviewOn,
            word.id,
          );
        }
        await db.execAsync(
          "CREATE INDEX idx_progress_due ON word_progress(completed, next_review_on); PRAGMA user_version = 2;",
        );
      });
    }
    if ((version?.user_version ?? 0) < 3) {
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<
          Omit<SrsProgress, "completed"> & { wordId: number; completed: number }
        >(
          `SELECT word_id AS wordId, level, learned_on AS learnedOn, next_review_on AS nextReviewOn, 0 AS frozen,
             completed, review_count AS reviewCount, last_reviewed_on AS lastReviewedOn FROM word_progress`,
        );
        for (const row of rows) {
          const progress = rescheduleProgress({
            ...row,
            completed: row.completed === 1,
          });
          await db.runAsync(
            "UPDATE word_progress SET next_review_on = ? WHERE word_id = ?",
            progress.nextReviewOn,
            row.wordId,
          );
        }
        await db.execAsync("PRAGMA user_version = 3;");
      });
    }
    if ((version?.user_version ?? 0) < 4) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          ALTER TABLE word_progress ADD COLUMN frozen INTEGER NOT NULL DEFAULT 0 CHECK (frozen IN (0, 1));
          PRAGMA user_version = 4;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 5) await migrateIndependentSenses(db);
    if ((version?.user_version ?? 0) < 6) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS course_lesson_progress (
            lesson_id TEXT PRIMARY KEY,
            current_index INTEGER NOT NULL DEFAULT 0 CHECK (current_index >= 0),
            stage TEXT NOT NULL DEFAULT 'flashcard'
              CHECK (stage IN ('flashcard', 'answer', 'selection', 'completed')),
            completed_at TEXT,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS course_word_selection (
            lesson_id TEXT NOT NULL,
            word_id TEXT NOT NULL,
            selected INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0, 1)),
            PRIMARY KEY (lesson_id, word_id)
          );
          CREATE INDEX IF NOT EXISTS idx_course_progress_completed
            ON course_lesson_progress(stage, completed_at);
          PRAGMA user_version = 6;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 7) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS review_day_statistics (
            review_day TEXT PRIMARY KEY NOT NULL,
            reviewed_count INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_count >= 0),
            correct_count INTEGER NOT NULL DEFAULT 0
              CHECK (correct_count >= 0 AND correct_count <= reviewed_count)
          );
          PRAGMA user_version = 7;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 8) {
      await db.execAsync("PRAGMA user_version = 8;");
    }
    if ((version?.user_version ?? 0) < 9) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          ALTER TABLE words ADD COLUMN sync_id TEXT NOT NULL DEFAULT '';
          ALTER TABLE word_progress ADD COLUMN sync_updated_at TEXT NOT NULL DEFAULT '';
          ALTER TABLE course_word_selection ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
          CREATE TABLE IF NOT EXISTS sync_word_tombstones (
            sync_id TEXT PRIMARY KEY NOT NULL,
            deleted_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS device_review_day_statistics (
            review_day TEXT NOT NULL,
            device_id TEXT NOT NULL,
            reviewed_count INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_count >= 0),
            correct_count INTEGER NOT NULL DEFAULT 0
              CHECK (correct_count >= 0 AND correct_count <= reviewed_count),
            updated_at TEXT NOT NULL,
            PRIMARY KEY (review_day, device_id)
          );
          CREATE TABLE IF NOT EXISTS sync_state (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        const deviceId = Crypto.randomUUID();
        await db.runAsync(
          "INSERT OR REPLACE INTO sync_state (key, value) VALUES ('device_id', ?)",
          deviceId,
        );
        await db.runAsync(
          "INSERT OR IGNORE INTO sync_state (key, value) VALUES ('generation', '0')",
        );
        await db.runAsync(
          "INSERT OR IGNORE INTO sync_state (key, value) VALUES ('pending', '0')",
        );
        const words = await db.getAllAsync<{
          id: number;
          term: string;
          meaning: string;
          entryId: number | null;
          senseId: number | null;
          createdAt: string;
          updatedAt: string;
        }>(`
          SELECT id, term, meaning, dictionary_entry_id AS entryId,
            dictionary_sense_id AS senseId, created_at AS createdAt, updated_at AS updatedAt
          FROM words
        `);
        for (const word of words) {
          await db.runAsync(
            "UPDATE words SET sync_id = ? WHERE id = ?",
            syncIdForWord(word.term, word.meaning, word.entryId, word.senseId),
            word.id,
          );
          await db.runAsync(
            "UPDATE word_progress SET sync_updated_at = ? WHERE word_id = ?",
            word.updatedAt || word.createdAt || new Date().toISOString(),
            word.id,
          );
        }
        await db.runAsync(
          "UPDATE course_word_selection SET updated_at = ? WHERE updated_at = ''",
          new Date().toISOString(),
        );
        const legacyStats = await db.getAllAsync<{
          day: string;
          reviewed: number;
          correct: number;
        }>(`
          SELECT review_day AS day, reviewed_count AS reviewed, correct_count AS correct
          FROM review_day_statistics
        `);
        const now = new Date().toISOString();
        for (const stat of legacyStats) {
          await db.runAsync(
            `
            INSERT OR IGNORE INTO device_review_day_statistics
              (review_day, device_id, reviewed_count, correct_count, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `,
            stat.day,
            deviceId,
            stat.reviewed,
            stat.correct,
            now,
          );
        }
        await db.execAsync(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_words_sync_id ON words(sync_id);
          PRAGMA user_version = 9;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 10) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          ALTER TABLE review_day_statistics
            ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0
            CHECK (session_count >= 0);
          ALTER TABLE device_review_day_statistics
            ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0
            CHECK (session_count >= 0);
          PRAGMA user_version = 10;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 11) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS review_session_results (
            session_id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            review_day TEXT NOT NULL,
            reviewed_count INTEGER NOT NULL CHECK (reviewed_count >= 0),
            correct_count INTEGER NOT NULL CHECK (correct_count >= 0 AND correct_count <= reviewed_count),
            grade TEXT NOT NULL CHECK (grade IN ('S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C')),
            completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_review_session_results_day ON review_session_results(review_day);
          CREATE TABLE IF NOT EXISTS daily_mission_awards (
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            stone INTEGER NOT NULL CHECK (stone BETWEEN 1 AND 20),
            completed_at TEXT NOT NULL,
            PRIMARY KEY (mission_day, mission_id)
          );
          PRAGMA user_version = 11;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 12) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS mission_chests (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 3),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 40)
            )
          );
          CREATE INDEX IF NOT EXISTS idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
          CREATE TABLE IF NOT EXISTS collection_crafts (
            craft_id TEXT PRIMARY KEY NOT NULL,
            rarity TEXT NOT NULL
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            craft_index INTEGER NOT NULL CHECK (craft_index >= 1),
            artwork_id TEXT NOT NULL,
            crafted_at TEXT NOT NULL,
            UNIQUE (rarity, craft_index)
          );
          PRAGMA user_version = 12;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 13) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE mission_chests_v13 (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 4),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            rule_set INTEGER NOT NULL DEFAULT 1 CHECK (rule_set IN (1, 2)),
            super_upgrade INTEGER NOT NULL DEFAULT 0 CHECK (super_upgrade IN (0, 1)),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 40)
            )
          );
          INSERT INTO mission_chests_v13
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
          SELECT chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
            1, 0, opened, final_stone, created_at, updated_at
          FROM mission_chests;
          DROP TABLE mission_chests;
          ALTER TABLE mission_chests_v13 RENAME TO mission_chests;
          CREATE INDEX idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
          PRAGMA user_version = 13;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 14) {
      await db.withTransactionAsync(async () => {
        const now = new Date().toISOString();
        await db.runAsync(
          `INSERT INTO sync_word_tombstones (sync_id, deleted_at)
           SELECT sync_id, ? FROM words WHERE instr(note, 'Khóa học:') > 0
           ON CONFLICT(sync_id) DO UPDATE SET
             deleted_at = MAX(sync_word_tombstones.deleted_at, excluded.deleted_at)`,
          now,
        );
        await db.execAsync(`
          DELETE FROM words WHERE instr(note, 'Khóa học:') > 0;
          DELETE FROM course_lesson_progress;
          DELETE FROM course_word_selection;
          PRAGMA user_version = 14;
        `);
        await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 15) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE mission_chests_v15 (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 4),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            rule_set INTEGER NOT NULL DEFAULT 1 CHECK (rule_set IN (1, 2, 3)),
            super_upgrade INTEGER NOT NULL DEFAULT 0 CHECK (super_upgrade IN (0, 1)),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 1000)
            )
          );
          INSERT INTO mission_chests_v15
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
          SELECT chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
            rule_set, super_upgrade, opened, final_stone, created_at, updated_at
          FROM mission_chests;
          DROP TABLE mission_chests;
          ALTER TABLE mission_chests_v15 RENAME TO mission_chests;
          CREATE INDEX idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
          PRAGMA user_version = 15;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 16) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE mission_chests_v16 (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 4),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            rule_set INTEGER NOT NULL DEFAULT 1 CHECK (rule_set IN (1, 2, 3, 4)),
            super_upgrade INTEGER NOT NULL DEFAULT 0 CHECK (super_upgrade IN (0, 1)),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 1000)
            )
          );
          INSERT INTO mission_chests_v16
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
          SELECT chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
            rule_set, super_upgrade, opened, final_stone, created_at, updated_at
          FROM mission_chests;
          DROP TABLE mission_chests;
          ALTER TABLE mission_chests_v16 RENAME TO mission_chests;
          CREATE INDEX idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
        `);
        const collectionCraftColumns = await db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(collection_crafts)",
        );
        if (
          !collectionCraftColumns.some((column) => column.name === "piece_cost")
        ) {
          await db.execAsync(`
            ALTER TABLE collection_crafts
              ADD COLUMN piece_cost INTEGER NOT NULL DEFAULT 20
              CHECK (piece_cost IN (20, 100));
          `);
        }
        await db.execAsync("PRAGMA user_version = 16;");
      });
    }
    if ((version?.user_version ?? 0) < 17) {
      await db.withTransactionAsync(async () => {
        const reviewSessionColumns = await db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(review_session_results)",
        );
        if (
          !reviewSessionColumns.some(
            (column) => column.name === "active_duration_ms",
          )
        ) {
          await db.execAsync(`
            ALTER TABLE review_session_results
              ADD COLUMN active_duration_ms INTEGER NOT NULL DEFAULT 0
              CHECK (active_duration_ms >= 0);
          `);
        }
        await db.execAsync("PRAGMA user_version = 17;");
      });
    }
    if ((version?.user_version ?? 0) < 18) {
      await db.withTransactionAsync(async () => {
        const reviewSessionColumns = await db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(review_session_results)",
        );
        if (
          !reviewSessionColumns.some((column) => column.name === "max_combo")
        ) {
          await db.execAsync(`
            ALTER TABLE review_session_results
              ADD COLUMN max_combo INTEGER NOT NULL DEFAULT 0
              CHECK (max_combo >= 0);
          `);
        }
        await db.execAsync("PRAGMA user_version = 18;");
      });
    }
    if ((version?.user_version ?? 0) < 19) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS review_combo_rewards (
            session_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            review_day TEXT NOT NULL,
            combo_index INTEGER NOT NULL CHECK (combo_index > 0),
            combo_length INTEGER NOT NULL CHECK (combo_length > 0),
            created_at TEXT NOT NULL,
            PRIMARY KEY (session_id, combo_index)
          );
          CREATE INDEX IF NOT EXISTS idx_review_combo_rewards_day
            ON review_combo_rewards(review_day);
          PRAGMA user_version = 19;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 20) {
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<
          Omit<MissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
            opened: number;
            superUpgrade: number;
            ruleSet: number;
          }
        >(
          `SELECT chest_id AS chestId, mission_day AS day, mission_id AS missionId,
            base_stone AS baseStone, upgrade_attempts AS upgradeAttempts, rarity,
            rule_set AS ruleSet, super_upgrade AS superUpgrade,
            opened, final_stone AS finalStone, created_at AS createdAt, updated_at AS updatedAt
           FROM mission_chests WHERE opened = 1 AND rule_set >= 2`,
        );
        const updatedAt = new Date().toISOString();
        let reopenedCount = 0;
        for (const row of rows) {
          const chest = missionChestFromRow(row);
          const reopened = reopenPrematureMissionChest(chest, updatedAt);
          if (reopened === chest) continue;
          const result = await db.runAsync(
            `UPDATE mission_chests SET opened = 0, final_stone = NULL, updated_at = ?
             WHERE chest_id = ? AND opened = 1`,
            reopened.updatedAt,
            reopened.chestId,
          );
          reopenedCount += result.changes;
        }
        if (reopenedCount > 0) await markSyncDirty(db);
        await db.execAsync("PRAGMA user_version = 20;");
      });
    }
    if ((version?.user_version ?? 0) < 21) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS collection_piece_spends (
            spend_id TEXT PRIMARY KEY NOT NULL,
            rarity TEXT NOT NULL,
            piece_cost INTEGER NOT NULL CHECK (piece_cost IN (20, 100)),
            spent_at TEXT NOT NULL
          );
        `);
        await db.runAsync(`
          INSERT OR IGNORE INTO collection_piece_spends
            (spend_id, rarity, piece_cost, spent_at)
          SELECT 'legacy:' || craft_id, rarity, piece_cost, crafted_at
          FROM collection_crafts
        `);
        await db.runAsync("DELETE FROM collection_crafts");
        // Publish the intentional collection cleanup to account sync, even
        // when this device had no old craft rows but the cloud still does.
        await markSyncDirty(db);
        await db.execAsync("PRAGMA user_version = 21;");
      });
    }
    if ((version?.user_version ?? 0) < 22) {
      await db.withTransactionAsync(async () => {
        const pendingChests = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM mission_chests WHERE opened = 0",
        );
        await db.execAsync(`
          CREATE TABLE mission_chests_v22 (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 4),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            rule_set INTEGER NOT NULL DEFAULT 1 CHECK (rule_set IN (1, 2, 3, 4, 5)),
            super_upgrade INTEGER NOT NULL DEFAULT 0 CHECK (super_upgrade IN (0, 1)),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 5050)
            )
          );
          INSERT INTO mission_chests_v22
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
          SELECT chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
            CASE WHEN opened = 0 AND rule_set = 4 THEN 5 ELSE rule_set END,
            super_upgrade, opened, final_stone, created_at, updated_at
          FROM mission_chests;
          DROP TABLE mission_chests;
          ALTER TABLE mission_chests_v22 RENAME TO mission_chests;
          CREATE INDEX idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
          PRAGMA user_version = 22;
        `);
        if ((pendingChests?.count ?? 0) > 0) await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 23) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE collection_crafts_v23 (
            craft_id TEXT PRIMARY KEY NOT NULL,
            rarity TEXT NOT NULL
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            craft_index INTEGER NOT NULL CHECK (craft_index >= 1),
            artwork_id TEXT NOT NULL,
            crafted_at TEXT NOT NULL,
            piece_cost INTEGER NOT NULL DEFAULT 20
              CHECK (piece_cost IN (0, 20, 100)),
            UNIQUE (rarity, craft_index)
          );
          INSERT INTO collection_crafts_v23
            (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
          SELECT craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost
          FROM collection_crafts;
          DROP TABLE collection_crafts;
          ALTER TABLE collection_crafts_v23 RENAME TO collection_crafts;
          INSERT OR IGNORE INTO collection_piece_spends
            (spend_id, rarity, piece_cost, spent_at)
          SELECT 'legacy:' || craft_id, rarity, piece_cost, crafted_at
          FROM collection_crafts
          WHERE craft_id NOT LIKE 'cycle2-%';
          DELETE FROM collection_crafts WHERE craft_id NOT LIKE 'cycle2-%';
          PRAGMA user_version = 23;
        `);
        await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 24) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE collection_crafts_v24 (
            craft_id TEXT PRIMARY KEY NOT NULL,
            rarity TEXT NOT NULL
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            craft_index INTEGER NOT NULL CHECK (craft_index >= 1),
            artwork_id TEXT NOT NULL,
            crafted_at TEXT NOT NULL,
            piece_cost INTEGER NOT NULL DEFAULT 20
              CHECK (piece_cost IN (-20, 0, 20, 100)),
            UNIQUE (rarity, craft_index)
          );
          INSERT INTO collection_crafts_v24
            (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
          SELECT craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost
          FROM collection_crafts;
          DROP TABLE collection_crafts;
          ALTER TABLE collection_crafts_v24 RENAME TO collection_crafts;
          PRAGMA user_version = 24;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 25) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS mission_shop_purchases (
            purchase_id TEXT PRIMARY KEY NOT NULL,
            shop_day TEXT NOT NULL,
            slot INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 2),
            rarity TEXT NOT NULL CHECK (rarity IN ('rare', 'epic', 'legendary')),
            stone_cost INTEGER NOT NULL CHECK (stone_cost >= 0),
            discount_percent INTEGER NOT NULL
              CHECK (discount_percent BETWEEN 0 AND 60),
            purchased_at TEXT NOT NULL,
            UNIQUE (shop_day, slot),
            UNIQUE (shop_day, rarity)
          );
          CREATE INDEX IF NOT EXISTS idx_mission_shop_purchases_day
            ON mission_shop_purchases(shop_day);
          PRAGMA user_version = 25;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 26) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS stone_investments (
            investment_id TEXT PRIMARY KEY NOT NULL,
            plan TEXT NOT NULL CHECK (plan IN ('safe', 'balanced', 'risky')),
            principal INTEGER NOT NULL CHECK (principal BETWEEN 1 AND 900000000),
            duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14)),
            start_day TEXT NOT NULL,
            end_day TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('active', 'succeeded', 'failed')),
            settlement_amount INTEGER,
            created_at TEXT NOT NULL,
            settled_at TEXT,
            CHECK (
              (status = 'active' AND settlement_amount IS NULL AND settled_at IS NULL) OR
              (status != 'active' AND settlement_amount IS NOT NULL AND settled_at IS NOT NULL)
            )
          );
          CREATE INDEX IF NOT EXISTS idx_stone_investments_status
            ON stone_investments(status, start_day, end_day);
          CREATE TABLE IF NOT EXISTS investment_study_days (
            day TEXT PRIMARY KEY NOT NULL,
            reviewed INTEGER NOT NULL DEFAULT 0 CHECK (reviewed IN (0, 1)),
            studied_course INTEGER NOT NULL DEFAULT 0 CHECK (studied_course IN (0, 1)),
            updated_at TEXT NOT NULL,
            CHECK (reviewed = 1 OR studied_course = 1)
          );
          PRAGMA user_version = 26;
        `);
        await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 27) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE collection_crafts_v27 (
            craft_id TEXT PRIMARY KEY NOT NULL,
            rarity TEXT NOT NULL
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            craft_index INTEGER NOT NULL CHECK (craft_index >= 1),
            artwork_id TEXT NOT NULL,
            crafted_at TEXT NOT NULL,
            piece_cost INTEGER NOT NULL DEFAULT 20
              CHECK (piece_cost IN (-20, 0, 10, 20, 100)),
            UNIQUE (rarity, craft_index)
          );
          INSERT INTO collection_crafts_v27
            (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
          SELECT craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost
          FROM collection_crafts;
          DROP TABLE collection_crafts;
          ALTER TABLE collection_crafts_v27 RENAME TO collection_crafts;
          PRAGMA user_version = 27;
        `);
      });
    }
    if ((version?.user_version ?? 0) < 28) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE mission_shop_purchases_v28 (
            purchase_id TEXT PRIMARY KEY NOT NULL,
            shop_day TEXT NOT NULL,
            slot INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 2),
            rarity TEXT NOT NULL CHECK (rarity IN (
              'rare', 'epic', 'legendary',
              'low_insurance', 'collateral_asset',
              'low_capital_invite', 'high_capital_invite'
            )),
            stone_cost INTEGER NOT NULL CHECK (stone_cost >= 0),
            discount_percent INTEGER NOT NULL
              CHECK (discount_percent BETWEEN 0 AND 60),
            purchased_at TEXT NOT NULL
          );
          INSERT INTO mission_shop_purchases_v28
            (purchase_id, shop_day, slot, rarity, stone_cost,
              discount_percent, purchased_at)
          SELECT purchase_id, shop_day, slot, rarity, stone_cost,
            discount_percent, purchased_at
          FROM mission_shop_purchases;
          DROP TABLE mission_shop_purchases;
          ALTER TABLE mission_shop_purchases_v28 RENAME TO mission_shop_purchases;
          CREATE INDEX idx_mission_shop_purchases_day_slot
            ON mission_shop_purchases(shop_day, slot);
          PRAGMA user_version = 28;
        `);
        const investmentColumns = new Set(
          (
            await db.getAllAsync<{ name: string }>(
              "PRAGMA table_info(stone_investments)",
            )
          ).map((column) => column.name),
        );
        if (!investmentColumns.has("low_insurance_used")) {
          await db.execAsync(`
            ALTER TABLE stone_investments
              ADD COLUMN low_insurance_used INTEGER NOT NULL DEFAULT 0
                CHECK (low_insurance_used IN (0, 1))
          `);
        }
        if (!investmentColumns.has("capital_invite")) {
          await db.execAsync(`
            ALTER TABLE stone_investments
              ADD COLUMN capital_invite TEXT
                CHECK (capital_invite IS NULL OR capital_invite IN ('low', 'high'))
          `);
        }
        if (!investmentColumns.has("collateral_used")) {
          await db.execAsync(`
            ALTER TABLE stone_investments
              ADD COLUMN collateral_used INTEGER NOT NULL DEFAULT 0
                CHECK (collateral_used IN (0, 1))
          `);
        }
        await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 29) {
      await db.withTransactionAsync(async () => {
        const investmentColumns = new Set(
          (
            await db.getAllAsync<{ name: string }>(
              "PRAGMA table_info(stone_investments)",
            )
          ).map((column) => column.name),
        );
        if (!investmentColumns.has("force_majeure_hit")) {
          await db.execAsync(`
            ALTER TABLE stone_investments
              ADD COLUMN force_majeure_hit INTEGER
                CHECK (force_majeure_hit IN (0, 1))
          `);
        }
        await db.execAsync("PRAGMA user_version = 29");
        await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 30) {
      await db.withTransactionAsync(async () => {
        const pendingChests = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM mission_chests WHERE opened = 0",
        );
        await db.execAsync(`
          CREATE TABLE mission_chests_v30 (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 4),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            rule_set INTEGER NOT NULL DEFAULT 1 CHECK (rule_set IN (1, 2, 3, 4, 5, 6)),
            super_upgrade INTEGER NOT NULL DEFAULT 0 CHECK (super_upgrade IN (0, 1)),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 5050)
            )
          );
          INSERT INTO mission_chests_v30
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
          SELECT chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
            CASE WHEN opened = 0 THEN 6 ELSE rule_set END,
            super_upgrade, opened, final_stone, created_at, updated_at
          FROM mission_chests;
          DROP TABLE mission_chests;
          ALTER TABLE mission_chests_v30 RENAME TO mission_chests;
          CREATE INDEX idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
          PRAGMA user_version = 30;
        `);
        if ((pendingChests?.count ?? 0) > 0) await markSyncDirty(db);
      });
    }
    if ((version?.user_version ?? 0) < 31) {
      await db.withTransactionAsync(async () => {
        const pendingChests = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM mission_chests WHERE opened = 0",
        );
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS corvi_fragment_awards (
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            awarded_at TEXT NOT NULL,
            PRIMARY KEY (mission_day, mission_id)
          );
          CREATE TABLE IF NOT EXISTS corvi_chest_rewards (
            chest_id TEXT PRIMARY KEY NOT NULL,
            chest_index INTEGER NOT NULL UNIQUE CHECK (chest_index >= 1),
            stone INTEGER NOT NULL CHECK (stone BETWEEN 1 AND 10000),
            created_at TEXT NOT NULL
          );
          CREATE TABLE mission_chests_v31 (
            chest_id TEXT PRIMARY KEY NOT NULL,
            mission_day TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            base_stone INTEGER NOT NULL CHECK (base_stone BETWEEN 1 AND 20),
            upgrade_attempts INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_attempts BETWEEN 0 AND 4),
            rarity TEXT NOT NULL DEFAULT 'common'
              CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            rule_set INTEGER NOT NULL DEFAULT 1 CHECK (rule_set IN (1, 2, 3, 4, 5, 6, 7)),
            super_upgrade INTEGER NOT NULL DEFAULT 0 CHECK (super_upgrade IN (0, 1)),
            opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
            final_stone INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (mission_day, mission_id),
            CHECK (
              (opened = 0 AND final_stone IS NULL) OR
              (opened = 1 AND final_stone BETWEEN 1 AND 5050)
            )
          );
          INSERT INTO mission_chests_v31
            (chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
              rule_set, super_upgrade, opened, final_stone, created_at, updated_at)
          SELECT chest_id, mission_day, mission_id, base_stone, upgrade_attempts, rarity,
            rule_set, super_upgrade, opened, final_stone, created_at, updated_at
          FROM mission_chests;
          DROP TABLE mission_chests;
          ALTER TABLE mission_chests_v31 RENAME TO mission_chests;
          CREATE INDEX idx_mission_chests_opened
            ON mission_chests(opened, mission_day);
          PRAGMA user_version = 31;
        `);
        await db.runAsync(
          `INSERT OR IGNORE INTO sync_state (key, value)
           VALUES ('corvi_fragment_start_day', ?)`,
          localDay(new Date()),
        );
        if ((pendingChests?.count ?? 0) > 0) await markSyncDirty(db);
      });
    }
    await repairKnownExtractionExample(db);
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

function database(): Promise<SQLiteDatabase> {
  if (!connection) {
    connection = initialize().catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}

function localDayBounds(day: string): [string, string] {
  const start = new Date(`${day}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || localDay(start) !== day) {
    throw new Error("Ngày nhiệm vụ không hợp lệ.");
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

async function readDailyMissionActivity(
  db: SQLiteDatabase,
  day: string,
): Promise<DailyMissionActivity> {
  const [dayStart, nextDayStart] = localDayBounds(day);
  const [reviewed, added, reviewSessions] = await Promise.all([
    db.getFirstAsync<{ count: number | null }>(
      "SELECT SUM(reviewed_count) AS count FROM device_review_day_statistics WHERE review_day = ?",
      day,
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM words WHERE created_at >= ? AND created_at < ?",
      dayStart,
      nextDayStart,
    ),
    db.getAllAsync<{
      grade: DailyReviewGrade;
      reviewedCount: number;
      activeDurationMs: number;
      maxCombo: number;
    }>(
      `SELECT grade, reviewed_count AS reviewedCount,
        active_duration_ms AS activeDurationMs, max_combo AS maxCombo
       FROM review_session_results WHERE review_day = ?`,
      day,
    ),
  ]);
  return {
    reviewedCount: reviewed?.count ?? 0,
    addedWordCount: added?.count ?? 0,
    reviewSessions,
    reviewDurationMs: reviewSessions.reduce(
      (total, session) => total + session.activeDurationMs,
      0,
    ),
  };
}

async function grantDailyMissionChests(
  db: SQLiteDatabase,
  day: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  let changed = await migrateUntouchedMissionChests(db, now);
  const [activity, awards, chests] = await Promise.all([
    readDailyMissionActivity(db, day),
    db.getAllAsync<DailyMissionAward>(
      "SELECT mission_day AS missionDay, mission_id AS missionId, stone, completed_at AS completedAt FROM daily_mission_awards WHERE mission_day = ?",
      day,
    ),
    db.getAllAsync<{ missionId: string; baseStone: number; createdAt: string }>(
      "SELECT mission_id AS missionId, base_stone AS baseStone, created_at AS createdAt FROM mission_chests WHERE mission_day = ?",
      day,
    ),
  ]);
  const missionRewards = [
    ...awards,
    ...chests.map((chest) => ({
      missionDay: day,
      missionId: chest.missionId,
      stone: chest.baseStone,
      completedAt: chest.createdAt,
    })),
  ];
  const corviStartDay = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_state WHERE key = 'corvi_fragment_start_day'",
  );
  for (const mission of evaluateDailyMissions(day, activity, missionRewards)) {
    if (!missionAwardIsEarned(mission)) continue;
    const chestId = `mission-${day}-${mission.id}`;
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO mission_chests
        (chest_id, mission_day, mission_id, base_stone, rarity, rule_set, super_upgrade,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 7, ?, ?, ?)`,
      chestId,
      day,
      mission.id,
      mission.stoneReward,
      startingRarityForMission(mission.id),
      hasSuperUpgradeChance(chestId) ? 1 : 0,
      now,
      now,
    );
    changed ||= result.changes === 1;
    if (result.changes === 1 && corviStartDay?.value && day >= corviStartDay.value) {
      const fragmentAward = await db.runAsync(
        `INSERT OR IGNORE INTO corvi_fragment_awards
          (mission_day, mission_id, awarded_at)
         VALUES (?, ?, ?)`,
        day,
        mission.id,
        now,
      );
      changed ||= fragmentAward.changes === 1;
    }
  }
  changed ||= await grantCorviChestRewards(db, now);
  return changed;
}

async function grantCorviChestRewards(
  db: SQLiteDatabase,
  now: string,
): Promise<boolean> {
  const fragmentCount = await db.getFirstAsync<{ count: number | null }>(
    "SELECT COUNT(*) AS count FROM corvi_fragment_awards",
  );
  const earnedChestCount = Math.floor(
    (fragmentCount?.count ?? 0) / CORVI_CHEST_FRAGMENT_COST,
  );
  let changed = false;
  for (let chestIndex = 1; chestIndex <= earnedChestCount; chestIndex += 1) {
    const chestId = `corvi-progress-${chestIndex}`;
    const reward = await db.runAsync(
      `INSERT OR IGNORE INTO corvi_chest_rewards
        (chest_id, chest_index, stone, created_at)
       VALUES (?, ?, ?, ?)`,
      chestId,
      chestIndex,
      CORVI_CHEST_STONE_REWARD,
      now,
    );
    const statueCraft = await db.getFirstAsync<{ craftId: string }>(
      "SELECT craft_id AS craftId FROM collection_crafts WHERE craft_id = ?",
      `${COLLECTION_CYCLE_PREFIX}corvi-${chestId}`,
    );
    if (reward.changes === 1 || !statueCraft) {
      await awardCorviStatue(db, chestId);
      changed = true;
    }
    changed ||= reward.changes === 1;
  }
  return changed;
}

async function readCorviChestProgress(
  db: SQLiteDatabase,
): Promise<
  Pick<
    DailyMissionOverview,
    "corviFragments" | "corviChestsOpened" | "corviLatestStoneReward"
  >
> {
  const [fragmentCount, chestCount, latestReward] = await Promise.all([
    db.getFirstAsync<{ count: number | null }>(
      "SELECT COUNT(*) AS count FROM corvi_fragment_awards",
    ),
    db.getFirstAsync<{ count: number | null }>(
      "SELECT COUNT(*) AS count FROM corvi_chest_rewards",
    ),
    db.getFirstAsync<{ stone: number }>(
      "SELECT stone FROM corvi_chest_rewards ORDER BY chest_index DESC LIMIT 1",
    ),
  ]);
  const totalFragments = fragmentCount?.count ?? 0;
  const openedCount = chestCount?.count ?? 0;
  return {
    corviFragments: Math.max(
      0,
      totalFragments - openedCount * CORVI_CHEST_FRAGMENT_COST,
    ),
    corviChestsOpened: openedCount,
    corviLatestStoneReward: latestReward?.stone ?? null,
  };
}

async function migrateUntouchedMissionChests(
  db: SQLiteDatabase,
  now: string,
): Promise<boolean> {
  const untouched = await db.getAllAsync<{
    chestId: string;
    missionId: string;
    rarity: ChestRarity;
    ruleSet: number;
    superUpgrade: number;
  }>(
    `SELECT chest_id AS chestId, mission_id AS missionId, rarity,
       rule_set AS ruleSet, super_upgrade AS superUpgrade
     FROM mission_chests
      WHERE opened = 0
        AND (rule_set = 5 OR (upgrade_attempts = 0 AND rule_set < 5))`,
  );
  let changed = false;
  for (const chest of untouched) {
    const isOldUntouchedChest = chest.ruleSet < 5;
    const update = await db.runAsync(
      `UPDATE mission_chests
        SET rarity = ?, rule_set = 6, super_upgrade = ?, updated_at = ?
        WHERE chest_id = ? AND opened = 0
          AND (rule_set = 5 OR (upgrade_attempts = 0 AND rule_set < 5))`,
      isOldUntouchedChest
        ? startingRarityForMission(chest.missionId)
        : chest.rarity,
      isOldUntouchedChest
        ? hasSuperUpgradeChance(chest.chestId)
          ? 1
          : 0
        : chest.superUpgrade,
      now,
      chest.chestId,
    );
    changed ||= update.changes === 1;
  }
  return changed;
}

export function getDailyMissionOverview(
  day = localDay(new Date()),
): Promise<DailyMissionOverview> {
  return serialize(async () => {
    const db = await database();
    let chestsChanged = false;
    let overview: DailyMissionOverview | undefined;
    await db.withTransactionAsync(async () => {
      chestsChanged = await grantDailyMissionChests(db, day);
      if (chestsChanged) await markSyncDirty(db);
      const [
        activity,
        legacyAwards,
        chestAwards,
        chests,
        corviProgress,
      ] = await Promise.all([
        readDailyMissionActivity(db, day),
        db.getAllAsync<DailyMissionAward>(
          "SELECT mission_day AS missionDay, mission_id AS missionId, stone, completed_at AS completedAt FROM daily_mission_awards WHERE mission_day = ?",
          day,
        ),
        db.getAllAsync<DailyMissionAward>(
          `SELECT mission_day AS missionDay, mission_id AS missionId, base_stone AS stone,
            created_at AS completedAt FROM mission_chests WHERE mission_day = ?`,
          day,
        ),
        readUnopenedMissionChests(db),
        readCorviChestProgress(db),
      ]);
      const missionRewards = [...legacyAwards, ...chestAwards];
      overview = {
        day,
        stoneBalance: await readStoneBalance(db),
        missions: evaluateDailyMissions(day, activity, missionRewards),
        chests,
        ...corviProgress,
      };
    });
    if (chestsChanged) notifySyncListeners();
    return overview!;
  });
}

export function getMissionShopOverview(
  day = localDay(new Date()),
): Promise<MissionShopOverview> {
  return serialize(async () => {
    const db = await database();
    const [stoneBalance, collection, purchases, inventory] = await Promise.all([
      readStoneBalance(db),
      readMissionCollectionBalance(db),
      db.getAllAsync<Pick<MissionShopPurchase, "purchaseId" | "slot" | "rarity">>(
        `SELECT purchase_id AS purchaseId, slot, rarity
         FROM mission_shop_purchases WHERE shop_day = ?
         ORDER BY slot, purchase_id`,
        day,
      ),
      readMissionShopInventory(db),
    ]);
    return {
      day,
      stoneBalance,
      fragments: collection.fragments,
      inventory,
      offers: missionShopOffersForDay(day).map((offer) => ({
        ...offer,
        purchased: purchases.filter(
          (purchase) =>
            purchase.slot === offer.slot &&
            purchase.rarity === offer.productId,
        ).length,
        remainingStock:
          offer.stock -
          purchases.filter(
            (purchase) =>
              purchase.slot === offer.slot &&
              purchase.rarity === offer.productId,
          ).length,
      })),
    };
  });
}

export function purchaseMissionShopOffer(
  slot: number,
  day = localDay(new Date()),
): Promise<MissionShopPurchase> {
  return serialize(async () => {
    const offer = missionShopOffersForDay(day).find(
      (candidate) => candidate.slot === slot,
    );
    if (!offer) throw new Error("Không tìm thấy món này trong cửa hàng.");

    const db = await database();
    let purchase: MissionShopPurchase | undefined;
    await db.withTransactionAsync(async () => {
      const existing = await db.getAllAsync<{ purchaseId: string }>(
        `SELECT purchase_id AS purchaseId FROM mission_shop_purchases
         WHERE shop_day = ? AND slot = ? AND rarity = ?`,
        day,
        slot,
        offer.productId,
      );
      if (existing.length >= offer.stock) {
        throw new Error("Món này đã hết hàng hôm nay.");
      }

      const stoneBalance = await readStoneBalance(db);
      if (stoneBalance < offer.price) {
        throw new Error("Không đủ Stone để mua món này.");
      }

      const purchaseIndex = existing.length + 1;
      const next: MissionShopPurchase = {
        purchaseId: missionShopPurchaseId(
          day,
          offer.slot,
          purchaseIndex,
          Crypto.randomUUID(),
        ),
        day,
        slot: offer.slot,
        rarity: offer.productId,
        stoneCost: offer.price,
        discountPercent: offer.discountPercent,
        purchasedAt: new Date().toISOString(),
      };
      if (!isValidMissionShopPurchase(next)) {
        throw new Error("Ưu đãi cửa hàng không hợp lệ.");
      }
      const result = await db.runAsync(
        `INSERT INTO mission_shop_purchases
          (purchase_id, shop_day, slot, rarity, stone_cost,
            discount_percent, purchased_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        next.purchaseId,
        next.day,
        next.slot,
        next.rarity,
        next.stoneCost,
        next.discountPercent,
        next.purchasedAt,
      );
      if (result.changes !== 1) {
        throw new Error("Không thể ghi nhận giao dịch. Hãy thử lại.");
      }
      await markSyncDirty(db);
      purchase = next;
    });
    notifySyncListeners();
    return purchase!;
  });
}

async function readMissionShopInventory(
  db: SQLiteDatabase,
): Promise<Record<MissionShopProductId, number>> {
  const [purchases, investments] = await Promise.all([
    db.getAllAsync<{ rarity: string; count: number }>(
      `SELECT rarity, COUNT(*) AS count FROM mission_shop_purchases
       GROUP BY rarity`,
    ),
    db.getAllAsync<Pick<StoneInvestment,
      "lowInsuranceUsed" | "capitalInvite" | "collateralUsed"
    >>(`
      SELECT low_insurance_used AS lowInsuranceUsed,
        capital_invite AS capitalInvite,
        collateral_used AS collateralUsed
      FROM stone_investments
    `),
  ]);
  const inventory = Object.fromEntries(
    Object.keys(MISSION_SHOP_PRODUCTS).map((productId) => [productId, 0]),
  ) as Record<MissionShopProductId, number>;
  for (const purchase of purchases) {
    if (purchase.rarity in inventory) {
      inventory[purchase.rarity as MissionShopProductId] += purchase.count;
    }
  }
  for (const investment of investments) {
    if (investment.lowInsuranceUsed) inventory.low_insurance -= 1;
    if (investment.capitalInvite === "low") {
      inventory.low_capital_invite -= 1;
    } else if (investment.capitalInvite === "high") {
      inventory.high_capital_invite -= 1;
    }
    if (investment.collateralUsed) inventory.collateral_asset -= 1;
  }
  for (const productId of Object.keys(inventory) as MissionShopProductId[]) {
    inventory[productId] = Math.max(0, inventory[productId]);
  }
  return inventory;
}

function normalizeStoneInvestmentRow(
  investment: StoneInvestment,
): StoneInvestment {
  return {
    ...investment,
    lowInsuranceUsed: Boolean(investment.lowInsuranceUsed),
    collateralUsed: Boolean(investment.collateralUsed),
    forceMajeureHit:
      investment.forceMajeureHit === null
        ? null
        : Boolean(investment.forceMajeureHit),
  };
}

export function getStoneInvestmentOverview(): Promise<StoneInvestmentOverview> {
  return serialize(async () => {
    const db = await database();
    const today = localDay(new Date());
    let changed = false;
    await db.withTransactionAsync(async () => {
      changed = await settleActiveStoneInvestments(db, today);
      if (changed) await markSyncDirty(db);
    });
    if (changed) notifySyncListeners();
    const [stoneBalance, investments, rawStudyDays] = await Promise.all([
      readStoneBalance(db),
      db.getAllAsync<StoneInvestment>(
        `SELECT investment_id AS investmentId, plan, principal,
          duration_days AS durationDays, start_day AS startDay, end_day AS endDay,
          status, settlement_amount AS settlementAmount,
          low_insurance_used AS lowInsuranceUsed, capital_invite AS capitalInvite,
          collateral_used AS collateralUsed,
          force_majeure_hit AS forceMajeureHit, created_at AS createdAt,
          settled_at AS settledAt
         FROM stone_investments ORDER BY created_at DESC`,
      ).then((rows) => rows.map(normalizeStoneInvestmentRow)),
      db.getAllAsync<{
        day: string;
        reviewed: number;
        studiedCourse: number;
        updatedAt: string;
      }>(
        `SELECT day, reviewed, studied_course AS studiedCourse,
          updated_at AS updatedAt
         FROM investment_study_days`,
      ),
    ]);
    const studyDays = rawStudyDays.map((day) => ({
      ...day,
      reviewed: Boolean(day.reviewed),
      studiedCourse: Boolean(day.studiedCourse),
    }));
    const inventory = await readMissionShopInventory(db);
    return { today, stoneBalance, inventory, investments, studyDays };
  });
}

export function createStoneInvestment(
  plan: StoneInvestmentPlan,
  principal: number,
  durationDays: StoneInvestmentDuration,
  options: {
    lowInsuranceUsed?: boolean;
    capitalInvite?: StoneInvestmentCapitalInvite;
  } = {},
): Promise<StoneInvestment> {
  return serialize(async () => {
    if (
      !["safe", "balanced", "risky"].includes(plan) ||
      !Number.isSafeInteger(principal) ||
      principal <= 0 ||
      principal > MAX_STONE_INVESTMENT_PRINCIPAL ||
      (durationDays !== 7 && durationDays !== 14)
    ) {
      throw new Error("Thông tin Thương Vụ không hợp lệ.");
    }
    const db = await database();
    const now = new Date();
    const today = localDay(now);
    const lowInsuranceUsed = options.lowInsuranceUsed === true;
    const capitalInvite = options.capitalInvite ?? null;
    if (lowInsuranceUsed && plan !== "risky") {
      throw new Error("Bảo Hiểm cấp thấp chỉ áp dụng cho gói rủi ro.");
    }
    if (
      capitalInvite !== null &&
      capitalInvite !== "low" &&
      capitalInvite !== "high"
    ) {
      throw new Error("Thư góp vốn không hợp lệ.");
    }
    const investmentId = `investment:${Crypto.randomUUID()}`;
    const investment: StoneInvestment = {
      investmentId,
      plan,
      principal,
      durationDays,
      startDay: today,
      endDay: investmentEndDay(today, durationDays),
      status: "active",
      settlementAmount: null,
      lowInsuranceUsed,
      capitalInvite,
      collateralUsed: false,
      forceMajeureHit: forceMajeureOccurs(investmentId, plan),
      createdAt: now.toISOString(),
      settledAt: null,
    };
    if (!isValidStoneInvestment(investment)) {
      throw new Error("Thông tin Thương Vụ không hợp lệ.");
    }

    await db.withTransactionAsync(async () => {
      await settleActiveStoneInvestments(db, today);
      await seedCurrentInvestmentStudyDay(db, today);
      const balance = await readStoneBalance(db);
      if (balance < principal) {
        throw new Error("Không đủ Stone để bắt đầu khoản đầu tư.");
      }
      const inventory = await readMissionShopInventory(db);
      if (lowInsuranceUsed && inventory.low_insurance < 1) {
        throw new Error("Bạn không còn Bảo Hiểm cấp thấp.");
      }
      if (capitalInvite === "low" && inventory.low_capital_invite < 1) {
        throw new Error("Bạn không còn Thư mời Góp Vốn Thấp.");
      }
      if (capitalInvite === "high" && inventory.high_capital_invite < 1) {
        throw new Error("Bạn không còn Thư mời Góp Vốn Cao.");
      }
      await db.runAsync(
        `INSERT INTO stone_investments
          (investment_id, plan, principal, duration_days, start_day, end_day,
            status, settlement_amount, low_insurance_used, capital_invite,
            collateral_used, force_majeure_hit, created_at, settled_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?, 0, ?, ?, NULL)`,
        investment.investmentId,
        investment.plan,
        investment.principal,
        investment.durationDays,
        investment.startDay,
        investment.endDay,
        investment.lowInsuranceUsed ? 1 : 0,
        investment.capitalInvite,
        investment.forceMajeureHit ? 1 : 0,
        investment.createdAt,
      );
      await markSyncDirty(db);
    });
    notifySyncListeners();
    return investment;
  });
}

export function useStoneInvestmentCollateral(
  investmentId: string,
): Promise<StoneInvestment> {
  return serialize(async () => {
    const db = await database();
    let updated: StoneInvestment | undefined;
    await db.withTransactionAsync(async () => {
      await settleActiveStoneInvestments(db, localDay(new Date()));
      const row = await db.getFirstAsync<StoneInvestment>(
        `SELECT investment_id AS investmentId, plan, principal,
          duration_days AS durationDays, start_day AS startDay, end_day AS endDay,
          status, settlement_amount AS settlementAmount,
          low_insurance_used AS lowInsuranceUsed, capital_invite AS capitalInvite,
          collateral_used AS collateralUsed,
          force_majeure_hit AS forceMajeureHit, created_at AS createdAt,
          settled_at AS settledAt
         FROM stone_investments WHERE investment_id = ?`,
        investmentId,
      );
      const investment = row ? normalizeStoneInvestmentRow(row) : null;
      if (
        !investment ||
        investment.status !== "failed" ||
        investment.plan !== "risky" ||
        (investment.lowInsuranceUsed && !investment.forceMajeureHit) ||
        investment.collateralUsed
      ) {
        throw new Error("Khoản đầu tư này không thể dùng tài sản thế chấp.");
      }
      const inventory = await readMissionShopInventory(db);
      if (inventory.collateral_asset < 1) {
        throw new Error("Bạn không còn Tài Sản Thế Chấp.");
      }
      const result = await db.runAsync(
        `UPDATE stone_investments
         SET settlement_amount = principal, collateral_used = 1, settled_at = ?
         WHERE investment_id = ? AND status = 'failed'
           AND collateral_used = 0`,
        new Date().toISOString(),
        investmentId,
      );
      if (result.changes !== 1) {
        throw new Error("Không thể dùng Tài Sản Thế Chấp cho khoản này.");
      }
      updated = {
        ...investment,
        settlementAmount: investment.principal,
        collateralUsed: true,
        settledAt: new Date().toISOString(),
      };
      await markSyncDirty(db);
    });
    notifySyncListeners();
    return updated!;
  });
}

export function recordStoneInvestmentStudyDay(
  source: "review" | "course",
): Promise<void> {
  return serialize(async () => {
    const db = await database();
    const today = localDay(new Date());
    let changed = false;
    await db.withTransactionAsync(async () => {
      const settled = await settleActiveStoneInvestments(db, today);
      const recorded = await markInvestmentStudyDay(db, today, source);
      changed = settled || Boolean(recorded);
      if (changed) await markSyncDirty(db);
    });
    if (changed) notifySyncListeners();
  });
}

async function settleActiveStoneInvestments(
  db: SQLiteDatabase,
  today: string,
): Promise<boolean> {
  const rows = await db.getAllAsync<StoneInvestment>(
    `SELECT investment_id AS investmentId, plan, principal,
      duration_days AS durationDays, start_day AS startDay, end_day AS endDay,
      status, settlement_amount AS settlementAmount,
      low_insurance_used AS lowInsuranceUsed, capital_invite AS capitalInvite,
      collateral_used AS collateralUsed,
      force_majeure_hit AS forceMajeureHit, created_at AS createdAt,
      settled_at AS settledAt
     FROM stone_investments WHERE status = 'active'`,
  );
  const active = rows.map(normalizeStoneInvestmentRow);
  if (!active.length) return false;
  const studyRows = await db.getAllAsync<{ day: string }>(
    "SELECT day FROM investment_study_days",
  );
  const studyDays = new Set(studyRows.map((row) => row.day));
  let changed = false;
  for (const investment of active) {
    const outcome = evaluateStoneInvestment(investment, studyDays, today);
    if (outcome.status === "active" || outcome.settlementAmount === null) {
      continue;
    }
    const result = await db.runAsync(
      `UPDATE stone_investments
       SET status = ?, settlement_amount = ?, settled_at = ?
       WHERE investment_id = ? AND status = 'active'`,
      outcome.status,
      outcome.settlementAmount,
      new Date().toISOString(),
      investment.investmentId,
    );
    changed ||= result.changes === 1;
  }
  return changed;
}

async function markInvestmentStudyDay(
  db: SQLiteDatabase,
  day: string,
  source: "review" | "course",
): Promise<boolean> {
  const current = await db.getFirstAsync<{
    reviewed: number;
    studiedCourse: number;
  }>(
    `SELECT reviewed, studied_course AS studiedCourse
     FROM investment_study_days WHERE day = ?`,
    day,
  );
  if (
    (source === "review" && current?.reviewed === 1) ||
    (source === "course" && current?.studiedCourse === 1)
  ) {
    return false;
  }
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO investment_study_days
      (day, reviewed, studied_course, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       reviewed = MAX(investment_study_days.reviewed, excluded.reviewed),
       studied_course = MAX(investment_study_days.studied_course, excluded.studied_course),
       updated_at = excluded.updated_at`,
    day,
    source === "review" ? 1 : 0,
    source === "course" ? 1 : 0,
    now,
  );
  return true;
}

async function seedCurrentInvestmentStudyDay(
  db: SQLiteDatabase,
  day: string,
): Promise<void> {
  const [review, course] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM review_session_results
       WHERE review_day = ? AND reviewed_count > 0`,
      day,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM course_lesson_progress
       WHERE stage = 'completed' AND completed_at >= ?
         AND completed_at < ?`,
      ...localDayBounds(day),
    ),
  ]);
  if ((review?.count ?? 0) > 0) await markInvestmentStudyDay(db, day, "review");
  if ((course?.count ?? 0) > 0)
    await markInvestmentStudyDay(db, day, "course");
}

async function readStoneBalance(db: SQLiteDatabase): Promise<number> {
  const [
    legacyRewards,
    chestRewards,
    corviRewards,
    comboRewards,
    shopPurchases,
    investments,
  ] =
    await Promise.all([
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(stone) AS total FROM daily_mission_awards",
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(final_stone) AS total FROM mission_chests WHERE opened = 1",
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(stone) AS total FROM corvi_chest_rewards",
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(combo_length) AS total FROM review_combo_rewards",
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(stone_cost) AS total FROM mission_shop_purchases",
      ),
      db.getFirstAsync<{
        principal: number | null;
        settlements: number | null;
      }>(
        `SELECT SUM(principal) AS principal,
          SUM(settlement_amount) AS settlements
         FROM stone_investments`,
      ),
    ]);
  return (
    (legacyRewards?.total ?? 0) +
    (chestRewards?.total ?? 0) +
    (corviRewards?.total ?? 0) +
    (comboRewards?.total ?? 0) -
    (shopPurchases?.total ?? 0) -
    (investments?.principal ?? 0) +
    (investments?.settlements ?? 0)
  );
}

async function readUnopenedMissionChests(
  db: SQLiteDatabase,
): Promise<MissionChest[]> {
  const rows = await db.getAllAsync<
    Omit<MissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
      opened: number;
      superUpgrade: number;
      ruleSet: number;
    }
  >(
    `SELECT chest_id AS chestId, mission_day AS day, mission_id AS missionId,
      base_stone AS baseStone, upgrade_attempts AS upgradeAttempts, rarity,
        rule_set AS ruleSet, super_upgrade AS superUpgrade,
      opened, final_stone AS finalStone, created_at AS createdAt, updated_at AS updatedAt
     FROM mission_chests WHERE opened = 0 ORDER BY mission_day DESC, created_at DESC`,
  );
  return rows.map(missionChestFromRow);
}

function missionChestFromRow(
  row: Omit<MissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
    opened: number;
    superUpgrade: number;
    ruleSet: number;
  },
): MissionChest {
  return {
    ...row,
    ruleSet:
      row.ruleSet === 7
        ? 7
        : row.ruleSet === 6
        ? 6
        : row.ruleSet === 5
          ? 5
        : row.ruleSet === 4
          ? 4
          : row.ruleSet === 3
            ? 3
            : row.ruleSet === 2
              ? 2
              : 1,
    superUpgrade: Boolean(row.superUpgrade),
    opened: Boolean(row.opened),
  };
}

export function getMissionChest(chestId: string): Promise<MissionChest | null> {
  return serialize(async () => {
    const db = await database();
    let changed = false;
    let chest: MissionChest | null = null;
    await db.withTransactionAsync(async () => {
      changed = await migrateUntouchedMissionChests(
        db,
        new Date().toISOString(),
      );
      if (changed) await markSyncDirty(db);
      const row = await db.getFirstAsync<
        Omit<MissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
          opened: number;
          superUpgrade: number;
          ruleSet: number;
        }
      >(
        `SELECT chest_id AS chestId, mission_day AS day, mission_id AS missionId,
          base_stone AS baseStone, upgrade_attempts AS upgradeAttempts, rarity,
          rule_set AS ruleSet, super_upgrade AS superUpgrade,
          opened, final_stone AS finalStone, created_at AS createdAt, updated_at AS updatedAt
         FROM mission_chests WHERE chest_id = ?`,
        chestId,
      );
      chest = row ? missionChestFromRow(row) : null;
    });
    if (changed) notifySyncListeners();
    return chest;
  });
}

export function getMissionCorviStatueReward(
  chestId: string,
): Promise<CorviStatueReward | null> {
  return serialize(async () => {
    const craft = await (
      await database()
    ).getFirstAsync<Pick<CollectionCraft, "artworkId" | "pieceCost">>(
      `SELECT artwork_id AS artworkId, piece_cost AS pieceCost
       FROM collection_crafts
       WHERE craft_id = ?`,
      `${COLLECTION_CYCLE_PREFIX}corvi-${chestId}`,
    );
    const artwork = COLLECTION_ARTWORKS.find(
      (item) => item.id === craft?.artworkId,
    );
    return artwork
      ? {
          artwork,
          compensationPieces: craft?.pieceCost === -20 ? 20 : 0,
        }
      : null;
  });
}

export function attemptMissionChestUpgrade(
  chestId: string,
): Promise<MissionChestUpgradeResult> {
  return serialize(async () => {
    const db = await database();
    let result: MissionChestUpgradeResult | undefined;
    await db.withTransactionAsync(async () => {
      await migrateUntouchedMissionChests(db, new Date().toISOString());
      const row = await db.getFirstAsync<
        Omit<MissionChest, "opened" | "superUpgrade" | "ruleSet"> & {
          opened: number;
          superUpgrade: number;
          ruleSet: number;
        }
      >(
        `SELECT chest_id AS chestId, mission_day AS day, mission_id AS missionId,
          base_stone AS baseStone, upgrade_attempts AS upgradeAttempts, rarity,
          rule_set AS ruleSet, super_upgrade AS superUpgrade,
          opened, final_stone AS finalStone, created_at AS createdAt, updated_at AS updatedAt
         FROM mission_chests WHERE chest_id = ?`,
        chestId,
      );
      if (!row) throw new Error("Không tìm thấy rương này.");
      const current = missionChestFromRow(row);
      if (current.opened) throw new Error("Rương này đã được mở.");
      const ruleSet = current.ruleSet ?? 1;
      const superUpgrade = current.superUpgrade ?? false;
      const reachedTapCap =
        current.rarity === MAX_TAP_CHEST_RARITY ||
        current.rarity === "legendary";
      const nextAttempt = reachedTapCap
        ? current.upgradeAttempts
        : current.upgradeAttempts + 1;
      const upgrade = reachedTapCap
        ? { success: true, rarity: current.rarity }
        : resolveChestUpgrade(
            chestId,
            nextAttempt,
            current.rarity,
            ruleSet,
            superUpgrade,
          );
      const rawRarity = upgrade.success ? upgrade.rarity : current.rarity;
      const rarity =
        rawRarity === "legendary" ? MAX_TAP_CHEST_RARITY : rawRarity;
      const finished =
        reachedTapCap ||
        (ruleSet === 1 && !upgrade.success) ||
        nextAttempt === maxChestUpgradeAttempts(ruleSet, superUpgrade) ||
        rarity === MAX_TAP_CHEST_RARITY ||
        rawRarity === "legendary";
      const awardedStone = finished
        ? chestTotalStoneReward(
            chestId,
            current.baseStone,
            rarity,
            ruleSet,
          )
        : null;
      const next: MissionChest = {
        ...current,
        upgradeAttempts: nextAttempt,
        rarity,
        opened: finished,
        finalStone: awardedStone,
        updatedAt: new Date().toISOString(),
      };
      if (!isValidMissionChest(next))
        throw new Error("Trạng thái rương không hợp lệ.");
      const update = await db.runAsync(
        `UPDATE mission_chests SET upgrade_attempts = ?, rarity = ?, opened = ?,
          final_stone = ?, updated_at = ? WHERE chest_id = ? AND opened = 0`,
        next.upgradeAttempts,
        next.rarity,
        next.opened ? 1 : 0,
        next.finalStone,
        next.updatedAt,
        chestId,
      );
      if (update.changes !== 1)
        throw new Error("Rương đã được cập nhật trên thiết bị.");
      await markSyncDirty(db);
      const corviReward =
        finished && rarity === "legendary"
          ? await awardCorviStatue(db, chestId)
          : null;
      result = {
        chest: next,
        succeeded: !reachedTapCap && upgrade.success,
        finished,
        awardedStone,
        awardedFragments: finished
          ? chestFragmentReward(
              chestId,
              rarity,
              ruleSet,
            )
          : null,
        awardedStatue: corviReward?.artwork ?? null,
        compensatedPieces: corviReward?.compensationPieces ?? 0,
      };
    });
    notifySyncListeners();
    return result!;
  });
}

export function getMissionCollectionOverview(): Promise<MissionCollectionOverview> {
  return serialize(async () => {
    const balance = await readMissionCollectionBalance(await database());
    return { fragments: balance.fragments, crafts: balance.crafts };
  });
}

export function craftCollectionArtwork(
  rarity: ChestRarity,
): Promise<CollectionCraft> {
  return serialize(async () => {
    const db = await database();
    let craft: CollectionCraft | undefined;
    await db.withTransactionAsync(async () => {
      const [overview, nextCraft] = await Promise.all([
        readMissionCollectionOverview(db),
        db.getFirstAsync<{ nextOrdinal: number }>(
          `SELECT COUNT(*) + 1 AS nextOrdinal FROM collection_crafts
           WHERE rarity = ? AND craft_id LIKE ? AND piece_cost > 0`,
          rarity,
          `${COLLECTION_CYCLE_PREFIX}${rarity}-%`,
        ),
      ]);
      const craftIndex = collectionCraftIndex(
        `${rarity}:${nextCraft?.nextOrdinal ?? 1}`,
      );
      const unlockedArtworkIds = new Set(
        overview.crafts.map((item) => item.artworkId),
      );
      const artwork = artworkForCraft(rarity, craftIndex, unlockedArtworkIds);
      if (overview.fragments[rarity] < 10) {
        throw new Error("Cần đủ 10 mảnh cùng phẩm chất để mở khóa tượng.");
      }
      const next: CollectionCraft = {
        craftId: `${COLLECTION_CYCLE_PREFIX}${rarity}-${craftIndex}`,
        rarity,
        craftIndex,
        artworkId: artwork.id,
        craftedAt: new Date().toISOString(),
        pieceCost: 10,
      };
      await db.runAsync(
        `INSERT OR IGNORE INTO collection_crafts
          (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
         VALUES (?, ?, ?, ?, ?, ?)`,
        next.craftId,
        next.rarity,
        next.craftIndex,
        next.artworkId,
        next.craftedAt,
        next.pieceCost ?? 10,
      );
      const savedCraft = await db.getFirstAsync<CollectionCraft>(
        `SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
          artwork_id AS artworkId, crafted_at AS craftedAt, piece_cost AS pieceCost
         FROM collection_crafts WHERE craft_id = ?`,
        next.craftId,
      );
      if (!savedCraft) throw new Error("Không thể lưu tượng đã ghép.");
      craft = savedCraft;
      await markSyncDirty(db);
    });
    notifySyncListeners();
    return craft!;
  });
}

async function readMissionCollectionOverview(
  db: SQLiteDatabase,
): Promise<MissionCollectionOverview> {
  const balance = await readMissionCollectionBalance(db);
  return { fragments: balance.fragments, crafts: balance.crafts };
}

async function readMissionCollectionBalance(
  db: SQLiteDatabase,
): Promise<MissionCollectionOverview> {
  const [openedChests, corviChests] = await Promise.all([
    db.getAllAsync<{
      chestId: string;
      rarity: ChestRarity;
      ruleSet: number;
    }>(
      `SELECT chest_id AS chestId, rarity, rule_set AS ruleSet
       FROM mission_chests WHERE opened = 1`,
    ),
    db.getAllAsync<{ chestId: string }>(
      "SELECT chest_id AS chestId FROM corvi_chest_rewards ORDER BY chest_index",
    ),
  ]);
  const allCrafts = await db.getAllAsync<CollectionCraft>(
    `SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
      artwork_id AS artworkId, crafted_at AS craftedAt, piece_cost AS pieceCost
     FROM collection_crafts ORDER BY crafted_at DESC, craft_id DESC`,
  );
  const historicalSpends = await db.getAllAsync<{
    rarity: ChestRarity;
    pieceCost: number;
  }>(
    `SELECT rarity, SUM(piece_cost) AS pieceCost
     FROM collection_piece_spends GROUP BY rarity`,
  );
  const shopPurchases = await db.getAllAsync<{
    rarity: ChestRarity;
    count: number;
  }>(
    `SELECT rarity, COUNT(*) AS count
     FROM mission_shop_purchases
     WHERE rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')
     GROUP BY rarity`,
  );
  const fragments: Record<ChestRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  for (const chest of openedChests) {
    const chestRules =
      chest.ruleSet === 7
        ? 7
        : chest.ruleSet === 6
        ? 6
        : chest.ruleSet === 5
          ? 5
        : chest.ruleSet === 4
          ? 4
          : chest.ruleSet === 3
            ? 3
            : chest.ruleSet === 2
              ? 2
              : 1;
    const reward = chestFragmentReward(chest.chestId, chest.rarity, chestRules);
    for (const rarity of Object.keys(fragments) as ChestRarity[]) {
      fragments[rarity] += reward[rarity];
    }
  }
  for (const chest of corviChests) {
    const reward = chestFragmentReward(chest.chestId, "legendary", 7);
    for (const rarity of Object.keys(fragments) as ChestRarity[]) {
      fragments[rarity] += reward[rarity];
    }
  }

  for (const purchase of shopPurchases) {
    fragments[purchase.rarity] += purchase.count;
  }

  const spentPieces: Record<ChestRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  const compensatedPieces: Record<ChestRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  for (const craft of allCrafts) {
    const pieceDelta = craft.pieceCost ?? 20;
    if (pieceDelta < 0) compensatedPieces[craft.rarity] += -pieceDelta;
    else spentPieces[craft.rarity] += pieceDelta;
  }
  for (const spend of historicalSpends) {
    spentPieces[spend.rarity] += spend.pieceCost;
  }
  for (const rarity of Object.keys(fragments) as ChestRarity[]) {
    fragments[rarity] =
      Math.max(0, fragments[rarity] - spentPieces[rarity]) +
      compensatedPieces[rarity];
  }
  fragments.common = 0;
  fragments.uncommon = 0;
  return {
    fragments,
    crafts: allCrafts.filter(isCurrentCycleCollectionCraft),
  };
}

async function awardCorviStatue(
  db: SQLiteDatabase,
  chestId: string,
): Promise<CorviStatueReward> {
  const craftId = `${COLLECTION_CYCLE_PREFIX}corvi-${chestId}`;
  const existing = await db.getFirstAsync<CollectionCraft>(
    `SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
      artwork_id AS artworkId, crafted_at AS craftedAt, piece_cost AS pieceCost
     FROM collection_crafts WHERE craft_id = ?`,
    craftId,
  );
  if (existing) {
    const savedArtwork = COLLECTION_ARTWORKS.find(
      (artwork) => artwork.id === existing.artworkId,
    );
    if (savedArtwork) {
      return {
        artwork: savedArtwork,
        compensationPieces: existing.pieceCost === -20 ? 20 : 0,
      };
    }
    throw new Error("Tượng thưởng trong rương Corvi không hợp lệ.");
  }

  const overview = await readMissionCollectionOverview(db);
  const unlockedArtworkIds = new Set(
    overview.crafts.map((item) => item.artworkId),
  );
  const artwork = artworkForCorviChest(
    chestId,
    unlockedArtworkIds,
  );
  const compensationPieces = unlockedArtworkIds.has(artwork.id) ? 20 : 0;
  const craft: CollectionCraft = {
    craftId,
    rarity: artwork.rarity,
    craftIndex: collectionCraftIndex(`corvi:${chestId}`),
    artworkId: artwork.id,
    craftedAt: new Date().toISOString(),
    pieceCost: compensationPieces > 0 ? -20 : 0,
  };
  await db.runAsync(
    `INSERT OR IGNORE INTO collection_crafts
      (craft_id, rarity, craft_index, artwork_id, crafted_at, piece_cost)
     VALUES (?, ?, ?, ?, ?, ?)`,
    craft.craftId,
    craft.rarity,
    craft.craftIndex,
    craft.artworkId,
    craft.craftedAt,
     craft.pieceCost ?? 100,
  );
  const saved = await db.getFirstAsync<CollectionCraft>(
    `SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
      artwork_id AS artworkId, crafted_at AS craftedAt, piece_cost AS pieceCost
     FROM collection_crafts WHERE craft_id = ?`,
    craftId,
  );
  if (!saved) throw new Error("Không thể lưu tượng thưởng từ rương Corvi.");
  const savedArtwork = COLLECTION_ARTWORKS.find(
    (item) => item.id === saved.artworkId,
  );
  if (!savedArtwork) throw new Error("Tượng thưởng trong rương Corvi không hợp lệ.");
  return {
    artwork: savedArtwork,
    compensationPieces: saved.pieceCost === -20 ? 20 : 0,
  };
}

// Serialize operations so reads cannot observe a partially applied write.
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => undefined);
  return result;
}

/** Internal database bridge for the isolated, serialized sync repository. */
export function withSyncDatabase<T>(
  operation: (db: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  return serialize(async () => operation(await database()));
}

export function getDatabaseScope(): string | null {
  return databaseScope;
}

/** Switches account-local SQLite files without deleting the prior account's data. */
export function switchDatabaseScope(accountId: string | null): Promise<void> {
  return serialize(async () => {
    if (databaseScope === accountId) {
      await database();
      return;
    }
    if (connection) {
      const current = await connection;
      await current.closeAsync();
      connection = undefined;
    }
    databaseScope = accountId;
    await database();
  });
}

export function subscribeSyncChanges(listener: () => void): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export function subscribeSyncApplied(listener: () => void): () => void {
  syncAppliedListeners.add(listener);
  return () => syncAppliedListeners.delete(listener);
}

export function notifySyncApplied(): void {
  for (const listener of syncAppliedListeners) listener();
}

export function getSyncQueueState(): Promise<{
  generation: number;
  pending: boolean;
}> {
  return withSyncDatabase(async (db) => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM sync_state WHERE key IN ('generation', 'pending')",
    );
    const values = new Map(rows.map((row) => [row.key, row.value]));
    return {
      generation: Number(values.get("generation") ?? 0),
      pending: values.get("pending") === "1",
    };
  });
}

export function markSyncPending(): Promise<void> {
  return withSyncDatabase(async (db) => {
    await markSyncDirty(db);
    notifySyncListeners();
  });
}

export function markSyncClean(generation: number): Promise<boolean> {
  return withSyncDatabase(async (db) => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM sync_state WHERE key IN ('generation', 'pending')",
    );
    const state = {
      generation: Number(
        new Map(rows.map((row) => [row.key, row.value])).get("generation") ?? 0,
      ),
    };
    if (state.generation !== generation) return false;
    await db.runAsync(`
      INSERT INTO sync_state (key, value) VALUES ('pending', '0')
      ON CONFLICT(key) DO UPDATE SET value = '0'
    `);
    return true;
  });
}

export function listWords(): Promise<VocabularyWord[]> {
  return serialize(async () => {
    const db = await database();
    const rows = await db.getAllAsync<
      Omit<VocabularyWord, "completed" | "frozen"> & {
        completed: number;
        frozen: number;
      }
    >(`
      SELECT w.id, w.term, w.meaning, w.ipa, w.example, w.note,
        w.dictionary_entry_id AS dictionaryEntryId, w.dictionary_sense_id AS dictionarySenseId,
        w.created_at AS createdAt, w.updated_at AS updatedAt,
        p.review_count AS reviewCount, p.level, p.learned_on AS learnedOn,
        p.next_review_on AS nextReviewOn, p.completed, p.last_reviewed_on AS lastReviewedOn, p.frozen
      FROM words w JOIN word_progress p ON p.word_id = w.id
      ORDER BY w.created_at DESC, w.id DESC
    `);
    return rows.map((row) => ({
      ...row,
      completed: row.completed === 1,
      frozen: row.frozen === 1,
    }));
  });
}

export function getCourseLessonCompletions(
  lessonPrefix: string,
): Promise<string[]> {
  if (!/^[a-z0-9-]{1,80}$/i.test(lessonPrefix))
    return Promise.reject(new Error("Mã khóa học không hợp lệ."));
  return serialize(async () => {
    const rows = await (await database()).getAllAsync<{ lessonId: string }>(
      `SELECT lesson_id AS lessonId FROM course_lesson_progress
       WHERE lesson_id LIKE ? AND stage = 'completed'`,
      `${lessonPrefix}%`,
    );
    return rows.map((row) => row.lessonId);
  });
}

export function markCourseLessonCompleted(lessonId: string): Promise<void> {
  if (!/^[a-z0-9-]{1,120}$/i.test(lessonId))
    return Promise.reject(new Error("Mã bài học không hợp lệ."));
  return serialize(async () => {
    const db = await database();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await settleActiveStoneInvestments(db, localDay(new Date(now)));
      await db.runAsync(
        `INSERT INTO course_lesson_progress
          (lesson_id, current_index, stage, completed_at, updated_at)
         VALUES (?, 0, 'completed', ?, ?)
         ON CONFLICT(lesson_id) DO UPDATE SET
           stage = 'completed',
           completed_at = COALESCE(course_lesson_progress.completed_at, excluded.completed_at),
           updated_at = excluded.updated_at`,
        lessonId,
        now,
        now,
      );
      await markInvestmentStudyDay(db, localDay(new Date(now)), "course");
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export function getReviewStatistics(
  today = localDay(new Date()),
  selectedMonth = `${today.slice(0, 7)}-01`,
): Promise<ReviewStatistics> {
  return serialize(async () => {
    const { weekStart, weekEnd } = reviewWeekRange(today);
    const { monthStart, monthEnd } = reviewMonthRange(selectedMonth);
    const db = await database();
    const [totals, weeklyRows, monthlyRows] = await Promise.all([
      db.getFirstAsync<{
        totalSessions: number;
        totalReviewed: number;
        totalCorrect: number;
      }>(`
        SELECT COALESCE(SUM(session_count), 0) AS totalSessions,
          COALESCE(SUM(reviewed_count), 0) AS totalReviewed,
          COALESCE(SUM(correct_count), 0) AS totalCorrect
        FROM review_day_statistics
      `),
      db.getAllAsync<{
        day: string;
        reviewedCount: number;
        correctCount: number;
        sessionCount: number;
      }>(
        `
        SELECT review_day AS day, reviewed_count AS reviewedCount,
          correct_count AS correctCount, session_count AS sessionCount
        FROM review_day_statistics WHERE review_day BETWEEN ? AND ?
        ORDER BY review_day
      `,
        weekStart,
        weekEnd,
      ),
      db.getAllAsync<{
        day: string;
        reviewedCount: number;
        correctCount: number;
        sessionCount: number;
      }>(
        `
        SELECT review_day AS day, reviewed_count AS reviewedCount,
          correct_count AS correctCount, session_count AS sessionCount
        FROM review_day_statistics WHERE review_day BETWEEN ? AND ?
        ORDER BY review_day
      `,
        monthStart,
        monthEnd,
      ),
    ]);
    return buildReviewStatistics(
      today,
      totals ?? { totalSessions: 0, totalReviewed: 0, totalCorrect: 0 },
      weeklyRows,
      monthlyRows,
      selectedMonth,
    );
  });
}

export function recordReviewSessionResult(
  input: ReviewSessionResultInput,
): Promise<void> {
  return serialize(async () => {
    const grades: DailyReviewGrade[] = [
      "S+",
      "S",
      "A+",
      "A",
      "A-",
      "B+",
      "B",
      "B-",
      "C",
    ];
    if (
      typeof input.sessionId !== "string" ||
      !input.sessionId.trim() ||
      input.sessionId.length > 120 ||
      !Number.isFinite(input.startedAt) ||
      !Number.isSafeInteger(input.activeDurationMs) ||
      input.activeDurationMs < 0 ||
      !Number.isSafeInteger(input.maxCombo) ||
      input.maxCombo < 0 ||
      input.maxCombo > input.correctCount ||
      !Number.isSafeInteger(input.reviewedCount) ||
      input.reviewedCount < 0 ||
      !Number.isSafeInteger(input.correctCount) ||
      input.correctCount < 0 ||
      input.correctCount > input.reviewedCount ||
      !grades.includes(input.grade) ||
      typeof input.completed !== "boolean"
    ) {
      throw new Error("Kết quả phiên ôn không hợp lệ.");
    }
    const db = await database();
    const day = localDay(new Date(input.startedAt));
    const deviceId = await getDeviceId(db);
    const now = new Date().toISOString();
    let changed = false;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `
        INSERT OR IGNORE INTO review_session_results
          (session_id, device_id, review_day, reviewed_count, correct_count, grade, completed, created_at, active_duration_ms, max_combo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        input.sessionId,
        deviceId,
        day,
        input.reviewedCount,
        input.correctCount,
        input.grade,
        input.completed ? 1 : 0,
        now,
        input.activeDurationMs,
        input.maxCombo,
      );
      const settledInvestments = await settleActiveStoneInvestments(
        db,
        localDay(new Date()),
      );
      const studyDayChanged =
        input.reviewedCount > 0
          ? await markInvestmentStudyDay(db, day, "review")
          : false;
      const chestsChanged = await grantDailyMissionChests(db, day);
      changed =
        result.changes === 1 ||
        chestsChanged ||
        settledInvestments ||
        studyDayChanged;
      if (changed) await markSyncDirty(db);
    });
    if (changed) notifySyncListeners();
  });
}

export function getReviewSessionSummaryMetrics(
  sessionId: string,
): Promise<ReviewSessionSummaryMetrics> {
  return serialize(async () => {
    if (
      typeof sessionId !== "string" ||
      !sessionId.trim() ||
      sessionId.length > 120
    ) {
      throw new Error("Phiên ôn không hợp lệ.");
    }
    const db = await database();
    const row = await db.getFirstAsync<{
      stoneEarned: number | null;
      personalComboRecord: number | null;
    }>(
      `
      SELECT
        COALESCE((
          SELECT SUM(combo_length)
          FROM review_combo_rewards
          WHERE session_id = ?
        ), 0) AS stoneEarned,
        COALESCE((
          SELECT MAX(max_combo)
          FROM review_session_results
        ), 0) AS personalComboRecord
      `,
      sessionId,
    );
    return {
      stoneEarned: row?.stoneEarned ?? 0,
      personalComboRecord: row?.personalComboRecord ?? 0,
    };
  });
}

export function recordReviewComboReward(
  input: ReviewComboRewardInput,
): Promise<boolean> {
  return serialize(async () => {
    if (
      typeof input.sessionId !== "string" ||
      !input.sessionId.trim() ||
      input.sessionId.length > 120 ||
      !Number.isFinite(input.startedAt) ||
      !Number.isSafeInteger(input.comboIndex) ||
      input.comboIndex < 1 ||
      !Number.isSafeInteger(input.comboLength) ||
      input.comboLength < 1
    ) {
      throw new Error("Phần thưởng Combo không hợp lệ.");
    }
    if (input.comboLength < 20) return false;
    const db = await database();
    const day = localDay(new Date(input.startedAt));
    const deviceId = await getDeviceId(db);
    let inserted = false;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `
        INSERT OR IGNORE INTO review_combo_rewards
          (session_id, device_id, review_day, combo_index, combo_length, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        input.sessionId,
        deviceId,
        day,
        input.comboIndex,
        input.comboLength,
        new Date().toISOString(),
      );
      inserted = result.changes === 1;
      if (inserted) await markSyncDirty(db);
    });
    if (inserted) notifySyncListeners();
    return inserted;
  });
}

export function recordReviewSessionStart(): Promise<void> {
  return serialize(async () => {
    const db = await database();
    const day = localDay(new Date());
    const deviceId = await getDeviceId(db);
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        INSERT INTO review_day_statistics
          (review_day, reviewed_count, correct_count, session_count)
        VALUES (?, 0, 0, 1)
        ON CONFLICT(review_day) DO UPDATE SET
          session_count = session_count + 1
      `,
        day,
      );
      await db.runAsync(
        `
        INSERT INTO device_review_day_statistics
          (review_day, device_id, reviewed_count, correct_count, session_count, updated_at)
        VALUES (?, ?, 0, 0, 1, ?)
        ON CONFLICT(review_day, device_id) DO UPDATE SET
          session_count = session_count + 1,
          updated_at = excluded.updated_at
      `,
        day,
        deviceId,
        now,
      );
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export function saveWord(input: WordInput, id?: number): Promise<void> {
  return serialize(async () => {
    const clean = cleanWordInput(input);
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
      throw new Error("Mã từ không hợp lệ.");
    }
    const db = await database();
    const key = normalizeTerm(clean.term);
    const meaningKey = normalizeTerm(clean.meaning);
    const previous =
      id === undefined
        ? undefined
        : await db.getFirstAsync<{
            dictionaryEntryId: number | null;
            dictionarySenseId: number | null;
          }>(
            "SELECT dictionary_entry_id AS dictionaryEntryId, dictionary_sense_id AS dictionarySenseId FROM words WHERE id = ?",
            id,
          );
    if (id !== undefined && !previous)
      throw new Error("Từ này không còn tồn tại.");
    // Edits retain the original sense association, even if the form omits metadata.
    const entryId =
      previous?.dictionaryEntryId ??
      (id === undefined ? (input.dictionaryEntryId ?? null) : null);
    const senseId =
      previous?.dictionarySenseId ??
      (id === undefined ? (input.dictionarySenseId ?? null) : null);
    validateDictionarySense(entryId, senseId);
    await assertWordIsNotDuplicate(db, clean, entryId, senseId, id ?? -1);
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      if (id !== undefined) {
        const result = await db.runAsync(
          `UPDATE words SET term = ?, normalized_term = ?, meaning = ?, normalized_meaning = ?, ipa = ?,
            example = ?, note = ?, updated_at = ? WHERE id = ?`,
          clean.term,
          key,
          clean.meaning,
          meaningKey,
          clean.ipa,
          clean.example,
          clean.note,
          now,
          id,
        );
        if (result.changes === 0) throw new Error("Từ này không còn tồn tại.");
      } else {
        const result = await db.runAsync(
          `INSERT INTO words (term, normalized_term, meaning, normalized_meaning, ipa, example, note, created_at, updated_at,
            dictionary_entry_id, dictionary_sense_id, sync_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          clean.term,
          key,
          clean.meaning,
          meaningKey,
          clean.ipa,
          clean.example,
          clean.note,
          now,
          now,
          entryId,
          senseId,
          syncIdForWord(clean.term, clean.meaning, entryId, senseId),
        );
        const progress = initialProgress(localDay(new Date(now)));
        await db.runAsync(
          "INSERT INTO word_progress (word_id, learned_on, next_review_on, sync_updated_at) VALUES (?, ?, ?, ?)",
          result.lastInsertRowId,
          progress.learnedOn,
          progress.nextReviewOn,
          now,
        );
      }
      if (id === undefined) {
        await grantDailyMissionChests(db, localDay(new Date(now)));
      }
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export type SaveWordsProgress = (completed: number, total: number) => void;

/** Add multiple new words as one local transaction and one sync update. */
export function saveWords(
  inputs: readonly WordInput[],
  onProgress?: SaveWordsProgress,
): Promise<void> {
  if (inputs.length === 0) return Promise.resolve();
  return serialize(async () => {
    const entries = inputs.map((input) => {
      const clean = cleanWordInput(input);
      const entryId = clean.dictionaryEntryId ?? null;
      const senseId = clean.dictionarySenseId ?? null;
      validateDictionarySense(entryId, senseId);
      return { clean, entryId, senseId };
    });

    const batchKeys = new Set<string>();
    for (const { clean } of entries) {
      const batchKey = `${normalizeTerm(clean.term)}\u0000${normalizeTerm(clean.meaning)}`;
      if (batchKeys.has(batchKey)) {
        throw new Error(
          "Từ này với nghĩa đã chọn bị lặp trong danh sách cần thêm.",
        );
      }
      batchKeys.add(batchKey);
    }

    const db = await database();
    const now = new Date().toISOString();
    const learnedOn = localDay(new Date(now));
    const progressInterval = Math.max(1, Math.ceil(entries.length / 100));
    await db.withTransactionAsync(async () => {
      for (const { clean, entryId, senseId } of entries) {
        await assertWordIsNotDuplicate(db, clean, entryId, senseId);
      }
      for (const [index, { clean, entryId, senseId }] of entries.entries()) {
        const key = normalizeTerm(clean.term);
        const meaningKey = normalizeTerm(clean.meaning);
        const result = await db.runAsync(
          `INSERT INTO words (term, normalized_term, meaning, normalized_meaning, ipa, example, note, created_at, updated_at,
            dictionary_entry_id, dictionary_sense_id, sync_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          clean.term,
          key,
          clean.meaning,
          meaningKey,
          clean.ipa,
          clean.example,
          clean.note,
          now,
          now,
          entryId,
          senseId,
          syncIdForWord(clean.term, clean.meaning, entryId, senseId),
        );
        const progress = initialProgress(learnedOn);
        await db.runAsync(
          "INSERT INTO word_progress (word_id, learned_on, next_review_on, sync_updated_at) VALUES (?, ?, ?, ?)",
          result.lastInsertRowId,
          progress.learnedOn,
          progress.nextReviewOn,
          now,
        );
        const completed = index + 1;
        if (
          onProgress &&
          (completed % progressInterval === 0 || completed === entries.length)
        ) {
          try {
            onProgress(completed, entries.length);
          } catch {
            // UI progress reporting must not interrupt the atomic database write.
          }
        }
      }
      await grantDailyMissionChests(db, learnedOn);
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

/** Atomically validate the displayed revision and persist a single answer. */
export function recordReview(
  id: number,
  correct: boolean,
  expectedReviewCount: number,
): Promise<void> {
  return serialize(async () => {
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      typeof correct !== "boolean" ||
      !Number.isSafeInteger(expectedReviewCount) ||
      expectedReviewCount < 0
    ) {
      throw new Error("Câu trả lời không hợp lệ.");
    }
    const db = await database();
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<
        Omit<VocabularyWord, "completed" | "frozen"> & {
          completed: number;
          frozen: number;
        }
      >(
        `SELECT level, learned_on AS learnedOn, next_review_on AS nextReviewOn, completed, frozen,
           review_count AS reviewCount, last_reviewed_on AS lastReviewedOn
         FROM word_progress WHERE word_id = ?`,
        id,
      );
      if (!row) throw new Error("Từ này không còn tồn tại.");
      if (row.frozen)
        throw new Error("Từ này đã đóng băng, không thể chấm điểm ôn tập.");
      if (row.reviewCount !== expectedReviewCount) {
        throw new Error("Tiến độ từ đã thay đổi. Hãy tải lại danh sách ôn.");
      }
      const reviewedOn = localDay(new Date());
      const next = applyReview(
        { ...row, completed: row.completed === 1, frozen: row.frozen === 1 },
        correct,
        reviewedOn,
      );
      const result = await db.runAsync(
        `UPDATE word_progress SET learned_on = ?, level = ?, next_review_on = ?, completed = ?,
            review_count = ?, last_reviewed_on = ?, sync_updated_at = ?
          WHERE word_id = ? AND review_count = ?`,
        next.learnedOn,
        next.level,
        next.nextReviewOn,
        next.completed ? 1 : 0,
        next.reviewCount,
        next.lastReviewedOn,
        new Date().toISOString(),
        id,
        expectedReviewCount,
      );
      if (result.changes !== 1)
        throw new Error("Tiến độ từ đã thay đổi. Hãy tải lại danh sách ôn.");
      await db.runAsync(
        `
        INSERT INTO review_day_statistics (review_day, reviewed_count, correct_count)
        VALUES (?, 1, ?)
        ON CONFLICT(review_day) DO UPDATE SET
          reviewed_count = reviewed_count + 1,
          correct_count = correct_count + excluded.correct_count
      `,
        reviewedOn,
        correct ? 1 : 0,
      );
      const deviceId = await getDeviceId(db);
      const now = new Date().toISOString();
      await db.runAsync(
        `
        INSERT INTO device_review_day_statistics
          (review_day, device_id, reviewed_count, correct_count, updated_at)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(review_day, device_id) DO UPDATE SET
          reviewed_count = reviewed_count + 1,
          correct_count = correct_count + excluded.correct_count,
          updated_at = excluded.updated_at
      `,
        reviewedOn,
        deviceId,
        correct ? 1 : 0,
        now,
      );
      await grantDailyMissionChests(db, reviewedOn);
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export function setWordFrozen(id: number, frozen: boolean): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1 || typeof frozen !== "boolean") {
      throw new Error("Trạng thái đóng băng không hợp lệ.");
    }
    const db = await database();
    let changed = false;
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<
        Omit<SrsProgress, "completed" | "frozen"> & {
          completed: number;
          frozen: number;
        }
      >(
        `SELECT level, learned_on AS learnedOn, next_review_on AS nextReviewOn, completed, frozen,
           review_count AS reviewCount, last_reviewed_on AS lastReviewedOn
         FROM word_progress WHERE word_id = ?`,
        id,
      );
      if (!row) throw new Error("Từ này không còn tồn tại.");
      if ((row.frozen === 1) === frozen) return;
      const state = {
        ...row,
        completed: row.completed === 1,
        frozen: row.frozen === 1,
      };
      const next = frozen
        ? freezeProgress(state)
        : unfreezeProgress(state, localDay(new Date()));
      await db.runAsync(
        "UPDATE word_progress SET frozen = ?, level = ?, next_review_on = ?, completed = ?, sync_updated_at = ? WHERE word_id = ?",
        frozen ? 1 : 0,
        next.level,
        next.nextReviewOn,
        next.completed ? 1 : 0,
        new Date().toISOString(),
        id,
      );
      changed = true;
      await markSyncDirty(db);
    });
    if (changed) notifySyncListeners();
  });
}

export function deleteWord(id: number): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new Error("Mã từ không hợp lệ.");
    const db = await database();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const word = await db.getFirstAsync<{ syncId: string }>(
        "SELECT sync_id AS syncId FROM words WHERE id = ?",
        id,
      );
      if (!word) throw new Error("Từ này không còn tồn tại.");
      await db.runAsync(
        `
        INSERT INTO sync_word_tombstones (sync_id, deleted_at) VALUES (?, ?)
        ON CONFLICT(sync_id) DO UPDATE SET deleted_at = excluded.deleted_at
      `,
        word.syncId,
        now,
      );
      await db.runAsync("DELETE FROM words WHERE id = ?", id);
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}
