import type { SQLiteDatabase } from "expo-sqlite";
import {
  DICTIONARY,
  type DictionaryCourseIndex,
} from "../domain/dictionary";
import courseIndex from "../domain/course-dictionary-index.json";

const COURSE_INDEX = courseIndex as DictionaryCourseIndex;
export const COURSE_DICTIONARY_INDEX_REVISION = COURSE_INDEX.contentSha256;
export const COURSE_DICTIONARY_COURSES = COURSE_INDEX.courses;

function normalizedTerm(term: string): string {
  return term
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function normalizePartOfSpeech(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLocaleLowerCase("vi");
  const codes: Record<string, string> = {
    n: "n",
    noun: "n",
    name: "name",
    v: "v",
    verb: "v",
    vt: "vt",
    vi: "vi",
    "động từ": "v",
    "cụm động từ": "v",
    a: "a",
    adj: "a",
    adjective: "a",
    "tính từ": "a",
    d: "d",
    adv: "d",
    adverb: "d",
    "trạng từ": "d",
    e: "e",
    prep: "prep",
    preposition: "preposition",
    "giới từ": "e",
    c: "c",
    conj: "conj",
    conjunction: "conjunction",
    "liên từ": "c",
    m: "m",
    det: "det",
    determiner: "determiner",
    "từ hạn định": "determiner",
    idiom: "idiom",
    idioms: "idioms",
  };
  return codes[normalized] ?? null;
}

export async function applyCourseDictionaryIndex(
  db: SQLiteDatabase,
): Promise<void> {
  if (COURSE_INDEX.sourceSha256 !== DICTIONARY.sha256) {
    throw new Error(
      "Nhãn khóa học không khớp phiên bản từ điển. Hãy cập nhật dữ liệu khóa học.",
    );
  }

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS vocabflow_course_tags (
        word_id INTEGER NOT NULL,
        course_id TEXT NOT NULL,
        course_title TEXT NOT NULL,
        PRIMARY KEY (word_id, course_id)
      );
      CREATE INDEX IF NOT EXISTS idx_vocabflow_course_tags_word
        ON vocabflow_course_tags(word_id, course_id);
      DELETE FROM vocabflow_course_tags;
    `);

    const wordIdsByTerm = new Map<string, number[]>();
    const queryChunkSize = 350;
    for (
      let offset = 0;
      offset < COURSE_INDEX.terms.length;
      offset += queryChunkSize
    ) {
      const chunk = COURSE_INDEX.terms.slice(
        offset,
        offset + queryChunkSize,
      );
      const rows = await db.getAllAsync<{ id: number; word: string }>(
        `SELECT id, word FROM words
         WHERE lang_code = 'en'
           AND LOWER(TRIM(word)) IN (${chunk.map(() => "?").join(",")})`,
        ...chunk.map((term) => normalizedTerm(term.term)),
      );
      for (const row of rows) {
        const key = normalizedTerm(row.word);
        const ids = wordIdsByTerm.get(key) ?? [];
        ids.push(row.id);
        wordIdsByTerm.set(key, ids);
      }
    }

    const missingTerms = COURSE_INDEX.terms.filter(
      (term) => !wordIdsByTerm.has(normalizedTerm(term.term)),
    );
    for (let offset = 0; offset < missingTerms.length; offset += 250) {
      const chunk = missingTerms.slice(offset, offset + 250);
      await db.runAsync(
        `INSERT INTO words (word, lang_code) VALUES ${chunk
          .map(() => "(?, 'en')")
          .join(", ")}`,
        ...chunk.map((term) => term.term),
      );
    }

    for (
      let offset = 0;
      offset < missingTerms.length;
      offset += queryChunkSize
    ) {
      const chunk = missingTerms.slice(
        offset,
        offset + queryChunkSize,
      );
      const rows = await db.getAllAsync<{ id: number; word: string }>(
        `SELECT id, word FROM words
         WHERE lang_code = 'en'
           AND LOWER(TRIM(word)) IN (${chunk.map(() => "?").join(",")})`,
        ...chunk.map((term) => normalizedTerm(term.term)),
      );
      for (const row of rows) {
        const key = normalizedTerm(row.word);
        const ids = wordIdsByTerm.get(key) ?? [];
        ids.push(row.id);
        wordIdsByTerm.set(key, ids);
      }
    }

    const courseById = new Map(
      COURSE_INDEX.courses.map((course) => [course.id, course]),
    );
    for (const term of missingTerms) {
      const wordIds = wordIdsByTerm.get(normalizedTerm(term.term));
      if (!wordIds?.length) {
        throw new Error(`Không thể thêm mục khóa học "${term.term}" vào từ điển.`);
      }
      if (!term.senses?.length) {
        throw new Error(`Mục "${term.term}" chưa có nghĩa để thêm vào từ điển.`);
      }

      for (const wordId of wordIds) {
        for (const sense of term.senses) {
          const pos = normalizePartOfSpeech(sense.pos);
          const subPos = sense.subPos?.trim() || null;
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
            sense.example,
            sense.definition,
            pos,
            subPos,
          );
          if (existingSense?.exactExampleId != null) continue;

          const definitionId =
            existingSense?.definitionId ??
            (
              await db.runAsync(
                `INSERT INTO definitions
                  (definition, pos, sub_pos, definition_lang)
                 VALUES (?, ?, ?, 'vi')`,
                sense.definition,
                pos,
                subPos,
              )
            ).lastInsertRowId;
          await db.runAsync(
            `INSERT INTO word_definitions (word_id, definition_id, example)
             VALUES (?, ?, ?)`,
            wordId,
            definitionId,
            sense.example,
          );
        }
      }
    }

    const tagRows: Array<[number, string, string]> = [];
    for (const term of COURSE_INDEX.terms) {
      const wordIds = wordIdsByTerm.get(normalizedTerm(term.term));
      if (!wordIds?.length) {
        throw new Error(`Không tìm thấy mục "${term.term}" để gắn nhãn khóa học.`);
      }
      for (const courseId of term.courseIds) {
        const course = courseById.get(courseId);
        if (!course) {
          throw new Error(`Không tìm thấy khóa học có mã "${courseId}".`);
        }
        for (const wordId of wordIds) {
          tagRows.push([wordId, course.id, course.title]);
        }
      }
    }

    for (let offset = 0; offset < tagRows.length; offset += 250) {
      const chunk = tagRows.slice(offset, offset + 250);
      await db.runAsync(
        `INSERT OR IGNORE INTO vocabflow_course_tags
          (word_id, course_id, course_title)
         VALUES ${chunk.map(() => "(?, ?, ?)").join(", ")}`,
        ...chunk.flat(),
      );
    }
  });
}
