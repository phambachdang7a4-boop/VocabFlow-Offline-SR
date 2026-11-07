import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DICTIONARY_PAGE_SIZE, dictionaryDraft, lookupPrefix, validDictionaryId,
  type DictionaryEntry, type DictionaryMatch, type DictionaryMatches, type DictionaryPronunciation, type DictionarySense,
} from '../domain/dictionary';

function checkPage(offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
    throw new Error('Trang từ điển không hợp lệ.');
  }
}
function checkId(id: number) {
  if (!validDictionaryId(id)) throw new Error('Mã từ điển không hợp lệ.');
}

export async function searchInDictionary(db: SQLiteDatabase, query: string, offset = 0): Promise<DictionaryMatches> {
  checkPage(offset);
  if (!query.trim()) return { items: [], hasMore: false };
  if (query.length > 200) throw new Error('Từ tra cứu tối đa 200 ký tự.');
  const rows = await db.getAllAsync<DictionaryMatch>(
    `SELECT w.id, w.word AS term,
       COALESCE((SELECT d.definition FROM word_definitions wd JOIN definitions d ON d.id = wd.definition_id
         WHERE wd.word_id = w.id ORDER BY wd.id LIMIT 1), '') AS meaning
     FROM words w WHERE w.word LIKE ? ESCAPE '\\'
     ORDER BY w.word COLLATE NOCASE, w.id LIMIT ? OFFSET ?`,
    `${lookupPrefix(query)}%`, DICTIONARY_PAGE_SIZE + 1, offset,
  );
  return { items: rows.slice(0, DICTIONARY_PAGE_SIZE), hasMore: rows.length > DICTIONARY_PAGE_SIZE };
}

export async function entryInDictionary(db: SQLiteDatabase, id: number, offset = 0): Promise<DictionaryEntry> {
  checkId(id);
  checkPage(offset);
  const word = await db.getFirstAsync<{ id: number; term: string }>('SELECT id, word AS term FROM words WHERE id = ?', id);
  if (!word) throw new Error('Không tìm thấy từ trong kho tra cứu.');
  const pronunciations = await db.getAllAsync<DictionaryPronunciation>(
    'SELECT ipa, region FROM pronunciations WHERE word_id = ? ORDER BY id', id,
  );
  const senses = await db.getAllAsync<DictionarySense>(
    `SELECT wd.id, d.definition, d.pos, d.sub_pos AS subPos, wd.example
     FROM word_definitions wd JOIN definitions d ON d.id = wd.definition_id
     WHERE wd.word_id = ? ORDER BY wd.id LIMIT ? OFFSET ?`,
    id, DICTIONARY_PAGE_SIZE + 1, offset,
  );
  return { ...word, pronunciations, senses: senses.slice(0, DICTIONARY_PAGE_SIZE), hasMore: senses.length > DICTIONARY_PAGE_SIZE };
}

export async function draftInDictionary(db: SQLiteDatabase, id: number, senseId: number) {
  checkId(id);
  checkId(senseId);
  const word = await db.getFirstAsync<{ term: string }>('SELECT word AS term FROM words WHERE id = ?', id);
  const sense = await db.getFirstAsync<DictionarySense>(
    `SELECT wd.id, d.definition, d.pos, d.sub_pos AS subPos, wd.example
     FROM word_definitions wd JOIN definitions d ON d.id = wd.definition_id
     WHERE wd.word_id = ? AND wd.id = ?`, id, senseId,
  );
  if (!word || !sense) throw new Error('Không tìm thấy nghĩa đã chọn trong kho tra cứu.');
  const pronunciations = await db.getAllAsync<DictionaryPronunciation>(
    'SELECT ipa, region FROM pronunciations WHERE word_id = ? ORDER BY id LIMIT 1', id,
  );
  return dictionaryDraft({ ...word, pronunciations }, sense);
}
