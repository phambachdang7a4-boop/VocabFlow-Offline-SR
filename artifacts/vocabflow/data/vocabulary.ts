import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { VocabularyWord, WordInput } from './types';

let connection: Promise<SQLiteDatabase> | undefined;

export function normalizeTerm(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

async function initialize(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('vocabflow.db');
  try {
    await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 1) {
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
    return db.getAllAsync<VocabularyWord>(`
      SELECT w.id, w.term, w.meaning, w.ipa, w.example, w.note,
        w.created_at AS createdAt, w.updated_at AS updatedAt,
        COALESCE(p.review_count, 0) AS reviewCount
      FROM words w LEFT JOIN word_progress p ON p.word_id = w.id
      ORDER BY w.created_at DESC, w.id DESC
    `);
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
        await db.runAsync('INSERT INTO word_progress (word_id) VALUES (?)', result.lastInsertRowId);
      }
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
