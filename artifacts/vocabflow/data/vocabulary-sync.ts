import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getDatabaseScope,
  getSyncQueueState,
  markSyncPending,
  notifySyncApplied,
  subscribeSyncChanges,
  switchDatabaseScope,
  withSyncDatabase,
} from './vocabulary';

export interface SyncWord {
  syncId: string;
  term: string;
  meaning: string;
  ipa: string;
  example: string;
  note: string;
  dictionaryEntryId: number | null;
  dictionarySenseId: number | null;
  createdAt: string;
  contentUpdatedAt: string;
  reviewCount: number;
  level: number;
  learnedOn: string;
  nextReviewOn: string | null;
  completed: boolean;
  lastReviewedOn: string | null;
  frozen: boolean;
  progressUpdatedAt: string;
}

export interface SyncDeletedWord {
  syncId: string;
  deletedAt: string;
}

export interface SyncCourseProgress {
  lessonId: string;
  currentIndex: number;
  stage: 'flashcard' | 'answer' | 'selection' | 'completed';
  completedAt: string | null;
  updatedAt: string;
}

export interface SyncCourseSelection {
  lessonId: string;
  wordId: string;
  selected: boolean;
  updatedAt: string;
}

export interface SyncReviewStat {
  deviceId: string;
  day: string;
  reviewedCount: number;
  correctCount: number;
  updatedAt: string;
}

export interface SyncPayload {
  words: SyncWord[];
  deletedWords: SyncDeletedWord[];
  courseProgress: SyncCourseProgress[];
  courseSelections: SyncCourseSelection[];
  reviewStats: SyncReviewStat[];
}

export interface LocalSyncSnapshot {
  payload: SyncPayload;
  generation: number;
  pending: boolean;
}

const LEGACY_IMPORT_KEY = 'vocabflow.sync.legacy-imported-account';

export { getDatabaseScope };

export function subscribeToSyncChanges(listener: () => void): () => void {
  return subscribeSyncChanges(listener);
}

export function getLocalSyncState(): Promise<{ generation: number; pending: boolean }> {
  return getSyncQueueState();
}

export async function exportSyncSnapshot(): Promise<LocalSyncSnapshot> {
  return withSyncDatabase(async db => {
    const [words, deletedWords, courseProgress, courseSelections, reviewStats, state] = await Promise.all([
      db.getAllAsync<SyncWord>(`
        SELECT w.sync_id AS syncId, w.term, w.meaning, w.ipa, w.example, w.note,
          w.dictionary_entry_id AS dictionaryEntryId, w.dictionary_sense_id AS dictionarySenseId,
          w.created_at AS createdAt, w.updated_at AS contentUpdatedAt,
          p.review_count AS reviewCount, p.level, p.learned_on AS learnedOn,
          p.next_review_on AS nextReviewOn, p.completed AS completed,
          p.last_reviewed_on AS lastReviewedOn, p.frozen AS frozen,
          p.sync_updated_at AS progressUpdatedAt
        FROM words w JOIN word_progress p ON p.word_id = w.id
        ORDER BY w.sync_id
      `),
      db.getAllAsync<SyncDeletedWord>(`
        SELECT sync_id AS syncId, deleted_at AS deletedAt
        FROM sync_word_tombstones ORDER BY sync_id
      `),
      db.getAllAsync<SyncCourseProgress>(`
        SELECT lesson_id AS lessonId, current_index AS currentIndex, stage,
          completed_at AS completedAt, updated_at AS updatedAt
        FROM course_lesson_progress ORDER BY lesson_id
      `),
      db.getAllAsync<SyncCourseSelection>(`
        SELECT lesson_id AS lessonId, word_id AS wordId, selected, updated_at AS updatedAt
        FROM course_word_selection ORDER BY lesson_id, word_id
      `),
      db.getAllAsync<SyncReviewStat>(`
        SELECT device_id AS deviceId, review_day AS day, reviewed_count AS reviewedCount,
          correct_count AS correctCount, updated_at AS updatedAt
        FROM device_review_day_statistics ORDER BY review_day, device_id
      `),
      getSyncQueueStateFromDatabase(db),
    ]);
    return {
      payload: {
        words: words.map(word => ({ ...word, completed: Boolean(word.completed), frozen: Boolean(word.frozen) })),
        deletedWords,
        courseProgress,
        courseSelections: courseSelections.map(selection => ({
          ...selection,
          selected: Boolean(selection.selected),
        })),
        reviewStats,
      },
      generation: state.generation,
      pending: state.pending,
    };
  });
}

