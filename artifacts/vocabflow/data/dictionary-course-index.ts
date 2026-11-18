import type { SQLiteDatabase } from "expo-sqlite";
import {
  DICTIONARY,
  type DictionaryCourseIndex,
} from "../domain/dictionary";
import {
  COURSE_DICTIONARY_COURSES,
  TOEIC_TOPIC_COURSE_ID,
} from "../domain/course-ids";
import type { OfflineCourseEntry } from "./offline-course-data";

export { COURSE_DICTIONARY_COURSES };

export function courseDictionaryIndexRevision(
  courseIndex: DictionaryCourseIndex | null,
): string {
  return courseIndex?.contentSha256 ?? "course-index-not-installed";
}

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
    phrase: "phrase",
  };
  return codes[normalized] ?? null;
}

export async function applyCourseDictionaryIndex(
  db: SQLiteDatabase,
  courseIndex: DictionaryCourseIndex,
  toeicEntriesByTerm: Readonly<Record<string, OfflineCourseEntry>> = {},
): Promise<void> {
  if (courseIndex.sourceSha256 !== DICTIONARY.sha256) {
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
      offset < courseIndex.terms.length;
      offset += queryChunkSize
    ) {
      const chunk = courseIndex.terms.slice(
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

    const missingTerms = courseIndex.terms.filter(
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
      courseIndex.courses.map((course) => [course.id, course]),
    );
    const senseKey = (
      definition: string,
      pos: string | null,
      subPos: string | null,
    ) => JSON.stringify([definition, pos, subPos]);
    const definitionsByKey = new Map<
      string,
      { definition: string; pos: string | null; subPos: string | null; id?: number }
    >();
    const sensesByTerm = new Map<
      string,
      Array<{ definitionKey: string; example: string }>
    >();
    const toeicLinks: Array<{
      wordId: number;
      definitionKey: string;
      example: string;
    }> = [];
    const normalizedToeicEntries = new Map(
      Object.entries(toeicEntriesByTerm).map(([term, entry]) => [
        normalizedTerm(term),
        entry,
      ]),
    );

    for (const term of missingTerms) {
      const wordIds = wordIdsByTerm.get(normalizedTerm(term.term));
      if (!wordIds?.length) {
        throw new Error(`Không thể thêm mục khóa học "${term.term}" vào từ điển.`);
      }
      if (!term.senses?.length) {
        throw new Error(`Mục "${term.term}" chưa có nghĩa để thêm vào từ điển.`);
      }

      const senses = term.senses.map((sense) => {
        const pos = normalizePartOfSpeech(sense.pos);
        const subPos = sense.subPos?.trim() || null;
        const definitionKey = senseKey(sense.definition, pos, subPos);
        if (!definitionsByKey.has(definitionKey)) {
          definitionsByKey.set(definitionKey, {
            definition: sense.definition,
            pos,
            subPos,
          });
        }
        return { definitionKey, example: sense.example };
      });
      sensesByTerm.set(normalizedTerm(term.term), senses);
    }

    for (const term of courseIndex.terms) {
      if (!term.courseIds.includes(TOEIC_TOPIC_COURSE_ID)) continue;
      const entry = normalizedToeicEntries.get(normalizedTerm(term.term));
      if (!entry?.definition?.trim()) continue;
      const definition = entry.definition.trim();
      const definitionKey = senseKey(definition, "phrase", null);
      if (!definitionsByKey.has(definitionKey)) {
        definitionsByKey.set(definitionKey, {
          definition,
          pos: "phrase",
          subPos: null,
        });
      }
      const wordIds = wordIdsByTerm.get(normalizedTerm(term.term)) ?? [];
      for (const wordId of wordIds) {
        toeicLinks.push({
          wordId,
          definitionKey,
          example: entry.example?.trim() ?? "",
        });
      }
    }

    // Look up existing shared definitions in bounded batches rather than making
    // one SQLite worker round-trip for every course-only term.
    const uniqueDefinitions = [...definitionsByKey.values()];
    const definitionBatchSize = 200;
    for (
      let offset = 0;
      offset < uniqueDefinitions.length;
      offset += definitionBatchSize
    ) {
      const chunk = uniqueDefinitions.slice(
        offset,
        offset + definitionBatchSize,
      );
      const rows = await db.getAllAsync<{
        id: number;
        definition: string;
        pos: string | null;
        sub_pos: string | null;
      }>(
        `WITH incoming(definition, pos, sub_pos) AS (
           VALUES ${chunk.map(() => "(?, ?, ?)").join(", ")}
         )
         SELECT d.id, incoming.definition, incoming.pos, incoming.sub_pos
         FROM incoming
         JOIN definitions d
           ON d.definition = incoming.definition
          AND d.pos IS incoming.pos
          AND d.sub_pos IS incoming.sub_pos`,
        ...chunk.flatMap((sense) => [
          sense.definition,
          sense.pos,
          sense.subPos,
        ]),
      );
      for (const row of rows) {
        const key = senseKey(row.definition, row.pos, row.sub_pos);
        const existing = definitionsByKey.get(key);
        if (existing && existing.id === undefined) existing.id = row.id;
      }
    }

    const definitionsToInsert = uniqueDefinitions.filter(
      (sense) => sense.id === undefined,
    );
    for (
      let offset = 0;
      offset < definitionsToInsert.length;
      offset += definitionBatchSize
    ) {
      const chunk = definitionsToInsert.slice(
        offset,
        offset + definitionBatchSize,
      );
      const rows = await db.getAllAsync<{
        id: number;
        definition: string;
        pos: string | null;
        sub_pos: string | null;
      }>(
        `INSERT INTO definitions
           (definition, pos, sub_pos, definition_lang)
         VALUES ${chunk.map(() => "(?, ?, ?, 'vi')").join(", ")}
         RETURNING id, definition, pos, sub_pos`,
        ...chunk.flatMap((sense) => [
          sense.definition,
          sense.pos,
          sense.subPos,
        ]),
      );
      for (const row of rows) {
        const key = senseKey(row.definition, row.pos, row.sub_pos);
        const inserted = definitionsByKey.get(key);
        if (inserted) inserted.id = row.id;
      }
    }

    const links: Array<[number, number, string]> = [];
    for (const term of missingTerms) {
      const wordIds = wordIdsByTerm.get(normalizedTerm(term.term))!;
      const senses = sensesByTerm.get(normalizedTerm(term.term))!;
      for (const wordId of wordIds) {
        for (const sense of senses) {
          const definitionId = definitionsByKey.get(sense.definitionKey)?.id;
          if (definitionId === undefined) {
            throw new Error(
              `Không thể thêm nghĩa khóa học cho "${term.term}" vào từ điển.`,
            );
          }
          links.push([wordId, definitionId, sense.example]);
        }
      }
    }
    for (let offset = 0; offset < links.length; offset += 250) {
      const chunk = links.slice(offset, offset + 250);
      await db.runAsync(
        `INSERT INTO word_definitions (word_id, definition_id, example)
         VALUES ${chunk.map(() => "(?, ?, ?)").join(", ")}`,
        ...chunk.flat(),
      );
    }

    for (let offset = 0; offset < toeicLinks.length; offset += 100) {
      const chunk = toeicLinks.slice(offset, offset + 100);
      const linkRows: Array<{
        wordId: number;
        definitionId: number;
        example: string;
      }> = chunk.map((link) => {
        const definitionId = definitionsByKey.get(link.definitionKey)?.id;
        if (definitionId === undefined) {
          throw new Error("Không thể ghép nghĩa của cụm từ TOEIC vào từ điển.");
        }
        return { wordId: link.wordId, definitionId, example: link.example };
      });
      await db.runAsync(
        `WITH incoming(word_id, definition_id, example) AS (
           VALUES ${linkRows.map(() => "(?, ?, ?)").join(", ")}
         )
         INSERT INTO word_definitions (word_id, definition_id, example)
         SELECT incoming.word_id, incoming.definition_id, incoming.example
         FROM incoming
         WHERE NOT EXISTS (
           SELECT 1 FROM word_definitions existing
           WHERE existing.word_id = incoming.word_id
             AND existing.definition_id = incoming.definition_id
             AND existing.example = incoming.example
         )`,
        ...linkRows.flatMap((link) => [
          link.wordId,
          link.definitionId,
          link.example,
        ]),
      );
    }

    const tagRows: Array<[number, string, string]> = [];
    for (const term of courseIndex.terms) {
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
