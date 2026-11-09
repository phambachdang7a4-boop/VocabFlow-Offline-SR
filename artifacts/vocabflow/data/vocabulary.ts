import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { VocabularyWord, WordInput } from './types';
import { openDatabaseSafely } from './sqlite-connection';
import { applyReview, freezeProgress, initialProgress, localDay, rescheduleProgress, unfreezeProgress, type SrsProgress } from '../domain/srs';
import { buildReviewStatistics, reviewMonthRange, reviewWeekRange, type ReviewStatistics } from '../domain/review-statistics';
import {
  evaluateDailyMissions,
  isDailyReviewGradeQualified,
  missionAwardIsEarned,
  type DailyMission,
  type DailyMissionActivity,
  type DailyMissionAward,
  type DailyReviewGrade,
} from '../domain/daily-missions';
import { displayCourseMeaning } from './basic-course';
import { ALL_COURSE_LESSONS, courseForLesson } from './course-catalog';

let connection: Promise<SQLiteDatabase> | undefined;
let databaseScope: string | null = null;
const syncListeners = new Set<() => void>();
const syncAppliedListeners = new Set<() => void>();
const COURSE_EXAMPLES = new Map(ALL_COURSE_LESSONS.flatMap((lesson) => lesson.words.map((word) => [`${word.dictionaryEntryId}:${word.dictionarySenseId}`, word.example] as const)));

export type CourseLessonStage = 'flashcard' | 'answer' | 'selection' | 'completed';

export interface CourseLessonProgress {
  lessonId: string;
  currentIndex: number;
  stage: CourseLessonStage;
  completedAt: string | null;
  updatedAt: string;
}

export interface DailyMissionOverview {
  day: string;
  stoneBalance: number;
  missions: DailyMission[];
}

export interface ReviewSessionResultInput {
  sessionId: string;
  startedAt: number;
  reviewedCount: number;
  correctCount: number;
  grade: DailyReviewGrade;
  completed: boolean;
}

function courseLesson(lessonId: string) {
  return ALL_COURSE_LESSONS.find((lesson) => lesson.id === lessonId);
}

export function normalizeTerm(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function syncIdForWord(term: string, meaning: string, entryId: number | null, senseId: number | null): string {
  if (entryId !== null && senseId !== null) return `dict:${entryId}:${senseId}`;
  return `manual:${encodeURIComponent(normalizeTerm(term))}:${encodeURIComponent(normalizeTerm(meaning))}`;
}

function databaseFilename(): string {
  if (!databaseScope) return 'vocabflow.db';
  const scope = encodeURIComponent(databaseScope).replace(/%/g, '_');
  return `vocabflow-account-${scope}.db`;
}

function getDeviceId(db: SQLiteDatabase): Promise<string> {
  return db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key = 'device_id'").then((row) => {
    if (!row?.value) throw new Error('Không thể khởi tạo mã thiết bị để đồng bộ.');
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
    const sequence = await db.getFirstAsync<{ seq: number }>("SELECT seq FROM sqlite_sequence WHERE name = 'words'");
    const meanings = await db.getAllAsync<{ id: number; meaning: string }>('SELECT id, meaning FROM words');
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
      await db.runAsync('UPDATE words SET normalized_meaning = ? WHERE id = ?', normalizeTerm(word.meaning), word.id);
    }
    if (sequence) {
      await db.runAsync("INSERT INTO sqlite_sequence(name, seq) SELECT 'words', ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'words')", sequence.seq);
      await db.runAsync("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'words'", sequence.seq);
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
    const invalid = await db.getFirstAsync('PRAGMA foreign_key_check');
    if (invalid) throw new Error('Không thể chuyển dữ liệu an toàn. Dữ liệu cũ được giữ nguyên.');
  });
}

