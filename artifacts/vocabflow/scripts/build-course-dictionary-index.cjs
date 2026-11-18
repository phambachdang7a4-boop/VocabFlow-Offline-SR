const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const { dirname, extname, join, resolve } = require("node:path");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");
const { loadDictionaryDomain } = require("./test-support.cjs");

const domainPath = join(__dirname, "../domain");
const outputPath = join(domainPath, "course-dictionary-index.json");
const reviewExcludedTermsPath = join(
  domainPath,
  "review-excluded-course-terms.json",
);
const sourcePath = resolve(
  __dirname,
  "../../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const modules = new Map();

function resolveImport(parentPath, request) {
  if (!request.startsWith(".")) return request;
  const base = resolve(dirname(parentPath), request);
  if (extname(base)) return base;
  for (const extension of [".ts", ".tsx", ".json", ".js"]) {
    try {
      require.resolve(base + extension);
      return base + extension;
    } catch {
      // Try the next supported project source extension.
    }
  }
  for (const extension of [".ts", ".tsx", ".json", ".js"]) {
    try {
      require.resolve(join(base, "index" + extension));
      return join(base, "index" + extension);
    } catch {
      // Try the next supported project source extension.
    }
  }
  throw new Error(`Không tìm thấy module ${request} trong ${parentPath}.`);
}

function loadTypeScriptModule(filePath) {
  const absolutePath = resolve(filePath);
  if (absolutePath.endsWith(".json")) return require(absolutePath);
  const cached = modules.get(absolutePath);
  if (cached) return cached.exports;

  const module = { exports: {} };
  modules.set(absolutePath, module);
  const source = readFileSync(absolutePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: absolutePath,
  }).outputText;
  const localRequire = (request) =>
    request.startsWith(".")
      ? loadTypeScriptModule(resolveImport(absolutePath, request))
      : require(request);
  new Function("require", "exports", "module", compiled)(
    localRequire,
    module.exports,
    module,
  );
  return module.exports;
}

function entriesOf(entries) {
  if (entries instanceof Map) return [...entries.entries()];
  return Object.entries(entries ?? {});
}

