const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const {
  loadDictionaryDomain,
  loadTs,
} = require("./test-support.cjs");

const root = join(__dirname, "..");
const index = require("../domain/course-dictionary-index.json");
const domain = loadDictionaryDomain();
const courseIndexModule = loadTs(
  join(root, "data/dictionary-course-index.ts"),
  {
    "../domain/dictionary": domain,
    "../domain/course-dictionary-index.json": index,
  },
);
const spelling = loadTs(join(root, "domain/dictionary-suggestions.ts"));
const inflections = loadTs(join(root, "domain/dictionary-inflections.ts"));
const queries = loadTs(join(root, "data/dictionary-queries.ts"), {
  "../domain/dictionary": domain,
  "../domain/dictionary-suggestions": spelling,
  "../domain/dictionary-inflections": inflections,
  "./dictionary-course-index": courseIndexModule,
});

function adapter(handle) {
  return {
    execAsync: async (sql) => handle.exec(sql),
    getFirstAsync: async (sql, ...params) => handle.prepare(sql).get(...params),
    getAllAsync: async (sql, ...params) => handle.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const result = handle.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    withTransactionAsync: async (operation) => {
      handle.exec("BEGIN");
      try {
        await operation();
        handle.exec("COMMIT");
      } catch (error) {
        handle.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function normalizeTerm(term) {
  return term.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

(async () => {
  assert.equal(index.sourceSha256, domain.DICTIONARY.sha256);
  assert.equal(index.courses.length, 8, "All current course groups are indexed.");
  assert.equal(index.terms.length, 13_417);
  assert.equal(
    index.terms.filter((term) => term.senses?.length).length,
    2_450,
    "Every source-missing course term includes a learner-facing meaning.",
  );

  const buildCheck = spawnSync(
    process.execPath,
    [join(__dirname, "build-course-dictionary-index.cjs"), "--check"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(
    buildCheck.status,
    0,
    buildCheck.stderr || buildCheck.stdout,
  );

  const addedTerm = index.terms.find((term) => term.senses?.length);
  assert.ok(addedTerm, "The index contains course-only dictionary entries.");
  const handle = new DatabaseSync(":memory:");
  const db = adapter(handle);
  handle.exec(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      lang_code TEXT NOT NULL
    );
    CREATE TABLE definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition TEXT NOT NULL,
      pos TEXT,
      sub_pos TEXT,
      definition_lang TEXT NOT NULL
    );
    CREATE TABLE word_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      definition_id INTEGER NOT NULL,
      example TEXT
    );
    CREATE TABLE pronunciations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      ipa TEXT NOT NULL,
      region TEXT
    );
  `);

  const seededTerms = index.terms.filter(
    (term) => normalizeTerm(term.term) !== normalizeTerm(addedTerm.term),
  );
  for (let offset = 0; offset < seededTerms.length; offset += 250) {
    const chunk = seededTerms.slice(offset, offset + 250);
    handle
      .prepare(
        `INSERT INTO words (word, lang_code) VALUES ${chunk
          .map(() => "(?, 'en')")
          .join(", ")}`,
      )
      .run(...chunk.map((term) => term.term));
  }

  await courseIndexModule.applyCourseDictionaryIndex(db);
  const addedWord = handle
    .prepare("SELECT id FROM words WHERE word = ? AND lang_code = 'en'")
    .get(addedTerm.term);
  assert.ok(addedWord, "Missing course words are added to the dictionary.");
  assert.equal(
    handle.prepare(
      `SELECT COUNT(*) AS count FROM word_definitions wd
       JOIN definitions d ON d.id = wd.definition_id
       WHERE wd.word_id = ? AND d.definition_lang = 'vi'`,
    ).get(addedWord.id).count,
    addedTerm.senses.length,
    "New dictionary words retain the course meanings and examples.",
  );

  const multiCourseTerm = index.terms.find(
    (term) => term.courseIds.length > 1,
  );
  assert.ok(multiCourseTerm, "Shared words keep every matching course tag.");
  const multiCourseWord = handle
    .prepare("SELECT id FROM words WHERE word = ? AND lang_code = 'en'")
    .get(multiCourseTerm.term);
  assert.equal(
    handle.prepare(
      "SELECT COUNT(*) AS count FROM vocabflow_course_tags WHERE word_id = ?",
    ).get(multiCourseWord.id).count,
    multiCourseTerm.courseIds.length,
  );
  const multiCourseTitles = multiCourseTerm.courseIds.map(
    (id) => index.courses.find((course) => course.id === id).title,
  );
  const unfilteredSharedSearch = await queries.searchInDictionary(
    db,
    multiCourseTerm.term,
  );
  const unfilteredSharedWord = unfilteredSharedSearch.items.find(
    (item) => normalizeTerm(item.term) === normalizeTerm(multiCourseTerm.term),
  );
  assert.ok(unfilteredSharedWord, "Unfiltered search still finds shared course words.");
  assert.deepEqual(
    [...unfilteredSharedWord.courseTags].sort(),
    [...multiCourseTitles].sort(),
    "Filtering support does not remove any course labels from results.",
  );
  for (const courseId of multiCourseTerm.courseIds) {
    const filtered = await queries.searchInDictionary(
      db,
      multiCourseTerm.term,
      0,
      courseId,
    );
    const filteredSharedWord = filtered.items.find(
      (item) => normalizeTerm(item.term) === normalizeTerm(multiCourseTerm.term),
    );
    assert.ok(filteredSharedWord, `The shared word appears in ${courseId}.`);
  }
  const otherCourseId = index.courses.find(
    (course) => !multiCourseTerm.courseIds.includes(course.id),
  )?.id;
  if (otherCourseId) {
    const unrelatedFiltered = await queries.searchInDictionary(
      db,
      multiCourseTerm.term,
      0,
      otherCourseId,
    );
    assert.equal(
      unrelatedFiltered.items.some(
        (item) => normalizeTerm(item.term) === normalizeTerm(multiCourseTerm.term),
      ),
      false,
      "A course filter excludes words that are not tagged for that course.",
    );
  }

  const search = await queries.searchInDictionary(db, addedTerm.term);
  const match = search.items.find(
    (item) => normalizeTerm(item.term) === normalizeTerm(addedTerm.term),
  );
  assert.ok(match);
  assert.deepEqual(
    match.courseTags,
    addedTerm.courseIds.map(
      (id) => index.courses.find((course) => course.id === id).title,
    ),
  );
  const detail = await queries.entryInDictionary(db, match.id);
  assert.deepEqual(detail.courseTags, match.courseTags);
  assert.equal(detail.senses.length, addedTerm.senses.length);

  const firstTagCount = handle
    .prepare("SELECT COUNT(*) AS count FROM vocabflow_course_tags")
    .get().count;
  const firstWordCount = handle
    .prepare("SELECT COUNT(*) AS count FROM words")
    .get().count;
  await courseIndexModule.applyCourseDictionaryIndex(db);
  assert.equal(
    handle.prepare("SELECT COUNT(*) AS count FROM vocabflow_course_tags").get()
      .count,
    firstTagCount,
    "Reapplying the index does not duplicate tags.",
  );
  assert.equal(
    handle.prepare("SELECT COUNT(*) AS count FROM words").get().count,
    firstWordCount,
    "Reapplying the index does not duplicate words.",
  );
  handle.close();
  console.log("Course dictionary index checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
