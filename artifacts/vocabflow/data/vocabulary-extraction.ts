import { openDictionary } from "./dictionary";
import type {
  ExtractionDictionaryEntry,
  ExtractionDictionarySense,
} from "../domain/vocabulary-extraction";

interface ExtractionRow {
  id: number;
  term: string;
  ipa: string | null;
  region: string | null;
  senseId: number | null;
  definition: string | null;
  pos: string | null;
  subPos: string | null;
  example: string | null;
}

const CANDIDATE_BATCH_SIZE = 250;

export async function lookupDictionaryExtractionCandidates(
  candidates: readonly string[],
): Promise<ReadonlyMap<string, ExtractionDictionaryEntry>> {
  const uniqueCandidates = [...new Set(
    candidates
      .map((candidate) => candidate.trim().toLocaleLowerCase("en"))
      .filter((candidate) => /^[\p{L}]+(?:['’\-][\p{L}]+)*$/u.test(candidate)),
  )];
  const entries = new Map<string, ExtractionDictionaryEntry>();
  if (uniqueCandidates.length === 0) return entries;

  // openDictionary uses the installed SQLite file and does not download unless
  // the separate dictionary-consent action explicitly allows it.
  const db = await openDictionary();
  for (
    let start = 0;
    start < uniqueCandidates.length;
    start += CANDIDATE_BATCH_SIZE
  ) {
    const batch = uniqueCandidates.slice(start, start + CANDIDATE_BATCH_SIZE);
    const rows = await db.getAllAsync<ExtractionRow>(
      `SELECT w.id, w.word AS term,
         (SELECT p.ipa FROM pronunciations p
          WHERE p.word_id = w.id ORDER BY p.id LIMIT 1) AS ipa,
         (SELECT p.region FROM pronunciations p
          WHERE p.word_id = w.id ORDER BY p.id LIMIT 1) AS region,
         wd.id AS senseId, d.definition, d.pos, d.sub_pos AS subPos,
         wd.example
       FROM words w
       JOIN word_definitions wd ON wd.word_id = w.id
       JOIN definitions d ON d.id = wd.definition_id
       WHERE w.lang_code = 'en' AND d.definition_lang = 'vi'
         AND w.word COLLATE NOCASE IN (${batch.map(() => "?").join(",")})
       ORDER BY w.word COLLATE NOCASE, wd.id`,
      ...batch,
    );

    for (const row of rows) {
      const key = row.term.toLocaleLowerCase("en");
      let entry = entries.get(key);
      if (!entry) {
        entry = {
          id: row.id,
          term: row.term,
          ipa: row.ipa ?? "",
          region: row.region,
          senses: [],
        };
        entries.set(key, entry);
      }
      if (
        row.senseId !== null &&
        row.definition !== null &&
        !entry.senses.some((sense) => sense.id === row.senseId)
      ) {
        const sense: ExtractionDictionarySense = {
          id: row.senseId,
          definition: row.definition,
          pos: row.pos,
          subPos: row.subPos,
          example: row.example,
        };
        entry.senses.push(sense);
      }
    }
  }
  return entries;
}
