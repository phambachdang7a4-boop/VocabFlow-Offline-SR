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
  isDailyReviewGradeQualified,
  missionAwardIsEarned,
  type DailyMission,
  type DailyMissionActivity,
  type DailyMissionAward,
  type DailyReviewGrade,
} from "../domain/daily-missions";
import {
  chestStoneReward,
  hasSuperUpgradeChance,
  isValidMissionChest,
  maxChestUpgradeAttempts,
  resolveChestUpgrade,
  startingRarityForMission,
  type ChestRarity,
  type MissionChest,
} from "../domain/mission-chests";
import {
  artworkForCraft,
  type CollectionCraft,
} from "../domain/collection-artworks";

let connection: Promise<SQLiteDatabase> | undefined;
let databaseScope: string | null = null;
const syncListeners = new Set<() => void>();
const syncAppliedListeners = new Set<() => void>();

export interface DailyMissionOverview {
  day: string;
  stoneBalance: number;
  missions: DailyMission[];
  chests: MissionChest[];
}

export interface MissionCollectionOverview {
  fragments: Record<ChestRarity, number>;
  crafts: CollectionCraft[];
}

export interface MissionChestUpgradeResult {
  chest: MissionChest;
  succeeded: boolean;
  finished: boolean;
  awardedStone: number | null;
}

export interface ReviewSessionResultInput {
  sessionId: string;
  startedAt: number;
  reviewedCount: number;
  correctCount: number;
  grade: DailyReviewGrade;
  completed: boolean;
}