async function initialize(): Promise<SQLiteDatabase> {
  const db = await openDatabaseSafely(() => openDatabaseAsync(databaseFilename()));
  try {
    await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 11) {
      throw new Error('Dữ liệu thuộc phiên bản mới hơn. Hãy cập nhật VocabFlow.');
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
        }>('SELECT id, created_at AS createdAt FROM words');
        for (const word of existing) {
          const progress = initialProgress(localDay(new Date(word.createdAt)));
          await db.runAsync('UPDATE word_progress SET learned_on = ?, next_review_on = ? WHERE word_id = ?', progress.learnedOn, progress.nextReviewOn, word.id);
        }
        await db.execAsync('CREATE INDEX idx_progress_due ON word_progress(completed, next_review_on); PRAGMA user_version = 2;');
      });
    }
    if ((version?.user_version ?? 0) < 3) {
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<Omit<SrsProgress, 'completed'> & { wordId: number; completed: number }>(
          `SELECT word_id AS wordId, level, learned_on AS learnedOn, next_review_on AS nextReviewOn, 0 AS frozen,
             completed, review_count AS reviewCount, last_reviewed_on AS lastReviewedOn FROM word_progress`,
        );
        for (const row of rows) {
          const progress = rescheduleProgress({
            ...row,
            completed: row.completed === 1,
          });
          await db.runAsync('UPDATE word_progress SET next_review_on = ? WHERE word_id = ?', progress.nextReviewOn, row.wordId);
        }
        await db.execAsync('PRAGMA user_version = 3;');
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
      await db.withTransactionAsync(async () => {
        const savedCourseWords = await db.getAllAsync<{
          id: number;
          dictionaryEntryId: number;
          dictionarySenseId: number;
        }>(`
          SELECT id, dictionary_entry_id AS dictionaryEntryId,
            dictionary_sense_id AS dictionarySenseId
          FROM words
          WHERE TRIM(example) = '' AND note LIKE '%Khóa học:%'
            AND dictionary_entry_id IS NOT NULL AND dictionary_sense_id IS NOT NULL
        `);
        for (const word of savedCourseWords) {
          const example = COURSE_EXAMPLES.get(`${word.dictionaryEntryId}:${word.dictionarySenseId}`);
          if (example?.trim()) {
            await db.runAsync("UPDATE words SET example = ? WHERE id = ? AND TRIM(example) = ''", example, word.id);
          }
        }
        await db.execAsync('PRAGMA user_version = 8;');
      });
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
        await db.runAsync("INSERT OR REPLACE INTO sync_state (key, value) VALUES ('device_id', ?)", deviceId);
        await db.runAsync("INSERT OR IGNORE INTO sync_state (key, value) VALUES ('generation', '0')");
        await db.runAsync("INSERT OR IGNORE INTO sync_state (key, value) VALUES ('pending', '0')");
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
          await db.runAsync('UPDATE words SET sync_id = ? WHERE id = ?', syncIdForWord(word.term, word.meaning, word.entryId, word.senseId), word.id);
          await db.runAsync('UPDATE word_progress SET sync_updated_at = ? WHERE word_id = ?', word.updatedAt || word.createdAt || new Date().toISOString(), word.id);
        }
        await db.runAsync("UPDATE course_word_selection SET updated_at = ? WHERE updated_at = ''", new Date().toISOString());
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
    throw new Error('Ngày nhiệm vụ không hợp lệ.');
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

async function readDailyMissionActivity(db: SQLiteDatabase, day: string): Promise<DailyMissionActivity> {
  const [dayStart, nextDayStart] = localDayBounds(day);
  const [reviewed, added, lessons, sessions] = await Promise.all([
    db.getFirstAsync<{ count: number | null }>(
      'SELECT SUM(reviewed_count) AS count FROM device_review_day_statistics WHERE review_day = ?',
      day,
    ),
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM words WHERE created_at >= ? AND created_at < ?',
      dayStart,
      nextDayStart,
    ),
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM course_lesson_progress WHERE stage = ? AND completed_at >= ? AND completed_at < ?',
      'completed',
      dayStart,
      nextDayStart,
    ),
    db.getAllAsync<{ grade: DailyReviewGrade; reviewedCount: number }>(
      'SELECT grade, reviewed_count AS reviewedCount FROM review_session_results WHERE review_day = ?',
      day,
    ),
  ]);
  return {
    reviewedCount: reviewed?.count ?? 0,
    addedWordCount: added?.count ?? 0,
    completedLessonCount: lessons?.count ?? 0,
    qualifiedGradeCount: sessions.filter((session) => isDailyReviewGradeQualified(session.grade, session.reviewedCount)).length,
  };
}

