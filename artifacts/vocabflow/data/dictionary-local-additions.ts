import type { SQLiteDatabase } from "expo-sqlite";
import { ALL_LOCAL_DICTIONARY_ADDITIONS } from "../domain/dictionary-local-additions";

export async function applyLocalDictionaryAdditions(
  db: SQLiteDatabase,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const entry of ALL_LOCAL_DICTIONARY_ADDITIONS) {
      const existingWord = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM words
         WHERE lang_code = 'en' AND LOWER(TRIM(word)) = LOWER(?) LIMIT 1`,
        entry.term,
      );
      if (existingWord) {
        const existingSense = await db.getFirstAsync<{ id: number }>(
          `SELECT wd.id
           FROM word_definitions wd
           JOIN definitions d ON d.id = wd.definition_id
           WHERE wd.word_id = ? AND d.definition = ? AND d.pos IS ?
              AND d.sub_pos IS ? AND wd.example = ? LIMIT 1`,
          existingWord.id,
          entry.definition,
          entry.pos,
          entry.subPos,
          entry.example,
        );
        if (!existingSense) {
          throw new Error(
            `Từ điển đã có mục "${entry.term}" với nội dung khác.`,
          );
        }
        continue;
      }

      const word = await db.runAsync(
        "INSERT INTO words (word, lang_code) VALUES (?, 'en')",
        entry.term,
      );
      const definition = await db.runAsync(
        `INSERT INTO definitions
          (definition, pos, sub_pos, definition_lang)
         VALUES (?, ?, ?, 'vi')`,
        entry.definition,
        entry.pos,
        entry.subPos,
      );
      await db.runAsync(
        `INSERT INTO word_definitions (word_id, definition_id, example)
         VALUES (?, ?, ?)`,
        word.lastInsertRowId,
        definition.lastInsertRowId,
        entry.example,
      );
    }
  });
}