export function normalizeTerm(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
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
    if ((version?.user_version ?? 0) > 15) {
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
  const [reviewed, added, sessions] = await Promise.all([
    db.getFirstAsync<{ count: number | null }>(
      "SELECT SUM(reviewed_count) AS count FROM device_review_day_statistics WHERE review_day = ?",
      day,
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM words WHERE created_at >= ? AND created_at < ?",
      dayStart,
      nextDayStart,
    ),
    db.getAllAsync<{ grade: DailyReviewGrade; reviewedCount: number }>(
      "SELECT grade, reviewed_count AS reviewedCount FROM review_session_results WHERE review_day = ?",
      day,
    ),
  ]);
  return {
    reviewedCount: reviewed?.count ?? 0,
    addedWordCount: added?.count ?? 0,
    qualifiedGradeCount: sessions.filter((session) =>
      isDailyReviewGradeQualified(session.grade, session.reviewedCount),
    ).length,
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
  for (const mission of evaluateDailyMissions(day, activity, missionRewards)) {
    if (!missionAwardIsEarned(mission)) continue;
    const chestId = `mission-${day}-${mission.id}`;
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO mission_chests
        (chest_id, mission_day, mission_id, base_stone, rarity, rule_set, super_upgrade, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, ?, ?, ?)`,
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
  }
  return changed;
}

async function migrateUntouchedMissionChests(
  db: SQLiteDatabase,
  now: string,
): Promise<boolean> {
  const untouched = await db.getAllAsync<{
    chestId: string;
    missionId: string;
  }>(
    `SELECT chest_id AS chestId, mission_id AS missionId
     FROM mission_chests
     WHERE opened = 0 AND upgrade_attempts = 0 AND rule_set < 3`,
  );
  let changed = false;
  for (const chest of untouched) {
    const update = await db.runAsync(
      `UPDATE mission_chests
       SET rarity = ?, rule_set = 3, super_upgrade = ?, updated_at = ?
       WHERE chest_id = ? AND opened = 0 AND upgrade_attempts = 0 AND rule_set < 3`,
      startingRarityForMission(chest.missionId),
      hasSuperUpgradeChance(chest.chestId) ? 1 : 0,
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
        legacyBalance,
        chestBalance,
        chests,
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
        db.getFirstAsync<{ total: number | null }>(
          "SELECT SUM(stone) AS total FROM daily_mission_awards",
        ),
        db.getFirstAsync<{ total: number | null }>(
          "SELECT SUM(final_stone) AS total FROM mission_chests WHERE opened = 1",
        ),
        readUnopenedMissionChests(db),
      ]);
      const missionRewards = [...legacyAwards, ...chestAwards];
      overview = {
        day,
        stoneBalance: (legacyBalance?.total ?? 0) + (chestBalance?.total ?? 0),
        missions: evaluateDailyMissions(day, activity, missionRewards),
        chests,
      };
    });
    if (chestsChanged) notifySyncListeners();
    return overview!;
  });
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
    ruleSet: row.ruleSet === 3 ? 3 : row.ruleSet === 2 ? 2 : 1,
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
      const nextAttempt = current.upgradeAttempts + 1;
      const ruleSet = current.ruleSet ?? 1;
      const superUpgrade = current.superUpgrade ?? false;
      const upgrade = resolveChestUpgrade(
        chestId,
        nextAttempt,
        current.rarity,
        ruleSet,
        superUpgrade,
      );
      const rarity = upgrade.success ? upgrade.rarity : current.rarity;
      const finished =
        !upgrade.success ||
        nextAttempt === maxChestUpgradeAttempts(ruleSet, superUpgrade) ||
        rarity === "legendary";
      const awardedStone = finished
        ? chestStoneReward(current.baseStone, rarity, ruleSet)
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
      result = {
        chest: next,
        succeeded: upgrade.success,
        finished,
        awardedStone,
      };
    });
    notifySyncListeners();
    return result!;
  });
}

export function getMissionCollectionOverview(): Promise<MissionCollectionOverview> {
  return serialize(async () => {
    const db = await database();
    const [earnedRows, crafts] = await Promise.all([
      db.getAllAsync<{ rarity: ChestRarity; count: number }>(
        "SELECT rarity, COUNT(*) AS count FROM mission_chests WHERE opened = 1 GROUP BY rarity",
      ),
      db.getAllAsync<CollectionCraft>(
        `SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
          artwork_id AS artworkId, crafted_at AS craftedAt
         FROM collection_crafts ORDER BY crafted_at DESC, craft_id DESC`,
      ),
    ]);
    const fragments: Record<ChestRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
    const earnedByRarity = new Map(
      earnedRows.map((row) => [row.rarity, row.count]),
    );
    const craftedByRarity = new Map<ChestRarity, number>();
    for (const craft of crafts)
      craftedByRarity.set(
        craft.rarity,
        (craftedByRarity.get(craft.rarity) ?? 0) + 1,
      );
    for (const rarity of Object.keys(fragments) as ChestRarity[]) {
      fragments[rarity] = Math.max(
        0,
        (earnedByRarity.get(rarity) ?? 0) -
          (craftedByRarity.get(rarity) ?? 0) * 20,
      );
    }
    return { fragments, crafts };
  });
}

export function craftCollectionArtwork(
  rarity: ChestRarity,
): Promise<CollectionCraft> {
  return serialize(async () => {
    const db = await database();
    let craft: CollectionCraft | undefined;
    await db.withTransactionAsync(async () => {
      const [earned, previous] = await Promise.all([
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM mission_chests WHERE opened = 1 AND rarity = ?",
          rarity,
        ),
        db.getFirstAsync<{ count: number; nextIndex: number | null }>(
          "SELECT COUNT(*) AS count, MAX(craft_index) + 1 AS nextIndex FROM collection_crafts WHERE rarity = ?",
          rarity,
        ),
      ]);
      const craftIndex = previous?.nextIndex ?? 1;
      if ((earned?.count ?? 0) - (previous?.count ?? 0) * 20 < 20) {
        throw new Error("Cần đủ 20 mảnh cùng phẩm chất để ghép tranh.");
      }
      const artwork = artworkForCraft(rarity, craftIndex);
      const next: CollectionCraft = {
        craftId: `craft-${rarity}-${craftIndex}`,
        rarity,
        craftIndex,
        artworkId: artwork.id,
        craftedAt: new Date().toISOString(),
      };
      await db.runAsync(
        `INSERT OR IGNORE INTO collection_crafts (craft_id, rarity, craft_index, artwork_id, crafted_at)
         VALUES (?, ?, ?, ?, ?)`,
        next.craftId,
        next.rarity,
        next.craftIndex,
        next.artworkId,
        next.craftedAt,
      );
      const savedCraft = await db.getFirstAsync<CollectionCraft>(
        `SELECT craft_id AS craftId, rarity, craft_index AS craftIndex,
          artwork_id AS artworkId, crafted_at AS craftedAt
         FROM collection_crafts WHERE craft_id = ?`,
        next.craftId,
      );
      if (!savedCraft) throw new Error("Không thể lưu bức tranh đã ghép.");
      craft = savedCraft;
      await markSyncDirty(db);
    });
    notifySyncListeners();
    return craft!;
  });
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
          (session_id, device_id, review_day, reviewed_count, correct_count, grade, completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        input.sessionId,
        deviceId,
        day,
        input.reviewedCount,
        input.correctCount,
        input.grade,
        input.completed ? 1 : 0,
        now,
      );
      const chestsChanged = await grantDailyMissionChests(db, day);
      changed = result.changes === 1 || chestsChanged;
      if (changed) await markSyncDirty(db);
    });
    if (changed) notifySyncListeners();
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
    const clean: WordInput = {
      term: input.term.normalize("NFKC").trim().replace(/\s+/g, " "),
      meaning: input.meaning.trim(),
      ipa: input.ipa.trim(),
      example: input.example.trim(),
      note: input.note.trim(),
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
    const duplicate = await db.getFirstAsync<{ id: number }>(
      entryId === null
        ? "SELECT id FROM words WHERE normalized_term = ? AND normalized_meaning = ? AND id != ?"
        : `SELECT id FROM words WHERE ((dictionary_entry_id = ? AND dictionary_sense_id = ?) OR
            (dictionary_entry_id IS NULL AND normalized_term = ? AND normalized_meaning = ?)) AND id != ?`,
      ...(entryId === null
        ? [key, meaningKey, id ?? -1]
        : [entryId, senseId, key, meaningKey, id ?? -1]),
    );
    if (duplicate)
      throw new Error(
        "Từ này với nghĩa đã chọn đã có trong danh sách. Hãy sửa mục đã lưu.",
      );
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
