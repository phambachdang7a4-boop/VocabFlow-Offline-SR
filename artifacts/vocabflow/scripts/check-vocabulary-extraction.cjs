const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const root = join(__dirname, "..");
const stopWords = loadTs(join(root, "domain/english-stopwords.ts"));
const extraction = loadTs(join(root, "domain/vocabulary-extraction.ts"), {
  "./english-stopwords": stopWords,
});

function makeEntry(id, term, definition, pos = "n") {
  return {
    id,
    term,
    ipa: `/${term}/`,
    region: "US",
    senses: [
      { id: id * 10, definition, pos, subPos: null, example: null },
    ],
  };
}

async function checkLemmasAndAggregation() {
  const entries = new Map([
    ["student", makeEntry(1, "student", "Học sinh")],
    ["study", makeEntry(2, "study", "Học tập", "v")],
    ["run", makeEntry(3, "run", "Chạy", "v")],
    ["well-known", makeEntry(4, "well-known", "Nổi tiếng", "adj")],
  ]);
  const lookupCalls = [];
  const lookup = async (candidates) => {
    lookupCalls.push([...candidates]);
    return new Map(candidates.flatMap((candidate) => {
      const entry = entries.get(candidate);
      return entry ? [[candidate, entry]] : [];
    }));
  };
  const progress = [];
  const result = await extraction.extractVocabularyFromText(
    "The students studied. Students study. A runner is running; the child runs. A well-known name.",
    lookup,
    { onProgress: (value) => progress.push(value) },
  );
  const byTerm = new Map(result.map((item) => [item.term, item]));

  assert.equal(byTerm.get("student").count, 2, "Plural inflections group by dictionary headword.");
  assert.equal(byTerm.get("study").count, 2, "Past tense and exact form group together.");
  assert.equal(byTerm.get("run").count, 3, "Runner, running, and runs resolve to run.");
  assert.equal(byTerm.get("well-known").count, 1, "Internal hyphens stay inside tokens.");
  assert.equal(byTerm.get("student").sentence, "The students studied.");
  assert.ok(!byTerm.has("the"), "Bundled stopwords are excluded.");
  assert.ok(!byTerm.has("child"), "Words absent from the dictionary are excluded.");
  assert.ok(lookupCalls.length > 0);
  assert.ok(progress.some((item) => item.stage === "tokenizing"));
  assert.equal(progress.at(-1).percent, 100);
  assert.equal(progress.at(-1).stage, "complete");

  assert.ok(extraction.candidateLemmas("studies").includes("study"));
  assert.ok(extraction.candidateLemmas("studied").includes("study"));
  assert.ok(extraction.candidateLemmas("running").includes("run"));
  assert.ok(extraction.candidateLemmas("bigger").includes("big"));
  assert.ok(extraction.candidateLemmas("largest").includes("large"));
  assert.ok(extraction.candidateLemmas("happier").includes("happy"));
  assert.ok(extraction.candidateLemmas("happiest").includes("happy"));
  assert.ok(extraction.candidateLemmas("can't").includes("can't"));
  assert.deepEqual(extraction.candidateLemmas("went").slice(0, 2), ["went", "go"]);
  assert.deepEqual(extraction.candidateLemmas("children").slice(0, 2), ["children", "child"]);
  assert.deepEqual(extraction.candidateLemmas("better").slice(0, 2), ["better", "good"]);
  assert.ok(!extraction.candidateLemmas("saw").includes("see"), "Ambiguous saw is not guessed as see.");
  assert.ok(!extraction.candidateLemmas("left").includes("leave"), "Ambiguous left is not guessed as leave.");
  assert.ok(!extraction.candidateLemmas("rose").includes("rise"), "Ambiguous rose is not guessed as rise.");
  assert.deepEqual(extraction.candidateLemmas("constructor"), ["constructor"]);
  assert.equal(extraction.utf8ByteLength("English"), 7);
  assert.equal(extraction.utf8ByteLength("học"), 5);
  assert.equal(extraction.utf8ByteLength("Corvi 🐦"), 10);
}

async function checkIrregularFormsAndExactMatchPriority() {
  const entries = new Map([
    ["go", makeEntry(11, "go", "Đi", "v")],
    ["child", makeEntry(12, "child", "Trẻ em")],
    ["good", makeEntry(13, "good", "Tốt", "a")],
    ["see", makeEntry(15, "see", "Nhìn thấy", "v")],
    ["leave", makeEntry(16, "leave", "Rời đi", "v")],
    ["rise", makeEntry(17, "rise", "Mọc lên", "v")],
  ]);
  const lookup = async (candidates) =>
    new Map(candidates.flatMap((candidate) => {
      const entry = entries.get(candidate);
      return entry ? [[candidate, entry]] : [];
    }));

  const result = await extraction.extractVocabularyFromText(
    "She went home. The children went home. A better plan. Saw the sunrise, left a rose.",
    lookup,
  );
  const byTerm = new Map(result.map((item) => [item.term, item]));
  assert.equal(byTerm.get("go").count, 2, "Irregular verb forms group under go.");
  assert.equal(byTerm.get("child").count, 1, "Irregular plural resolves to child.");
  assert.equal(byTerm.get("good").count, 1, "Irregular comparative resolves to good.");
  assert.equal(byTerm.has("see"), false, "Ambiguous saw is not assigned to see.");
  assert.equal(byTerm.has("leave"), false, "Ambiguous left is not assigned to leave.");
  assert.equal(byTerm.has("rise"), false, "Ambiguous rose is not assigned to rise.");

  entries.set("went", makeEntry(14, "went", "Đã đi", "v"));
  const exact = await extraction.extractVocabularyFromText("went.", lookup);
  assert.equal(
    exact[0].term,
    "went",
    "An exact dictionary entry takes priority over its irregular root.",
  );
}

