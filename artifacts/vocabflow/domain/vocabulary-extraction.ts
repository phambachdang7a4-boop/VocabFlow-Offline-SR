import { ENGLISH_STOP_WORDS } from "./english-stopwords";

export const MAX_EXTRACTION_TEXT_CHARACTERS = 1_000_000;
export const MAX_EXTRACTION_TEXT_BYTES = 1_048_576;
const SENTENCE_PATTERN = /[^.!?\r\n]+(?:[.!?]+)?|[.!?]+/gu;
const TOKEN_PATTERN = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;
const CONTEXT_WORD_PATTERN = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;
const WORK_BATCH_SIZE = 250;
const LOOKUP_BATCH_SIZE = 120;

const IRREGULAR_LEMMAS: Readonly<Record<string, string>> = {
  went: "go",
  gone: "go",
  ran: "run",
  did: "do",
  done: "do",
  had: "have",
  has: "have",
  made: "make",
  took: "take",
  taken: "take",
  came: "come",
  got: "get",
  gotten: "get",
  knew: "know",
  known: "know",
  gave: "give",
  given: "give",
  wrote: "write",
  written: "write",
  ate: "eat",
  eaten: "eat",
  drank: "drink",
  drunk: "drink",
  spoke: "speak",
  spoken: "speak",
  broke: "break",
  broken: "break",
  chose: "choose",
  chosen: "choose",
  drove: "drive",
  driven: "drive",
  flew: "fly",
  flown: "fly",
  grew: "grow",
  grown: "grow",
  threw: "throw",
  thrown: "throw",
  began: "begin",
  begun: "begin",
  sang: "sing",
  sung: "sing",
  fell: "fall",
  fallen: "fall",
  built: "build",
  bought: "buy",
  brought: "bring",
  caught: "catch",
  taught: "teach",
  thought: "think",
  slept: "sleep",
  kept: "keep",
  lost: "lose",
  paid: "pay",
  sold: "sell",
  told: "tell",
  won: "win",
  held: "hold",
  met: "meet",
  understood: "understand",
  stood: "stand",
  sat: "sit",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  feet: "foot",
  teeth: "tooth",
  mice: "mouse",
  geese: "goose",
  better: "good",
  best: "good",
  worse: "bad",
  worst: "bad",
};

export interface ExtractionDictionarySense {
  id: number;
  definition: string;
  pos: string | null;
  subPos: string | null;
  example: string | null;
}

export interface ExtractionDictionaryEntry {
  id: number;
  term: string;
  ipa: string;
  region: string | null;
  senses: ExtractionDictionarySense[];
}

export interface ExtractedVocabularyTerm {
  term: string;
  count: number;
  sentence: string;
  entry: ExtractionDictionaryEntry;
}

export function chooseExtractionSenses(
  senses: readonly ExtractionDictionarySense[],
  selectedSenseIds: ReadonlySet<number> | undefined,
  savedSenseIds: ReadonlySet<number>,
): ExtractionDictionarySense[] {
  if (selectedSenseIds?.size) {
    return senses.filter(
      (sense) =>
        selectedSenseIds.has(sense.id) && !savedSenseIds.has(sense.id),
    );
  }
  const firstAvailable = senses.find((sense) => !savedSenseIds.has(sense.id));
  return firstAvailable ? [firstAvailable] : [];
}

export interface ExtractionProgress {
  stage: "tokenizing" | "looking-up" | "complete";
  percent: number;
  processed: number;
  total: number;
}

export type ExtractionLookup = (
  candidates: readonly string[],
) => Promise<ReadonlyMap<string, ExtractionDictionaryEntry>>;

interface RawWordCount {
  count: number;
  sentence: string;
}

function usableExampleContext(sentence: string): boolean {
  return [...sentence.matchAll(CONTEXT_WORD_PATTERN)].length >= 3;
}

function addCandidate(candidates: string[], candidate: string): void {
  if (candidate.length >= 2 && !candidates.includes(candidate)) {
    candidates.push(candidate);
  }
}

function addDoubledConsonantCandidate(
  candidates: string[],
  stem: string,
): void {
  addCandidate(candidates, stem);
  if (
    stem.length > 2 &&
    stem.at(-1) === stem.at(-2) &&
    !/[aeiou]/.test(stem.at(-1) ?? "")
  ) {
    addCandidate(candidates, stem.slice(0, -1));
  }
}

