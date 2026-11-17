import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import { openai } from "@workspace/integrations-openai-ai-server";

type CandidateTopic = {
  id: string;
  title: string;
  focus: string;
  terms: string[];
};

type GeneratedEntry = {
  term: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  pos: "N" | "V" | "A" | "D" | "other";
};

const here = dirname(fileURLToPath(import.meta.url));
const defaultCandidatePath = resolve(here, "ielts-expansion-candidates.json");
const databasePath = resolve(
  here,
  "../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const defaultOutputPath = resolve(
  here,
  "../../generated-artifacts/ielts-expansion-ai.json",
);
const phrasalVerbDataPath = resolve(
  here,
  "../../artifacts/vocabflow/domain/phrasal-verb-course-data.json",
);
const defaultCheckpointPath = resolve(
  here,
  "../../generated-artifacts/ielts-expansion-ai-checkpoint.json",
);

const POS_CODES = new Set(["N", "V", "A", "D", "other"]);
const BATCH_SIZE = 8;

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    result.push(items.slice(offset, offset + size));
  }
  return result;
}

function containsExactHeadword(term: string, example: string): boolean {
  const escaped = term
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(example);
}

function parseResponse(content: string, expectedTerms: string[]): GeneratedEntry[] {
  const parsed = JSON.parse(content) as { entries?: unknown };
  if (!Array.isArray(parsed.entries)) {
    throw new Error("AI response did not contain an entries array.");
  }

  const entries = parsed.entries as GeneratedEntry[];
  const expected = new Set(expectedTerms);
  const received = new Set<string>();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.term !== "string" ||
      !expected.has(entry.term) ||
      received.has(entry.term) ||
      typeof entry.definition !== "string" ||
      typeof entry.example !== "string" ||
      typeof entry.exampleTranslation !== "string" ||
      !POS_CODES.has(entry.pos)
    ) {
      throw new Error("AI response had missing, duplicate, or invalid fields.");
    }
    if (!containsExactHeadword(entry.term, entry.example)) {
      throw new Error(`Example does not contain the requested headword: ${entry.term}`);
    }
    if (
      entry.definition.trim().length < 6 ||
      entry.exampleTranslation.trim().length < 6 ||
      entry.example.trim().split(/\s+/).length < 6
    ) {
      throw new Error(`AI response was too short for ${entry.term}.`);
    }
    received.add(entry.term);
  }

  if (received.size !== expected.size) {
    throw new Error("AI response omitted one or more requested headwords.");
  }
  return entries;
}

