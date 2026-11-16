import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const candidatePath = resolve(here, "ielts-expansion-candidates.json");
const databasePath = resolve(
  here,
  "../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const outputPath = resolve(
  here,
  "../../generated-artifacts/ielts-expansion-ai.json",
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
    if (!entry.example.toLowerCase().includes(entry.term.toLowerCase())) {
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
  const { topics } = JSON.parse(await readFile(candidatePath, "utf8")) as {
    topics: CandidateTopic[];
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
      const hints = dictionaryHints.all(term) as {
        pos: string | null;
        definition: string | null;
      }[];
      if (!hints.length) {
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
    }),
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
  const finalOutputPath = requestedTerms
    ? resolve(here, "../../generated-artifacts/ielts-expansion-ai-additions.json")
    : outputPath;
  db.close();

  const chunks = batches(candidateRows, BATCH_SIZE);
  const generated = await batchProcess(
    chunks,
    async (items, index) => {
      const expectedTerms = items.map((item) => item.term);
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
                "Translate the entire example naturally into Vietnamese, preserving its meaning and participants.",
                "Choose pos as one of N, V, A, D, or other (noun, verb, adjective, adverb, or other).",
                "Do not add facts, extra vocabulary entries, alternative spellings, or IELTS band claims.",
              ],
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
      const entries = parseResponse(content, expectedTerms);
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

  const entries = generated.flat();
  if (entries.length !== candidateRows.length) {
    throw new Error(
      `Expected ${candidateRows.length} generated entries, got ${entries.length}.`,
    );
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    finalOutputPath,
    `${JSON.stringify({ model: "gpt-5.6-luna", entries }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Saved ${entries.length} entries for review.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "IELTS generation failed.");
  process.exitCode = 1;
});