async function checkSavedWordsProgressAndInputLimits() {
  const student = makeEntry(1, "student", "Học sinh");
  const lookup = async (candidates) =>
    new Map(candidates.includes("student") ? [["student", student]] : []);
  const source = `${"students ".repeat(251)}.`;
  const progress = [];
  const visible = await extraction.extractVocabularyFromText(source, lookup, {
    existingTerms: new Set(["STUDENT"]),
    hideExisting: true,
    onProgress: (value) => progress.push(value),
  });
  assert.equal(visible.length, 0, "Saved terms are hidden case-insensitively.");

  const includeSaved = await extraction.extractVocabularyFromText(
    "Students appear here. ".repeat(20),
    lookup,
    { existingTerms: new Set(["student"]), hideExisting: false },
  );
  assert.equal(includeSaved[0].count, 20, "The hide-saved toggle preserves found entries.");

  const longInput = `${"students ".repeat(251)}.`;
  const longResult = await extraction.extractVocabularyFromText(longInput, lookup);
  assert.equal(longResult[0].count, 251);
  assert.equal(longResult[0].sentence.length, 200, "Source sentence is capped at 200 characters.");
  assert.ok(progress.some((item) => item.stage === "tokenizing"));

  await assert.rejects(
    extraction.extractVocabularyFromText(
      "",
      lookup,
    ),
    /Dán văn bản/,
  );
  await assert.rejects(
    extraction.extractVocabularyFromText(
      "x".repeat(extraction.MAX_EXTRACTION_TEXT_CHARACTERS + 1),
      lookup,
    ),
    /1 MB/,
  );
  await assert.rejects(
    extraction.extractVocabularyFromText("học ".repeat(230_000), lookup),
    /1 MB/,
    "UTF-8 byte size is checked, not only JavaScript character count.",
  );
}

async function checkLocalDictionaryLookup() {
  const calls = [];
  const rows = [
    {
      id: 2,
      term: "study",
      ipa: "/ˈstʌdi/",
      region: "US",
      senseId: 21,
      definition: "Học tập",
      pos: "v",
      subPos: null,
      example: "I study every day.",
    },
    {
      id: 2,
      term: "study",
      ipa: "/ˈstʌdi/",
      region: "US",
      senseId: 22,
      definition: "Nghiên cứu",
      pos: "n",
      subPos: null,
      example: null,
    },
  ];
  const database = {
    getAllAsync: async (sql, ...params) => {
      calls.push({ sql, params });
      return rows.filter((row) => params.includes(row.term));
    },
  };
  let openArgs;
  const dataLayer = loadTs(join(root, "data/vocabulary-extraction.ts"), {
    "./dictionary": {
      openDictionary: async (...args) => {
        openArgs = args;
        return database;
      },
    },
  });
  const results = await dataLayer.lookupDictionaryExtractionCandidates([
    "study",
    "STUDY",
    "unknown",
  ]);
  const study = results.get("study");

  assert.deepEqual(openArgs, [], "The dictionary is opened without download permission.");
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /FROM words w/);
  assert.match(calls[0].sql, /definition_lang = 'vi'/);
  assert.equal(study.id, 2);
  assert.equal(study.senses.length, 2, "All Vietnamese meanings are returned for expansion.");
  assert.equal(study.senses[0].example, "I study every day.");
  assert.equal(results.has("unknown"), false);

  const dataSource = readFileSync(join(root, "data/vocabulary-extraction.ts"), "utf8");
  assert.doesNotMatch(dataSource, /\bfetch\s*\(|axios|api-client/i);
}

function checkScreenWiring() {
  const screen = readFileSync(join(root, "app/extract.tsx"), "utf8");
  const dictionaryScreen = readFileSync(join(root, "app/(tabs)/dictionary.tsx"), "utf8");
  const layout = readFileSync(join(root, "app/_layout.tsx"), "utf8");
  assert.match(screen, /DocumentPicker\.getDocumentAsync/);
  assert.match(screen, /FileSystem\.EncodingType\.UTF8/);
  assert.match(screen, /MAX_EXTRACTION_FILE_BYTES/);
  assert.match(screen, /utf8ByteLength\(contents\)/);
  assert.match(screen, /saveWord\(\{ \.\.\.draft, example: result\.sentence \}\)/);
  assert.match(screen, /for \(const result of selectedResults\)/);
  assert.match(screen, /getDictionaryDraft/);
  assert.match(screen, /lookupDictionaryExtractionCandidates/);
  assert.doesNotMatch(screen, /100 từ của gói Free|\/100 chỗ|upgradeMessage|extract-upgrade/);
  assert.doesNotMatch(screen, /getAddableWordCount|FREE_WORD_LIMIT/);
  assert.match(screen, /không tự tải dữ liệu/);
  assert.match(screen, /không xử lý PDF/);
  assert.doesNotMatch(screen, /\bfetch\s*\(|axios|api-client|approveDownload/);
  assert.match(dictionaryScreen, /dictionary-open-extract/);
  assert.match(layout, /name="extract".*title: "Mắt Quạ"/);
  assert.doesNotMatch(screen, /deleteWord\(/);
}

async function main() {
  assert.ok(stopWords.ENGLISH_STOP_WORDS.size >= 290);
  assert.ok(stopWords.ENGLISH_STOP_WORDS.size <= 330);
  await checkLemmasAndAggregation();
  await checkIrregularFormsAndExactMatchPriority();
  await checkSavedWordsProgressAndInputLimits();
  await checkLocalDictionaryLookup();
  checkScreenWiring();
  console.log(
    `PASS: offline vocabulary extraction, lookup, progress, filtering, senses, and the ${stopWords.ENGLISH_STOP_WORDS.size}-word stop list.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