async function main() {
  const candidatePath = process.argv
    .find((argument) => argument.startsWith("--candidates="))
    ?.slice("--candidates=".length);
  const outputPath = process.argv
    .find((argument) => argument.startsWith("--output="))
    ?.slice("--output=".length);
  const checkpointPathArgument = process.argv
    .find((argument) => argument.startsWith("--checkpoint="))
    ?.slice("--checkpoint=".length);
  const allowMissingDictionaryHints = process.argv.includes(
    "--allow-missing-dictionary-hints",
  );
  const excludeReusablePhrasals = process.argv.includes(
    "--exclude-reusable-phrasals",
  );
  const resolvedCandidatePath = candidatePath
    ? resolve(process.cwd(), candidatePath)
    : defaultCandidatePath;
  const resolvedOutputPath = outputPath
    ? resolve(process.cwd(), outputPath)
    : defaultOutputPath;
  const checkpointPath = checkpointPathArgument
    ? resolve(process.cwd(), checkpointPathArgument)
    : defaultCheckpointPath;
  const { topics } = JSON.parse(await readFile(resolvedCandidatePath, "utf8")) as {
    topics: CandidateTopic[];
  };
  const phrasalCourseData = JSON.parse(
    await readFile(phrasalVerbDataPath, "utf8"),
  ) as {
    entries: Record<
      string,
      {
        definition: string;
        example: string;
        exampleTranslation?: string;
        partOfSpeech?: string;
      }
    >;
  };
  const db = new DatabaseSync(databasePath, { readOnly: true });
  const dictionaryHints = db.prepare(`
    SELECT d.pos, d.definition
    FROM words w
    JOIN word_definitions wd ON wd.word_id = w.id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE w.lang_code = 'en' AND d.definition_lang = 'vi'
      AND lower(w.word) = ?
    LIMIT 4
  `);

  const allCandidateRows = topics.flatMap((topic) =>
    topic.terms.map((term) => {
      const reusablePhrasal = phrasalCourseData.entries[term];
      if (excludeReusablePhrasals && reusablePhrasal) return null;
      const hints = dictionaryHints.all(term) as {
        pos: string | null;
        definition: string | null;
      }[];
      if (!hints.length && reusablePhrasal) {
        hints.push({
          pos: reusablePhrasal.partOfSpeech ?? "V",
          definition: reusablePhrasal.definition,
        });
      }
      if (!hints.length && !allowMissingDictionaryHints) {
        throw new Error(`Offline dictionary does not contain ${term}.`);
      }
      return {
        term,
        topic: topic.title,
        focus: topic.focus,
        dictionaryHints: hints.map((hint) => ({
          pos: hint.pos ?? "",
          meaning: hint.definition ?? "",
        })),
      };
    }).filter((candidate) => candidate !== null),
  );
  const requestedTerms = process.argv
    .find((argument) => argument.startsWith("--terms="))
    ?.slice("--terms=".length)
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
  const candidateRows = requestedTerms
    ? allCandidateRows.filter((candidate) =>
        requestedTerms.includes(candidate.term),
      )
    : allCandidateRows;
  if (
    candidateRows.length !== (requestedTerms?.length ?? allCandidateRows.length)
  ) {
    throw new Error("A requested incremental headword is missing or repeated.");
  }
  const finalOutputPath = outputPath
    ? resolvedOutputPath
    : requestedTerms
    ? resolve(here, "../../generated-artifacts/ielts-expansion-ai-additions.json")
    : resolvedOutputPath;
  db.close();

  const chunks = batches(candidateRows, BATCH_SIZE);
  const checkpointTerms = candidateRows.map((candidate) => candidate.term);
  const checkpoint = new Map<number, GeneratedEntry[]>();
  try {
    const saved = JSON.parse(await readFile(checkpointPath, "utf8")) as {
      terms?: string[];
      batches?: Record<string, GeneratedEntry[]>;
    };
    if (JSON.stringify(saved.terms) !== JSON.stringify(checkpointTerms)) {
      throw new Error(
        "Saved content-generation checkpoint belongs to a different term list.",
      );
    }
    for (const [rawIndex, entries] of Object.entries(saved.batches ?? {})) {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0 || index >= chunks.length) {
        throw new Error("Saved content-generation checkpoint has an invalid batch index.");
      }
      checkpoint.set(
        index,
        parseResponse(
          JSON.stringify({ entries }),
          chunks[index].map((item) => item.term),
        ),
      );
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }

  let checkpointWriteQueue = Promise.resolve();
  const persistCheckpoint = () => {
    checkpointWriteQueue = checkpointWriteQueue.then(async () => {
      await mkdir(dirname(checkpointPath), { recursive: true });
      await writeFile(
        checkpointPath,
        `${JSON.stringify({
          terms: checkpointTerms,
          batches: Object.fromEntries(checkpoint),
        })}\n`,
        "utf8",
      );
    });
    return checkpointWriteQueue;
  };
  const pendingBatches = chunks
    .map((items, index) => ({ items, index }))
    .filter(({ index }) => !checkpoint.has(index));
  await batchProcess(
    pendingBatches,
    async ({ items, index }) => {
      const expectedTerms = items.map((item) => item.term);
      let entries: GeneratedEntry[] | null = null;
      let validationError: Error | null = null;
      for (let attempt = 1; attempt <= 3 && !entries; attempt++) {
        const response = await openai.chat.completions.create({
          model: "gpt-5.6-luna",
          max_completion_tokens: 8192,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an experienced English-Vietnamese IELTS reading vocabulary editor. Write accurate, concise learner-facing content. Do not copy source texts. Return valid JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify({
                task: "Create one high-quality IELTS-reading vocabulary entry for each requested English headword.",
                requirements: [
                  "Use the supplied topic and dictionary hints to select the relevant sense; correct a bad hint if needed.",
                  "Write a concise, accurate Vietnamese definition, not merely a transliteration.",
                  "Write one original, natural English example of 8-20 words in an academic or factual reading context.",
                  "Use the exact headword in the example, with ordinary capitalization.",
                  "For a phrasal verb, use its exact phrase unchanged; prefer an imperative or infinitive if needed to preserve the exact form.",
                  "Translate the entire example naturally into Vietnamese, preserving its meaning and participants.",
                  "Choose pos as one of N, V, A, D, or other (noun, verb, adjective, adverb, or other).",
                  "Do not add facts, extra vocabulary entries, alternative spellings, or IELTS band claims.",
                ],
                validationFeedback:
                  validationError && attempt > 1
                    ? `The previous output was invalid: ${validationError.message}. Return a corrected complete entries array.`
                    : undefined,
                requiredJsonShape: {
                  entries: [
                    {
                      term: "exact requested headword",
                      definition: "Vietnamese definition",
                      example: "Original English sentence",
                      exampleTranslation: "Full Vietnamese translation",
                      pos: "N | V | A | D | other",
                    },
                  ],
                },
                entries: items,
              }),
            },
          ],
        });
        const content = response.choices[0]?.message?.content ?? "";
        try {
          entries = parseResponse(content, expectedTerms);
        } catch (error) {
          validationError =
            error instanceof Error ? error : new Error(String(error));
          if (attempt === 3) throw validationError;
          console.warn(
            `Retrying batch ${index + 1} after validation: ${validationError.message}`,
          );
        }
      }
      if (!entries) {
        throw validationError ?? new Error(`No valid content for batch ${index + 1}.`);
      }
      checkpoint.set(index, entries);
      await persistCheckpoint();
      console.log(`Generated batch ${index + 1}/${chunks.length} (${entries.length} terms).`);
      return entries;
    },
    {
      concurrency: 2,
      retries: 5,
      minTimeout: 1500,
      maxTimeout: 30000,
      onProgress: (completed, total) => {
        console.log(`AI batches completed: ${completed}/${total}`);
      },
    },
  );

  const entries = chunks.flatMap((_, index) => checkpoint.get(index) ?? []);
  if (entries.length !== candidateRows.length) {
    throw new Error(
      `Expected ${candidateRows.length} generated entries, got ${entries.length}.`,
    );
  }
  await mkdir(dirname(finalOutputPath), { recursive: true });
  await writeFile(
    finalOutputPath,
    `${JSON.stringify({ model: "gpt-5.6-luna", entries }, null, 2)}\n`,
    "utf8",
  );
  await rm(checkpointPath, { force: true });
  console.log(`Saved ${entries.length} entries for review.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "IELTS generation failed.");
  process.exitCode = 1;
});
