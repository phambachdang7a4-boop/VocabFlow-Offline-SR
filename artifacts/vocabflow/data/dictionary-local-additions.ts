import type { SQLiteDatabase } from "expo-sqlite";
import { ALL_LOCAL_DICTIONARY_ADDITIONS } from "../domain/dictionary-local-additions";

export async function applyLocalDictionaryAdditions(
  db: SQLiteDatabase,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const terms = [
      ...new Set(
        ALL_LOCAL_DICTIONARY_ADDITIONS.map((entry) =>
          entry.term.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"),
        ),
      ),
    ];
    const wordIds = new Map<string, number>();
    const queryChunkSize = 400;
    for (let offset = 0; offset < terms.length; offset += queryChunkSize) {
      const chunk = terms.slice(offset, offset + queryChunkSize);
      const rows = await db.getAllAsync<{ id: number; word: string }>(
        `SELECT id, word FROM words
         WHERE lang_code = 'en'
           AND LOWER(TRIM(word)) IN (${chunk.map(() => "?").join(",")})`,
        ...chunk,
      );
      for (const row of rows) {
        wordIds.set(
          row.word.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"),
          row.id,
        );
      }
    }

    for (const entry of ALL_LOCAL_DICTIONARY_ADDITIONS) {
      const termKey = entry.term
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("en");
      let wordId = wordIds.get(termKey);
      const wordAlreadyExists = wordId !== undefined;

      if (!wordAlreadyExists) {
        const word = await db.runAsync(
          "INSERT INTO words (word, lang_code) VALUES (?, 'en')",
          entry.term,
        );
        wordId = word.lastInsertRowId;
        wordIds.set(termKey, wordId);
      }
      if (wordId === undefined) {
        throw new Error(`Không thể tạo mục từ điển cho "${entry.term}".`);
      }

      const existingSense = await db.getFirstAsync<{
        definitionId: number;
        exactExampleId: number | null;
      }>(
        `SELECT d.id AS definitionId,
           (SELECT wd.id FROM word_definitions wd
            WHERE wd.word_id = ? AND wd.definition_id = d.id
              AND wd.example = ? LIMIT 1) AS exactExampleId
         FROM definitions d
         WHERE d.definition = ? AND d.pos IS ? AND d.sub_pos IS ?
         LIMIT 1`,
        wordId,
        entry.example,
        entry.definition,
        entry.pos,
        entry.subPos,
      );
      if (existingSense?.exactExampleId != null) continue;

      if (wordAlreadyExists && !entry.allowAdditionalSenses) {
        const priorLocalSense = await db.getFirstAsync<{
          wordDefinitionId: number;
        }>(
          `SELECT wd.id AS wordDefinitionId
           FROM word_definitions wd
           JOIN definitions d ON d.id = wd.definition_id
           WHERE wd.word_id = ? AND wd.example = ?
             AND d.pos IS ? AND d.sub_pos IS ?
           LIMIT 1`,
          wordId,
          entry.example,
          entry.pos,
          entry.subPos,
        );
        if (priorLocalSense) {
          let definitionId = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM definitions
             WHERE definition = ? AND pos IS ? AND sub_pos IS ?
             LIMIT 1`,
            entry.definition,
            entry.pos,
            entry.subPos,
          ).then((row) => row?.id);
          if (definitionId === undefined) {
            definitionId = (
              await db.runAsync(
                `INSERT INTO definitions
                  (definition, pos, sub_pos, definition_lang)
                 VALUES (?, ?, ?, 'vi')`,
                entry.definition,
                entry.pos,
                entry.subPos,
              )
            ).lastInsertRowId;
          }
          const update = await db.runAsync(
            "UPDATE word_definitions SET definition_id = ? WHERE id = ?",
            definitionId,
            priorLocalSense.wordDefinitionId,
          );
          if (update.changes !== 1) {
            throw new Error(
              `Không thể cập nhật nghĩa từ điển cho "${entry.term}".`,
            );
          }
          continue;
        }
        throw new Error(
          `Từ điển đã có mục "${entry.term}" với nội dung khác.`,
        );
      }

      const definitionId =
        existingSense?.definitionId ??
        (
          await db.runAsync(
            `INSERT INTO definitions
              (definition, pos, sub_pos, definition_lang)
             VALUES (?, ?, ?, 'vi')`,
            entry.definition,
            entry.pos,
            entry.subPos,
          )
        ).lastInsertRowId;

      await db.runAsync(
        `INSERT INTO word_definitions (word_id, definition_id, example)
         VALUES (?, ?, ?)`,
        wordId,
        definitionId,
        entry.example,
      );
    }
  });
}
