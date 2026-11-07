import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DICTIONARY_PAGE_SIZE, DICTIONARY_PARTS, dictionaryDraft, lookupPrefix, validDictionaryId,
  type DictionaryEntry, type DictionaryMatch, type DictionaryMatches, type DictionaryPronunciation, type DictionarySense, type DictionarySuggestion, type DictionaryPartOfSpeech,
} from '../domain/dictionary';
import { canSuggest, rankSuggestions, spellingVariants, suggestionTerm } from '../domain/dictionary-suggestions';

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

// Codes and IDs are trusted constants, never user input. Both filtering and
// available options share this classification; unknown/empty tags are Others.
const PART_SQL = `CASE ${DICTIONARY_PARTS.filter(part => part.id !== 'other').map(part =>
  `WHEN LOWER(TRIM(COALESCE(d.pos, ''))) IN (${part.codes.map(code => `'${code}'`).join(',')}) THEN '${part.id}'`,
).join(' ')} ELSE 'other' END`;

export async function entryInDictionary(db: SQLiteDatabase, id: number, offset = 0, parts: DictionaryPartOfSpeech[] | 'first' = []): Promise<DictionaryEntry> {
  checkId(id);
  checkPage(offset);
  if (parts !== 'first' && (!Array.isArray(parts) || parts.length > DICTIONARY_PARTS.length
    || parts.some(value => !DICTIONARY_PARTS.some(part => part.id === value)))) {
    throw new Error('Bộ lọc từ loại không hợp lệ.');
  }
  const word = await db.getFirstAsync<{ id: number; term: string }>('SELECT id, word AS term FROM words WHERE id = ?', id);
  if (!word) throw new Error('Không tìm thấy từ trong kho tra cứu.');
  const pronunciations = await db.getAllAsync<DictionaryPronunciation>(
    'SELECT ipa, region FROM pronunciations WHERE word_id = ? ORDER BY id', id,
  );
  const available = await db.getAllAsync<{ part: DictionaryPartOfSpeech }>(
    `SELECT ${PART_SQL} AS part
     FROM word_definitions wd JOIN definitions d ON d.id = wd.definition_id WHERE wd.word_id = ?
     GROUP BY part ORDER BY MIN(wd.id)`, id,
  );
  const selected = parts === 'first' ? available.slice(0, 1).map(row => row.part) : [...new Set(parts)];
  const senses = await db.getAllAsync<DictionarySense>(
    `SELECT wd.id, d.definition, d.pos, d.sub_pos AS subPos, wd.example
     FROM word_definitions wd JOIN definitions d ON d.id = wd.definition_id
     WHERE wd.word_id = ? ${selected.length ? `AND (${PART_SQL}) IN (${selected.map(() => '?').join(',')})` : ''}
     ORDER BY wd.id LIMIT ? OFFSET ?`,
    id, ...selected, DICTIONARY_PAGE_SIZE + 1, offset,
  );
  return { ...word, pronunciations, senses: senses.slice(0, DICTIONARY_PAGE_SIZE), hasMore: senses.length > DICTIONARY_PAGE_SIZE,
    partsOfSpeech: available.map(row => row.part) };
}

export async function suggestInDictionary(db: SQLiteDatabase, query: string): Promise<DictionarySuggestion[]> {
  const term = suggestionTerm(query);
  if (!canSuggest(term)) return [];
  const candidates: DictionarySuggestion[] = [];
  const variants = spellingVariants(term);
  // Keep bind counts below SQLite's conservative parameter limit.
  for (let start = 0; start < variants.length; start += 160) {
    const batch = variants.slice(start, start + 160);
    candidates.push(...await db.getAllAsync<DictionarySuggestion>(
      `SELECT id, word AS term FROM words
       WHERE word COLLATE NOCASE IN (${batch.map(() => '?').join(',')})
       ORDER BY word COLLATE NOCASE, id LIMIT 160`,
      ...batch,
    ));
  }
  // Two bounded indexed prefix ranges cover common two-edit suffix mistakes.
  // Ranking runs only on this small pool, never all 104k dictionary words.
  for (const prefix of new Set([term.slice(0, 3), term.slice(0, 2)])) {
    candidates.push(...await db.getAllAsync<DictionarySuggestion>(
      `SELECT id, word AS term FROM words
       WHERE word LIKE ? ESCAPE '\\' AND LENGTH(word) BETWEEN ? AND ?
       ORDER BY ABS(LENGTH(word) - ?), word COLLATE NOCASE, id LIMIT 192`,
      `${lookupPrefix(prefix)}%`, Math.max(1, term.length - 2), term.length + 2, term.length,
    ));
  }
  return rankSuggestions(term, candidates);
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