async function grantDailyMissionAwards(db: SQLiteDatabase, day: string): Promise<boolean> {
  const [activity, awards] = await Promise.all([
    readDailyMissionActivity(db, day),
    db.getAllAsync<DailyMissionAward>(
      'SELECT mission_day AS missionDay, mission_id AS missionId, stone, completed_at AS completedAt FROM daily_mission_awards WHERE mission_day = ?',
      day,
    ),
  ]);
  let changed = false;
  const now = new Date().toISOString();
  for (const mission of evaluateDailyMissions(day, activity, awards)) {
    if (!missionAwardIsEarned(mission)) continue;
    const result = await db.runAsync(
      'INSERT OR IGNORE INTO daily_mission_awards (mission_day, mission_id, stone, completed_at) VALUES (?, ?, ?, ?)',
      day,
      mission.id,
      mission.stoneReward,
      now,
    );
    changed ||= result.changes === 1;
  }
  return changed;
}

export function getDailyMissionOverview(day = localDay(new Date())): Promise<DailyMissionOverview> {
  return serialize(async () => {
    const db = await database();
    let awardsChanged = false;
    let overview: DailyMissionOverview | undefined;
    await db.withTransactionAsync(async () => {
      awardsChanged = await grantDailyMissionAwards(db, day);
      if (awardsChanged) await markSyncDirty(db);
      const [activity, awards, balance] = await Promise.all([
        readDailyMissionActivity(db, day),
        db.getAllAsync<DailyMissionAward>(
          'SELECT mission_day AS missionDay, mission_id AS missionId, stone, completed_at AS completedAt FROM daily_mission_awards WHERE mission_day = ?',
          day,
        ),
        db.getFirstAsync<{ total: number | null }>('SELECT SUM(stone) AS total FROM daily_mission_awards'),
      ]);
      overview = {
        day,
        stoneBalance: balance?.total ?? 0,
        missions: evaluateDailyMissions(day, activity, awards),
      };
    });
    if (awardsChanged) notifySyncListeners();
    return overview!;
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
export function withSyncDatabase<T>(operation: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
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
    const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM sync_state WHERE key IN ('generation', 'pending')");
    const values = new Map(rows.map((row) => [row.key, row.value]));
    return {
      generation: Number(values.get('generation') ?? 0),
      pending: values.get('pending') === '1',
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
    const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM sync_state WHERE key IN ('generation', 'pending')");
    const state = {
      generation: Number(new Map(rows.map((row) => [row.key, row.value])).get('generation') ?? 0),
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
      Omit<VocabularyWord, 'completed' | 'frozen'> & {
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

export function getReviewStatistics(today = localDay(new Date()), selectedMonth = `${today.slice(0, 7)}-01`): Promise<ReviewStatistics> {
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
    return buildReviewStatistics(today, totals ?? { totalSessions: 0, totalReviewed: 0, totalCorrect: 0 }, weeklyRows, monthlyRows, selectedMonth);
  });
}

export function recordReviewSessionResult(input: ReviewSessionResultInput): Promise<void> {
  return serialize(async () => {
    const grades: DailyReviewGrade[] = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C'];
    if (
      typeof input.sessionId !== 'string' ||
      !input.sessionId.trim() ||
      input.sessionId.length > 120 ||
      !Number.isFinite(input.startedAt) ||
      !Number.isSafeInteger(input.reviewedCount) ||
      input.reviewedCount < 0 ||
      !Number.isSafeInteger(input.correctCount) ||
      input.correctCount < 0 ||
      input.correctCount > input.reviewedCount ||
      !grades.includes(input.grade) ||
      typeof input.completed !== 'boolean'
    ) {
      throw new Error('Kết quả phiên ôn không hợp lệ.');
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
      const awardsChanged = await grantDailyMissionAwards(db, day);
      changed = result.changes === 1 || awardsChanged;
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

export function listCourseProgress(): Promise<CourseLessonProgress[]> {
  return serialize(async () => {
    const db = await database();
    return db.getAllAsync<CourseLessonProgress>(`
      SELECT lesson_id AS lessonId, current_index AS currentIndex, stage,
        completed_at AS completedAt, updated_at AS updatedAt
      FROM course_lesson_progress
    `);
  });
}

export function getCourseProgress(lessonId: string): Promise<CourseLessonProgress> {
  return serialize(async () => {
    const lesson = courseLesson(lessonId);
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const catalog = courseForLesson(lessonId);
    if (!catalog) throw new Error('Không tìm thấy nguồn khóa học.');
    const db = await database();
    const saved = await db.getFirstAsync<CourseLessonProgress>(
      `
      SELECT lesson_id AS lessonId, current_index AS currentIndex, stage,
        completed_at AS completedAt, updated_at AS updatedAt
      FROM course_lesson_progress WHERE lesson_id = ?
    `,
      lessonId,
    );
    return (
      saved ?? {
        lessonId,
        currentIndex: 0,
        stage: 'flashcard',
        completedAt: null,
        updatedAt: '',
      }
    );
  });
}

export function getCourseSelections(lessonId: string): Promise<string[]> {
  return serialize(async () => {
    const lesson = courseLesson(lessonId);
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const db = await database();
    const rows = await db.getAllAsync<{ wordId: string }>('SELECT word_id AS wordId FROM course_word_selection WHERE lesson_id = ? AND selected = 1', lessonId);
    const availableIds = new Set(lesson.words.map((word) => word.id));
    return rows.map((row) => row.wordId).filter((id) => availableIds.has(id));
  });
}

export function saveCourseProgress(lessonId: string, currentIndex: number, stage: Exclude<CourseLessonStage, 'completed'>): Promise<void> {
  return serialize(async () => {
    const lesson = courseLesson(lessonId);
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    if (!Number.isSafeInteger(currentIndex) || currentIndex < 0 || currentIndex >= lesson.words.length) {
      throw new Error('Vị trí trong bài học không hợp lệ.');
    }
    const db = await database();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{ completedAt: string | null }>('SELECT completed_at AS completedAt FROM course_lesson_progress WHERE lesson_id = ?', lessonId);
      if (existing?.completedAt) throw new Error('Bài học này đã hoàn thành.');
      await db.runAsync(
        `
        INSERT INTO course_lesson_progress (lesson_id, current_index, stage, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(lesson_id) DO UPDATE SET
          current_index = excluded.current_index, stage = excluded.stage, updated_at = excluded.updated_at
      `,
        lessonId,
        currentIndex,
        stage,
        now,
      );
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export function saveCourseSelection(lessonId: string, wordId: string, selected: boolean): Promise<void> {
  return serialize(async () => {
    const lesson = courseLesson(lessonId);
    if (!lesson || !lesson.words.some((word) => word.id === wordId) || typeof selected !== 'boolean') {
      throw new Error('Lựa chọn từ trong bài học không hợp lệ.');
    }
    const db = await database();
    const progress = await db.getFirstAsync<{ completedAt: string | null }>('SELECT completed_at AS completedAt FROM course_lesson_progress WHERE lesson_id = ?', lessonId);
    if (progress?.completedAt) throw new Error('Bài học này đã hoàn thành.');
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        INSERT INTO course_word_selection (lesson_id, word_id, selected, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(lesson_id, word_id) DO UPDATE SET
          selected = excluded.selected, updated_at = excluded.updated_at
      `,
        lessonId,
        wordId,
        selected ? 1 : 0,
        now,
      );
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export function finishCourseLesson(lessonId: string, selectedWordIds: string[]): Promise<number> {
  return serialize(async () => {
    const lesson = courseLesson(lessonId);
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const catalog = courseForLesson(lessonId);
    if (!catalog) throw new Error('Không tìm thấy nguồn khóa học.');
    if (!Array.isArray(selectedWordIds) || selectedWordIds.some((id) => typeof id !== 'string')) {
      throw new Error('Danh sách từ muốn lưu không hợp lệ.');
    }
    const selected = new Set(selectedWordIds);
    const wordsById = new Map(lesson.words.map((word) => [word.id, word]));
    if (selected.size !== selectedWordIds.length || [...selected].some((id) => !wordsById.has(id))) {
      throw new Error('Danh sách từ muốn lưu không hợp lệ.');
    }

    const db = await database();
    const now = new Date().toISOString();
    const learned = initialProgress(localDay(new Date(now)));
    let added = 0;
    await db.withTransactionAsync(async () => {
      for (const word of lesson.words) {
        const isSelected = selected.has(word.id);
        await db.runAsync(
          `
          INSERT INTO course_word_selection (lesson_id, word_id, selected, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(lesson_id, word_id) DO UPDATE SET
            selected = excluded.selected, updated_at = excluded.updated_at
        `,
          lessonId,
          word.id,
          isSelected ? 1 : 0,
          now,
        );
        if (!isSelected) continue;

        const meaning = displayCourseMeaning(word);
        const duplicate = await db.getFirstAsync<{ id: number }>(
          `
          SELECT id FROM words
          WHERE (dictionary_entry_id = ? AND dictionary_sense_id = ?)
             OR (normalized_term = ? AND normalized_meaning = ?)
          LIMIT 1
        `,
          word.dictionaryEntryId,
          word.dictionarySenseId,
          normalizeTerm(word.term),
          normalizeTerm(meaning),
        );
        if (duplicate) continue;

        const result = await db.runAsync(
          `
          INSERT OR IGNORE INTO words
            (term, normalized_term, meaning, normalized_meaning, ipa, example, note, created_at, updated_at,
              dictionary_entry_id, dictionary_sense_id, sync_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          word.term,
          normalizeTerm(word.term),
          meaning,
          normalizeTerm(meaning),
          word.ipa,
          word.example,
          `${catalog.attribution} · Khóa học: ${lesson.title}`,
          now,
          now,
          word.dictionaryEntryId,
          word.dictionarySenseId,
          syncIdForWord(word.term, meaning, word.dictionaryEntryId, word.dictionarySenseId),
        );
        if (result.changes === 1) {
          await db.runAsync(
            'INSERT INTO word_progress (word_id, learned_on, next_review_on, sync_updated_at) VALUES (?, ?, ?, ?)',
            result.lastInsertRowId,
            learned.learnedOn,
            learned.nextReviewOn,
            now,
          );
          added += 1;
        }
      }

      await db.runAsync(
        `
        INSERT INTO course_lesson_progress
          (lesson_id, current_index, stage, completed_at, updated_at)
        VALUES (?, ?, 'completed', ?, ?)
        ON CONFLICT(lesson_id) DO UPDATE SET
          current_index = excluded.current_index, stage = 'completed',
          completed_at = excluded.completed_at, updated_at = excluded.updated_at
      `,
        lessonId,
        lesson.words.length - 1,
        now,
        now,
      );
      await grantDailyMissionAwards(db, localDay(new Date(now)));
      await markSyncDirty(db);
    });
    notifySyncListeners();
    return added;
  });
}

export function saveWord(input: WordInput, id?: number): Promise<void> {
  return serialize(async () => {
    const clean: WordInput = {
      term: input.term.normalize('NFKC').trim().replace(/\s+/g, ' '),
      meaning: input.meaning.trim(),
      ipa: input.ipa.trim(),
      example: input.example.trim(),
      note: input.note.trim(),
    };
    if (!clean.term || !clean.meaning) {
      throw new Error('Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.');
    }
    if (clean.term.length > 200 || clean.meaning.length > 2000 || clean.ipa.length > 200 || clean.example.length > 4000 || clean.note.length > 4000) {
      throw new Error('Nội dung quá dài. Từ và IPA tối đa 200 ký tự, nghĩa 2.000, ví dụ và ghi chú 4.000.');
    }
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
      throw new Error('Mã từ không hợp lệ.');
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
          }>('SELECT dictionary_entry_id AS dictionaryEntryId, dictionary_sense_id AS dictionarySenseId FROM words WHERE id = ?', id);
    if (id !== undefined && !previous) throw new Error('Từ này không còn tồn tại.');
    // Edits retain the original sense association, even if the form omits metadata.
    const entryId = previous?.dictionaryEntryId ?? (id === undefined ? (input.dictionaryEntryId ?? null) : null);
    const senseId = previous?.dictionarySenseId ?? (id === undefined ? (input.dictionarySenseId ?? null) : null);
    if ((entryId === null) !== (senseId === null) || (entryId !== null && (!Number.isSafeInteger(entryId) || entryId < 1 || !Number.isSafeInteger(senseId) || senseId! < 1))) {
      throw new Error('Vui lòng chọn một nghĩa từ điển hợp lệ.');
    }
    const duplicate = await db.getFirstAsync<{ id: number }>(
      entryId === null
        ? 'SELECT id FROM words WHERE normalized_term = ? AND normalized_meaning = ? AND id != ?'
        : `SELECT id FROM words WHERE ((dictionary_entry_id = ? AND dictionary_sense_id = ?) OR
            (dictionary_entry_id IS NULL AND normalized_term = ? AND normalized_meaning = ?)) AND id != ?`,
      ...(entryId === null ? [key, meaningKey, id ?? -1] : [entryId, senseId, key, meaningKey, id ?? -1]),
    );
    if (duplicate) throw new Error('Từ này với nghĩa đã chọn đã có trong danh sách. Hãy sửa mục đã lưu.');
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
        if (result.changes === 0) throw new Error('Từ này không còn tồn tại.');
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
          'INSERT INTO word_progress (word_id, learned_on, next_review_on, sync_updated_at) VALUES (?, ?, ?, ?)',
          result.lastInsertRowId,
          progress.learnedOn,
          progress.nextReviewOn,
          now,
        );
      }
      if (id === undefined) {
        await grantDailyMissionAwards(db, localDay(new Date(now)));
      }
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

/** Atomically validate the displayed revision and persist a single answer. */
export function recordReview(id: number, correct: boolean, expectedReviewCount: number): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1 || typeof correct !== 'boolean' || !Number.isSafeInteger(expectedReviewCount) || expectedReviewCount < 0) {
      throw new Error('Câu trả lời không hợp lệ.');
    }
    const db = await database();
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<
        Omit<VocabularyWord, 'completed' | 'frozen'> & {
          completed: number;
          frozen: number;
        }
      >(
        `SELECT level, learned_on AS learnedOn, next_review_on AS nextReviewOn, completed, frozen,
           review_count AS reviewCount, last_reviewed_on AS lastReviewedOn
         FROM word_progress WHERE word_id = ?`,
        id,
      );
      if (!row) throw new Error('Từ này không còn tồn tại.');
      if (row.frozen) throw new Error('Từ này đã đóng băng, không thể chấm điểm ôn tập.');
      if (row.reviewCount !== expectedReviewCount) {
        throw new Error('Tiến độ từ đã thay đổi. Hãy tải lại danh sách ôn.');
      }
      const reviewedOn = localDay(new Date());
      const next = applyReview({ ...row, completed: row.completed === 1, frozen: row.frozen === 1 }, correct, reviewedOn);
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
      if (result.changes !== 1) throw new Error('Tiến độ từ đã thay đổi. Hãy tải lại danh sách ôn.');
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
      await grantDailyMissionAwards(db, reviewedOn);
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}

export function setWordFrozen(id: number, frozen: boolean): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1 || typeof frozen !== 'boolean') {
      throw new Error('Trạng thái đóng băng không hợp lệ.');
    }
    const db = await database();
    let changed = false;
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<
        Omit<SrsProgress, 'completed' | 'frozen'> & {
          completed: number;
          frozen: number;
        }
      >(
        `SELECT level, learned_on AS learnedOn, next_review_on AS nextReviewOn, completed, frozen,
           review_count AS reviewCount, last_reviewed_on AS lastReviewedOn
         FROM word_progress WHERE word_id = ?`,
        id,
      );
      if (!row) throw new Error('Từ này không còn tồn tại.');
      if ((row.frozen === 1) === frozen) return;
      const state = {
        ...row,
        completed: row.completed === 1,
        frozen: row.frozen === 1,
      };
      const next = frozen ? freezeProgress(state) : unfreezeProgress(state, localDay(new Date()));
      await db.runAsync(
        'UPDATE word_progress SET frozen = ?, level = ?, next_review_on = ?, completed = ?, sync_updated_at = ? WHERE word_id = ?',
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
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Mã từ không hợp lệ.');
    const db = await database();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const word = await db.getFirstAsync<{ syncId: string }>('SELECT sync_id AS syncId FROM words WHERE id = ?', id);
      if (!word) throw new Error('Từ này không còn tồn tại.');
      await db.runAsync(
        `
        INSERT INTO sync_word_tombstones (sync_id, deleted_at) VALUES (?, ?)
        ON CONFLICT(sync_id) DO UPDATE SET deleted_at = excluded.deleted_at
      `,
        word.syncId,
        now,
      );
      await db.runAsync('DELETE FROM words WHERE id = ?', id);
      await markSyncDirty(db);
    });
    notifySyncListeners();
  });
}