async function getSyncQueueStateFromDatabase(db: SQLiteDatabase): Promise<{ generation: number; pending: boolean }> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM sync_state WHERE key IN ('generation', 'pending')",
  );
  const values = new Map(rows.map(row => [row.key, row.value]));
  return {
    generation: Number(values.get('generation') ?? 0),
    pending: values.get('pending') === '1',
  };
}

export async function mergeSyncSnapshot(payload: SyncPayload): Promise<void> {
  await withSyncDatabase(async db => {
    await mergeSnapshotIntoDatabase(db, payload);
  });
  notifySyncApplied();
}

async function mergeSnapshotIntoDatabase(db: SQLiteDatabase, payload: SyncPayload): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const incoming of payload.words) {
      const tombstone = await db.getFirstAsync<{ deletedAt: string }>(
        'SELECT deleted_at AS deletedAt FROM sync_word_tombstones WHERE sync_id = ?',
        incoming.syncId,
      );
      const incomingLatest = maxDate(incoming.contentUpdatedAt, incoming.progressUpdatedAt);
      if (tombstone && tombstone.deletedAt >= incomingLatest) continue;

      if (tombstone) {
        await db.runAsync('DELETE FROM sync_word_tombstones WHERE sync_id = ?', incoming.syncId);
      }

      const current = await db.getFirstAsync<{
        id: number;
        contentUpdatedAt: string;
        progressUpdatedAt: string;
      }>(`
        SELECT w.id, w.updated_at AS contentUpdatedAt, p.sync_updated_at AS progressUpdatedAt
        FROM words w JOIN word_progress p ON p.word_id = w.id
        WHERE w.sync_id = ?
      `, incoming.syncId);

      if (!current) {
        const result = await db.runAsync(`
          INSERT INTO words
            (sync_id, term, normalized_term, meaning, normalized_meaning, ipa, example, note,
              created_at, updated_at, dictionary_entry_id, dictionary_sense_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          incoming.syncId, incoming.term, normalize(incoming.term), incoming.meaning, normalize(incoming.meaning),
          incoming.ipa, incoming.example, incoming.note, incoming.createdAt, incoming.contentUpdatedAt,
          incoming.dictionaryEntryId, incoming.dictionarySenseId,
        );
        await db.runAsync(`
          INSERT INTO word_progress
            (word_id, review_count, level, learned_on, next_review_on, completed,
              last_reviewed_on, frozen, sync_updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          result.lastInsertRowId, incoming.reviewCount, incoming.level, incoming.learnedOn,
          incoming.nextReviewOn, incoming.completed ? 1 : 0, incoming.lastReviewedOn,
          incoming.frozen ? 1 : 0, incoming.progressUpdatedAt,
        );
        continue;
      }

      if (incoming.contentUpdatedAt >= current.contentUpdatedAt) {
        await db.runAsync(`
          UPDATE words SET term = ?, normalized_term = ?, meaning = ?, normalized_meaning = ?,
            ipa = ?, example = ?, note = ?, created_at = MIN(created_at, ?), updated_at = ?,
            dictionary_entry_id = ?, dictionary_sense_id = ?
          WHERE id = ?
        `,
          incoming.term, normalize(incoming.term), incoming.meaning, normalize(incoming.meaning),
          incoming.ipa, incoming.example, incoming.note, incoming.createdAt, incoming.contentUpdatedAt,
          incoming.dictionaryEntryId, incoming.dictionarySenseId, current.id,
        );
      }
      if (incoming.progressUpdatedAt >= current.progressUpdatedAt) {
        await db.runAsync(`
          UPDATE word_progress SET review_count = ?, level = ?, learned_on = ?, next_review_on = ?,
            completed = ?, last_reviewed_on = ?, frozen = ?, sync_updated_at = ?
          WHERE word_id = ?
        `,
          incoming.reviewCount, incoming.level, incoming.learnedOn, incoming.nextReviewOn,
          incoming.completed ? 1 : 0, incoming.lastReviewedOn, incoming.frozen ? 1 : 0,
          incoming.progressUpdatedAt, current.id,
        );
      }
    }

    for (const incoming of payload.deletedWords) {
      const current = await db.getFirstAsync<{
        id: number;
        contentUpdatedAt: string;
        progressUpdatedAt: string;
      }>(`
        SELECT w.id, w.updated_at AS contentUpdatedAt, p.sync_updated_at AS progressUpdatedAt
        FROM words w JOIN word_progress p ON p.word_id = w.id
        WHERE w.sync_id = ?
      `, incoming.syncId);
      const localTombstone = await db.getFirstAsync<{ deletedAt: string }>(
        'SELECT deleted_at AS deletedAt FROM sync_word_tombstones WHERE sync_id = ?',
        incoming.syncId,
      );
      const currentLatest = current
        ? maxDate(current.contentUpdatedAt, current.progressUpdatedAt)
        : '';
      if (current && currentLatest > incoming.deletedAt) continue;
      if (localTombstone && localTombstone.deletedAt > incoming.deletedAt) continue;
      if (current) await db.runAsync('DELETE FROM words WHERE id = ?', current.id);
      await db.runAsync(`
        INSERT INTO sync_word_tombstones (sync_id, deleted_at) VALUES (?, ?)
        ON CONFLICT(sync_id) DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at)
      `, incoming.syncId, incoming.deletedAt);
    }

    for (const incoming of payload.courseProgress) {
      const current = await db.getFirstAsync<SyncCourseProgress>(`
        SELECT lesson_id AS lessonId, current_index AS currentIndex, stage,
          completed_at AS completedAt, updated_at AS updatedAt
        FROM course_lesson_progress WHERE lesson_id = ?
      `, incoming.lessonId);
      const completed = current?.stage === 'completed' || incoming.stage === 'completed';
      const currentIndex = Math.max(current?.currentIndex ?? 0, incoming.currentIndex);
      const selectedState = !current ||
        incoming.currentIndex > current.currentIndex ||
        (incoming.currentIndex === current.currentIndex && incoming.updatedAt >= current.updatedAt)
        ? incoming
        : current;
      const updatedAt = maxDate(current?.updatedAt ?? '', incoming.updatedAt);
      const completedAt = current?.completedAt ?? incoming.completedAt;
      await db.runAsync(`
        INSERT INTO course_lesson_progress
          (lesson_id, current_index, stage, completed_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(lesson_id) DO UPDATE SET
          current_index = excluded.current_index, stage = excluded.stage,
          completed_at = excluded.completed_at, updated_at = excluded.updated_at
      `,
        incoming.lessonId, currentIndex, completed ? 'completed' : selectedState.stage,
        completedAt, updatedAt,
      );
    }

    for (const incoming of payload.courseSelections) {
      const current = await db.getFirstAsync<{ selected: number; updatedAt: string }>(`
        SELECT selected, updated_at AS updatedAt FROM course_word_selection
        WHERE lesson_id = ? AND word_id = ?
      `, incoming.lessonId, incoming.wordId);
      if (current && current.updatedAt > incoming.updatedAt) continue;
      await db.runAsync(`
        INSERT INTO course_word_selection (lesson_id, word_id, selected, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(lesson_id, word_id) DO UPDATE SET
          selected = excluded.selected, updated_at = excluded.updated_at
      `, incoming.lessonId, incoming.wordId, incoming.selected ? 1 : 0, incoming.updatedAt);
    }

    for (const incoming of payload.reviewStats) {
      await db.runAsync(`
        INSERT INTO device_review_day_statistics
          (review_day, device_id, reviewed_count, correct_count, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(review_day, device_id) DO UPDATE SET
          reviewed_count = MAX(reviewed_count, excluded.reviewed_count),
          correct_count = MAX(correct_count, excluded.correct_count),
          updated_at = MAX(updated_at, excluded.updated_at)
      `, incoming.day, incoming.deviceId, incoming.reviewedCount, incoming.correctCount, incoming.updatedAt);
    }

    await db.runAsync('DELETE FROM review_day_statistics');
    await db.runAsync(`
      INSERT INTO review_day_statistics (review_day, reviewed_count, correct_count)
      SELECT review_day, SUM(reviewed_count), SUM(correct_count)
      FROM device_review_day_statistics GROUP BY review_day
    `);
  });
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function maxDate(left: string, right: string): string {
  return left >= right ? left : right;
}

export async function initializeAccountDatabase(accountId: string): Promise<void> {
  const currentScope = getDatabaseScope();
  if (currentScope === accountId) return;
  const importedFor = await AsyncStorage.getItem(LEGACY_IMPORT_KEY);

  if (currentScope === null && importedFor === null) {
    const guestSnapshot = await exportSyncSnapshot();
    await switchDatabaseScope(accountId);
    try {
      await mergeSyncSnapshot(guestSnapshot.payload);
      const hasLocalData = Object.values(guestSnapshot.payload).some(items => items.length > 0);
      if (hasLocalData) await markSyncPending();
      await AsyncStorage.setItem(LEGACY_IMPORT_KEY, accountId);
    } catch (error) {
      await switchDatabaseScope(null);
      throw error;
    }
    return;
  }

  await switchDatabaseScope(accountId);
}

export function activateGuestDatabase(): Promise<void> {
  return switchDatabaseScope(null);
}
