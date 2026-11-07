import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { VocabularyWord, WordInput } from './types';
import { applyReview, freezeProgress, initialProgress, localDay, rescheduleProgress, unfreezeProgress, type SrsProgress } from '../domain/srs';

let connection: Promise<SQLiteDatabase> | undefined;

export function normalizeTerm(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

async function initialize(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('vocabflow.db');
  try {
    await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 4) {
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
        const existing = await db.getAllAsync<{ id: number; createdAt: string }>(
          'SELECT id, created_at AS createdAt FROM words',
        );
        for (const word of existing) {
          const progress = initialProgress(localDay(new Date(word.createdAt)));
          await db.runAsync(
            'UPDATE word_progress SET learned_on = ?, next_review_on = ? WHERE word_id = ?',
            progress.learnedOn, progress.nextReviewOn, word.id,
          );
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
          const progress = rescheduleProgress({ ...row, completed: row.completed === 1 });
          await db.runAsync(
            'UPDATE word_progress SET next_review_on = ? WHERE word_id = ?',
            progress.nextReviewOn, row.wordId,
          );
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

// Serialize operations so reads cannot observe a partially applied write.
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => undefined);
  return result;
}

export function listWords(): Promise<VocabularyWord[]> {
  return serialize(async () => {
    const db = await database();
    const rows = await db.getAllAsync<Omit<VocabularyWord, 'completed' | 'frozen'> & { completed: number; frozen: number }>(`
      SELECT w.id, w.term, w.meaning, w.ipa, w.example, w.note,
        w.created_at AS createdAt, w.updated_at AS updatedAt,
        p.review_count AS reviewCount, p.level, p.learned_on AS learnedOn,
        p.next_review_on AS nextReviewOn, p.completed, p.last_reviewed_on AS lastReviewedOn, p.frozen
      FROM words w JOIN word_progress p ON p.word_id = w.id
      ORDER BY w.created_at DESC, w.id DESC
    `);
    return rows.map(row => ({ ...row, completed: row.completed === 1, frozen: row.frozen === 1 }));
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
    if (clean.term.length > 200 || clean.meaning.length > 2000 ||
        clean.ipa.length > 200 || clean.example.length > 4000 || clean.note.length > 4000) {
      throw new Error('Nội dung quá dài. Từ và IPA tối đa 200 ký tự, nghĩa 2.000, ví dụ và ghi chú 4.000.');
    }
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
      throw new Error('Mã từ không hợp lệ.');
    }
    const db = await database();
    const key = normalizeTerm(clean.term);
    const duplicate = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM words WHERE normalized_term = ? AND id != ?', key, id ?? -1,
    );
    if (duplicate) throw new Error('Từ này đã có trong danh sách. Hãy sửa từ đã lưu.');
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      if (id !== undefined) {
        const result = await db.runAsync(
          `UPDATE words SET term = ?, normalized_term = ?, meaning = ?, ipa = ?,
            example = ?, note = ?, updated_at = ? WHERE id = ?`,
          clean.term, key, clean.meaning, clean.ipa, clean.example, clean.note, now, id,
        );
        if (result.changes === 0) throw new Error('Từ này không còn tồn tại.');
      } else {
        const result = await db.runAsync(
          `INSERT INTO words (term, normalized_term, meaning, ipa, example, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          clean.term, key, clean.meaning, clean.ipa, clean.example, clean.note, now, now,
        );
        const progress = initialProgress(localDay(new Date(now)));
        await db.runAsync(
          'INSERT INTO word_progress (word_id, learned_on, next_review_on) VALUES (?, ?, ?)',
          result.lastInsertRowId, progress.learnedOn, progress.nextReviewOn,
        );
      }
    });
  });
}

/** Atomically validate the displayed revision and persist a single answer. */
export function recordReview(id: number, correct: boolean, expectedReviewCount: number): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1 || typeof correct !== 'boolean' ||
        !Number.isSafeInteger(expectedReviewCount) || expectedReviewCount < 0) {
      throw new Error('Câu trả lời không hợp lệ.');
    }
    const db = await database();
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<Omit<VocabularyWord, 'completed' | 'frozen'> & { completed: number; frozen: number }>(
        `SELECT level, learned_on AS learnedOn, next_review_on AS nextReviewOn, completed, frozen,
           review_count AS reviewCount, last_reviewed_on AS lastReviewedOn
         FROM word_progress WHERE word_id = ?`, id,
      );
      if (!row) throw new Error('Từ này không còn tồn tại.');
      if (row.frozen) throw new Error('Từ này đã đóng băng, không thể chấm điểm ôn tập.');
      if (row.reviewCount !== expectedReviewCount) {
        throw new Error('Tiến độ từ đã thay đổi. Hãy tải lại danh sách ôn.');
      }
      const next = applyReview({ ...row, completed: row.completed === 1, frozen: row.frozen === 1 }, correct, localDay(new Date()));
      const result = await db.runAsync(
        `UPDATE word_progress SET learned_on = ?, level = ?, next_review_on = ?, completed = ?,
           review_count = ?, last_reviewed_on = ? WHERE word_id = ? AND review_count = ?`,
        next.learnedOn, next.level, next.nextReviewOn, next.completed ? 1 : 0, next.reviewCount,
        next.lastReviewedOn, id, expectedReviewCount,
      );
      if (result.changes !== 1) throw new Error('Tiến độ từ đã thay đổi. Hãy tải lại danh sách ôn.');
    });
  });
}

export function setWordFrozen(id: number, frozen: boolean): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1 || typeof frozen !== 'boolean') {
      throw new Error('Trạng thái đóng băng không hợp lệ.');
    }
    const db = await database();
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<Omit<SrsProgress, 'completed' | 'frozen'> & { completed: number; frozen: number }>(
        `SELECT level, learned_on AS learnedOn, next_review_on AS nextReviewOn, completed, frozen,
           review_count AS reviewCount, last_reviewed_on AS lastReviewedOn
         FROM word_progress WHERE word_id = ?`, id,
      );
      if (!row) throw new Error('Từ này không còn tồn tại.');
      if ((row.frozen === 1) === frozen) return;
      const state = { ...row, completed: row.completed === 1, frozen: row.frozen === 1 };
      const next = frozen ? freezeProgress(state) : unfreezeProgress(state, localDay(new Date()));
      await db.runAsync(
        'UPDATE word_progress SET frozen = ?, level = ?, next_review_on = ?, completed = ? WHERE word_id = ?',
        frozen ? 1 : 0, next.level, next.nextReviewOn, next.completed ? 1 : 0, id,
      );
    });
  });
}

export function deleteWord(id: number): Promise<void> {
  return serialize(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Mã từ không hợp lệ.');
    const db = await database();
    const result = await db.runAsync('DELETE FROM words WHERE id = ?', id);
    if (!result.changes) throw new Error('Từ này không còn tồn tại.');
  });
}