function normalizeTerm(term) {
  return term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function cleanSense(entry) {
  const definition = typeof entry?.definition === "string"
    ? entry.definition.trim()
    : "";
  if (!definition) return null;
  return {
    definition,
    example: typeof entry.example === "string" ? entry.example.trim() : "",
    pos: entry.pos ?? entry.partOfSpeech ?? null,
    subPos: entry.subPos ?? null,
  };
}

function uniqueSenses(senses) {
  const seen = new Set();
  return senses.filter((sense) => {
    const key = [
      sense.definition,
      sense.example,
      sense.pos ?? "",
      sense.subPos ?? "",
    ].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildIndex() {
  const domain = loadDictionaryDomain();
  const sourceBytes = readFileSync(sourcePath);
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  assert.equal(
    sourceSha256,
    domain.DICTIONARY.sha256,
    "Database nguồn không trùng phiên bản từ điển đang khai báo.",
  );

  const basic = loadTypeScriptModule(join(domainPath, "basic-vocabulary-course.ts"));
  const idioms = loadTypeScriptModule(join(domainPath, "idiom-course.ts"));
  const phrasalVerbs = loadTypeScriptModule(join(domainPath, "phrasal-verb-course.ts"));
  const conjunctions = loadTypeScriptModule(join(domainPath, "conjunction-course.ts"));
  const linkingAdverbs = loadTypeScriptModule(join(domainPath, "linking-adverb-course.ts"));
  const sentencePatterns = loadTypeScriptModule(join(domainPath, "sentence-structure-patterns.ts"));
  const ielts = loadTypeScriptModule(join(domainPath, "ielts-topic-course.ts"));
  const toeic = loadTypeScriptModule(join(domainPath, "toeic-topic-course.ts"));
  const office = loadTypeScriptModule(join(domainPath, "office-apps-course.ts"));

  const courses = [
    {
      id: basic.BASIC_VOCABULARY_COURSE_ID,
      title: basic.BASIC_VOCABULARY_COURSE_TITLE,
      entries: basic.BASIC_VOCABULARY_COURSE_ENTRIES,
      lessons: basic.BASIC_VOCABULARY_COURSE_LESSONS,
    },
    {
      id: idioms.IDIOM_COURSE_ID,
      title: idioms.IDIOM_COURSE_TITLE,
      entries: idioms.IDIOM_COURSE_ENTRIES,
      lessons: idioms.IDIOM_COURSE_LESSONS,
    },
    {
      id: phrasalVerbs.PHRASAL_VERB_COURSE_ID,
      title: phrasalVerbs.PHRASAL_VERB_COURSE_TITLE,
      entries: phrasalVerbs.PHRASAL_VERB_COURSE_ENTRIES,
      lessons: phrasalVerbs.PHRASAL_VERB_COURSE_LESSONS,
    },
    {
      id: conjunctions.CONJUNCTION_COURSE_ID,
      title: conjunctions.CONJUNCTION_COURSE_TITLE,
      entries: new Map([
        ...entriesOf(conjunctions.CONJUNCTION_COURSE_ENTRY_BY_TERM),
        ...entriesOf(linkingAdverbs.LINKING_ADVERB_COURSE_ENTRIES),
        ...entriesOf(sentencePatterns.SENTENCE_STRUCTURE_PATTERN_ENTRIES),
      ]),
      lessons: [
        ...conjunctions.CONJUNCTION_COURSE_LESSONS,
        ...linkingAdverbs.LINKING_ADVERB_COURSE_LESSONS,
        ...sentencePatterns.SENTENCE_STRUCTURE_PATTERN_LESSONS,
      ],
    },
    {
      id: ielts.IELTS_TOPIC_COURSE_ID,
      title: ielts.IELTS_TOPIC_COURSE_TITLE,
      entries: ielts.IELTS_TOPIC_COURSE_ENTRIES,
      lessons: ielts.IELTS_TOPIC_COURSE_LESSONS,
    },
    {
      id: ielts.IELTS_ADVANCED_COURSE_ID,
      title: ielts.IELTS_ADVANCED_COURSE_TITLE,
      entries: ielts.IELTS_ADVANCED_COURSE_ENTRIES,
      lessons: ielts.IELTS_ADVANCED_COURSE_LESSONS,
    },
    {
      id: toeic.TOEIC_TOPIC_COURSE_ID,
      title: toeic.TOEIC_TOPIC_COURSE_TITLE,
      entries: toeic.TOEIC_TOPIC_COURSE_ENTRIES,
      lessons: toeic.TOEIC_TOPIC_COURSE_LESSONS,
    },
    {
      id: office.OFFICE_APPS_COURSE_ID,
      title: office.OFFICE_APPS_COURSE_TITLE,
      entries: office.OFFICE_APPS_COURSE_ENTRIES,
      lessons: office.OFFICE_APPS_COURSE_LESSONS,
    },
  ];

  const termMap = new Map();
  for (const course of courses) {
    for (const [rawTerm, rawEntry] of entriesOf(course.entries)) {
      const term = rawTerm.normalize("NFKC").trim().replace(/\s+/g, " ");
      if (!term) continue;
      const key = normalizeTerm(term);
      const row = termMap.get(key) ?? {
        term,
        courseIds: [],
        lessonIdsByCourse: {},
        senses: [],
      };
      if (!row.courseIds.includes(course.id)) row.courseIds.push(course.id);
      const lessonIds = course.lessons
        .filter((lesson) =>
          lesson.questions.some(
            (question) => normalizeTerm(question.term) === key,
          ),
        )
        .map((lesson) => lesson.id);
      if (lessonIds.length) {
        row.lessonIdsByCourse[course.id] = [
          ...new Set([...(row.lessonIdsByCourse[course.id] ?? []), ...lessonIds]),
        ];
      }
      const sense = cleanSense(rawEntry);
      if (sense) row.senses.push(sense);
      termMap.set(key, row);
    }
  }

  const database = new DatabaseSync(sourcePath, { readOnly: true });
  let baseTerms;
  try {
    baseTerms = new Set(
      database
        .prepare("SELECT word FROM words WHERE lang_code = 'en'")
        .all()
        .map((row) => normalizeTerm(row.word)),
    );
  } finally {
    database.close();
  }

  const terms = [...termMap.values()]
    .sort((left, right) => left.term.localeCompare(right.term, "en"))
    .map((row) => {
      const term = {
        term: row.term,
        courseIds: row.courseIds.sort(),
        lessonIdsByCourse: Object.fromEntries(
          Object.entries(row.lessonIdsByCourse)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([courseId, lessonIds]) => [
              courseId,
              [...new Set(lessonIds)].sort(),
            ]),
        ),
      };
      if (!baseTerms.has(normalizeTerm(row.term))) {
        const senses = uniqueSenses(row.senses);
        assert.ok(
          senses.length > 0,
          `Từ/cụm khóa học "${row.term}" chưa có trong từ điển nhưng không có nghĩa.`,
        );
        term.senses = senses;
      }
      return term;
    });

  const payload = {
    sourceSha256,
    courses: courses.map(({ id, title }) => ({ id, title })),
    terms,
  };
  const contentSha256 = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return {
    index: { ...payload, contentSha256 },
    missingTerms: terms.filter((term) => term.senses).length,
    reviewExcludedTerms: [
      ...new Set([
        ...entriesOf(conjunctions.CONJUNCTION_COURSE_ENTRY_BY_TERM).map(
          ([term]) => term,
        ),
        ...entriesOf(linkingAdverbs.LINKING_ADVERB_COURSE_ENTRIES).map(
          ([term]) => term,
        ),
        ...entriesOf(sentencePatterns.SENTENCE_STRUCTURE_PATTERN_ENTRIES).map(
          ([term]) => term,
        ),
      ]),
    ].sort((left, right) => left.localeCompare(right, "en")),
  };
}

const { index, missingTerms, reviewExcludedTerms } = buildIndex();
const output = `${JSON.stringify(index)}\n`;
const reviewExcludedTermsOutput = `${JSON.stringify(reviewExcludedTerms, null, 2)}\n`;
if (process.argv.includes("--check")) {
  let current = "";
  let currentReviewExcludedTerms = "";
  try {
    current = readFileSync(outputPath, "utf8");
  } catch {
    // The check reports a missing generated index below.
  }
  try {
    currentReviewExcludedTerms = readFileSync(reviewExcludedTermsPath, "utf8");
  } catch {
    // The check reports missing generated review terms below.
  }
  assert.equal(
    current,
    output,
    "course-dictionary-index.json đã cũ; chạy course:build-dictionary-index.",
  );
  assert.equal(
    currentReviewExcludedTerms,
    reviewExcludedTermsOutput,
    "review-excluded-course-terms.json đã cũ; chạy course:build-dictionary-index.",
  );
} else {
  writeFileSync(outputPath, output);
  writeFileSync(reviewExcludedTermsPath, reviewExcludedTermsOutput);
}

console.log(
  `Course dictionary index ${process.argv.includes("--check") ? "verified" : "built"}: ` +
    `${index.terms.length.toLocaleString("en")} terms, ` +
    `${missingTerms.toLocaleString("en")} source-missing entries, ` +
    `${Buffer.byteLength(output).toLocaleString("en")} bytes.`,
);