/** Exact spelling wins, followed by curated irregular roots and regular suffixes. */
export function candidateLemmas(value: string): string[] {
  const token = value.toLocaleLowerCase("en");
  const candidates = [token];
  const add = (candidate: string) => addCandidate(candidates, candidate);

  // "Does" can be either a form of "do" or the plural of "doe".
  // Without context, keep only the exact form rather than guessing.
  if (token === "does") return candidates;

  const irregularLemma = Object.prototype.hasOwnProperty.call(
    IRREGULAR_LEMMAS,
    token,
  )
    ? IRREGULAR_LEMMAS[token]
    : undefined;
  if (irregularLemma) add(irregularLemma);

  if (token.endsWith("ies") && token.length > 4) {
    add(`${token.slice(0, -3)}y`);
  }
  if (token.endsWith("ves") && token.length > 4) {
    add(`${token.slice(0, -3)}f`);
    add(`${token.slice(0, -3)}fe`);
  }
  if (token.endsWith("es") && token.length > 4) {
    add(token.slice(0, -2));
  }
  if (token.endsWith("s") && token.length > 3 && !token.endsWith("ss")) {
    add(token.slice(0, -1));
  }

  if (token.endsWith("ied") && token.length > 4) {
    add(`${token.slice(0, -3)}y`);
  }
  if (token.endsWith("ed") && token.length > 4) {
    const stem = token.slice(0, -2);
    addDoubledConsonantCandidate(candidates, stem);
    add(`${stem}e`);
    if (stem.endsWith("i")) add(`${stem.slice(0, -1)}y`);
  }
  if (token.endsWith("ing") && token.length > 5) {
    const stem = token.slice(0, -3);
    addDoubledConsonantCandidate(candidates, stem);
    add(`${stem}e`);
    if (stem.endsWith("y")) add(stem);
  }
  if (token.endsWith("er") && token.length > 4) {
    const stem = token.slice(0, -2);
    addDoubledConsonantCandidate(candidates, stem);
    add(`${stem}e`);
    if (stem.endsWith("i")) add(`${stem.slice(0, -1)}y`);
  }
  if (token.endsWith("est") && token.length > 5) {
    const stem = token.slice(0, -3);
    addDoubledConsonantCandidate(candidates, stem);
    add(`${stem}e`);
    if (stem.endsWith("i")) add(`${stem.slice(0, -1)}y`);
  }
  if (token.endsWith("ly") && token.length > 4) {
    const stem = token.slice(0, -2);
    add(stem);
    if (stem.endsWith("i")) add(`${stem.slice(0, -1)}y`);
  }
  if (token.endsWith("ness") && token.length > 6) {
    const stem = token.slice(0, -4);
    add(stem);
    if (stem.endsWith("i")) add(`${stem.slice(0, -1)}y`);
  }

  return candidates;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function report(
  callback: ((progress: ExtractionProgress) => void) | undefined,
  stage: ExtractionProgress["stage"],
  percent: number,
  processed: number,
  total: number,
): void {
  callback?.({
    stage,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    processed,
    total,
  });
}

export async function extractVocabularyFromText(
  sourceText: string,
  lookup: ExtractionLookup,
  options: {
    existingTerms?: ReadonlySet<string>;
    hideExisting?: boolean;
    onProgress?: (progress: ExtractionProgress) => void;
  } = {},
): Promise<ExtractedVocabularyTerm[]> {
  if (!sourceText.trim()) throw new Error("Dán văn bản hoặc chọn tệp TXT trước.");
  if (
    sourceText.length > MAX_EXTRACTION_TEXT_CHARACTERS ||
    utf8ByteLength(sourceText) > MAX_EXTRACTION_TEXT_BYTES
  ) {
    throw new Error("Văn bản quá lớn. Giới hạn là 1 MB.");
  }

  const rawCounts = new Map<string, RawWordCount>();
  const sentenceMatcher = sourceText.matchAll(SENTENCE_PATTERN);
  let tokenizedCount = 0;
  let lastTokenizedProgress = -1;
  let lastYieldedPosition = 0;

  for (const sentenceMatch of sentenceMatcher) {
    const sentence = sentenceMatch[0].trim();
    const sentenceEnd =
      (sentenceMatch.index ?? 0) + sentenceMatch[0].length;
    if (!sentence) {
      if (sentenceEnd - lastYieldedPosition >= 32_000) {
        const percent = (sentenceEnd / sourceText.length) * 35;
        report(
          options.onProgress,
          "tokenizing",
          percent,
          sentenceEnd,
          sourceText.length,
        );
        lastTokenizedProgress = Math.floor(percent);
        lastYieldedPosition = sentenceEnd;
        await yieldToUi();
      }
      continue;
    }
    TOKEN_PATTERN.lastIndex = 0;
    for (const tokenMatch of sentence.matchAll(TOKEN_PATTERN)) {
      const token = tokenMatch[0].toLocaleLowerCase("en");
      tokenizedCount += 1;
      if (!ENGLISH_STOP_WORDS.has(token)) {
        const current = rawCounts.get(token);
        if (current) {
          current.count += 1;
          if (!current.sentence && usableExampleContext(sentence)) {
            current.sentence = sentence.slice(0, 200);
          }
        } else {
          rawCounts.set(token, {
            count: 1,
            sentence: usableExampleContext(sentence)
              ? sentence.slice(0, 200)
              : "",
          });
        }
      }

      if (tokenizedCount % WORK_BATCH_SIZE === 0) {
        const position = (sentenceMatch.index ?? 0) + tokenMatch.index + token.length;
        const percent = (position / sourceText.length) * 35;
        if (Math.floor(percent) !== lastTokenizedProgress) {
          report(options.onProgress, "tokenizing", percent, position, sourceText.length);
          lastTokenizedProgress = Math.floor(percent);
        }
        await yieldToUi();
        lastYieldedPosition = position;
      }
    }
    if (sentenceEnd - lastYieldedPosition >= 32_000) {
      const percent = (sentenceEnd / sourceText.length) * 35;
      report(
        options.onProgress,
        "tokenizing",
        percent,
        sentenceEnd,
        sourceText.length,
      );
      lastTokenizedProgress = Math.floor(percent);
      lastYieldedPosition = sentenceEnd;
      await yieldToUi();
    }
  }
  report(options.onProgress, "tokenizing", 35, sourceText.length, sourceText.length);

  const rawWords = [...rawCounts.keys()];
  const resolved = new Map<string, ExtractedVocabularyTerm>();
  for (
    let start = 0;
    start < rawWords.length;
    start += LOOKUP_BATCH_SIZE
  ) {
    const batch = rawWords.slice(start, start + LOOKUP_BATCH_SIZE);
    const candidates = [...new Set(batch.flatMap(candidateLemmas))];
    const dictionaryWords = await lookup(candidates);

    for (const rawWord of batch) {
      const found = candidateLemmas(rawWord).find((candidate) =>
        dictionaryWords.has(candidate),
      );
      if (!found) continue;
      const entry = dictionaryWords.get(found);
      if (!entry || entry.senses.length === 0) continue;
      const key = entry.term.toLocaleLowerCase("en");
      const raw = rawCounts.get(rawWord)!;
      const current = resolved.get(key);
      if (current) {
        current.count += raw.count;
        if (!current.sentence && raw.sentence) current.sentence = raw.sentence;
      }
      else {
        resolved.set(key, {
          term: entry.term,
          count: raw.count,
          sentence: raw.sentence,
          entry,
        });
      }
    }

    const completed = Math.min(start + batch.length, rawWords.length);
    report(
      options.onProgress,
      "looking-up",
      35 + (completed / Math.max(rawWords.length, 1)) * 65,
      completed,
      rawWords.length,
    );
    await yieldToUi();
  }

  const existing = new Set(
    [...(options.existingTerms ?? [])].map((term) =>
      term.normalize("NFKC").trim().toLocaleLowerCase("en"),
    ),
  );
  const results = [...resolved.values()].filter(
    (result) =>
      !options.hideExisting ||
      !existing.has(result.term.toLocaleLowerCase("en")),
  );
  report(options.onProgress, "complete", 100, rawWords.length, rawWords.length);
  return results;
}
