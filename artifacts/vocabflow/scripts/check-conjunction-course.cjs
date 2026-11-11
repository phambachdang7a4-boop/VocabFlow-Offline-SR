const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadDictionaryDomain,
  loadTs,
} = require("./test-support.cjs");

const additions = loadTs(
  join(__dirname, "../domain/dictionary-local-additions.ts"),
);
const course = loadTs(
  join(__dirname, "../domain/conjunction-course.ts"),
  { "./dictionary-local-additions": additions },
);
const linkingAdverbCourse = loadTs(
  join(__dirname, "../domain/linking-adverb-course.ts"),
);
const ieltsTopicCourse = loadTs(
  join(__dirname, "../domain/ielts-topic-course.ts"),
);
const dictionaryDomain = loadDictionaryDomain();
const { applyLocalDictionaryAdditions } = loadTs(
  join(__dirname, "../data/dictionary-local-additions.ts"),
  { "../domain/dictionary-local-additions": additions },
);

async function checkDictionaryOverlay() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      lang_code TEXT NOT NULL DEFAULT 'vi'
    );
    CREATE TABLE definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition TEXT NOT NULL,
      pos TEXT,
      sub_pos TEXT,
      definition_lang TEXT DEFAULT 'vi',
      UNIQUE(definition, pos, sub_pos)
    );
    CREATE TABLE word_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      definition_id INTEGER NOT NULL,
      example TEXT
    );
  `);
  const db = {
    getFirstAsync: async (sql, ...params) =>
      sqlite.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    withTransactionAsync: async (callback) => {
      sqlite.exec("BEGIN");
      try {
        await callback();
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };

  await applyLocalDictionaryAdditions(db);
  await applyLocalDictionaryAdditions(db);
  const rows = sqlite
    .prepare(
      `SELECT w.word, d.definition, d.pos, d.sub_pos AS subPos,
        wd.example, w.lang_code AS langCode
       FROM words w
       JOIN word_definitions wd ON wd.word_id = w.id
       JOIN definitions d ON d.id = wd.definition_id
       ORDER BY w.word`,
    )
    .all();
  assert.equal(rows.length, 18, "Overlay adds each phrase exactly once.");
  assert.equal(
    new Set(rows.map((row) => row.word)).size,
    additions.LOCAL_DICTIONARY_ADDITIONS.length,
  );
  for (const entry of additions.LOCAL_DICTIONARY_ADDITIONS) {
    const row = rows.find((item) => item.word === entry.term);
    assert.ok(row, `${entry.term} exists in the offline dictionary.`);
    assert.equal(row.definition, entry.definition);
    assert.equal(row.example, entry.example);
    assert.equal(row.pos, "conj");
    assert.equal(row.subPos, "subordinating");
    assert.equal(row.langCode, "en");
  }
  assert.equal(dictionaryDomain.dictionaryPartOfSpeech("conj"), "conjunction");
  const draft = dictionaryDomain.dictionaryDraft(
    {
      id: 900001,
      term: "as if",
      pronunciations: [],
    },
    {
      id: 900001,
      definition: additions.LOCAL_DICTIONARY_ADDITIONS[0].definition,
      pos: "conj",
      subPos: "subordinating",
      example: additions.LOCAL_DICTIONARY_ADDITIONS[0].example,
    },
  );
  assert.match(draft.note, /biên soạn cho VocabFlow/);
  sqlite.close();
}

async function checkCourseContentAndProgress() {
  const entries = new Map(
    additions.LOCAL_DICTIONARY_ADDITIONS.map((entry) => [entry.term, entry]),
  );
  const seenQuestions = new Set();
  const courseTerms = [];
  for (const lesson of course.CONJUNCTION_COURSE_LESSONS) {
    assert.ok(lesson.questions.length > 0);
    for (const question of lesson.questions) {
      assert.ok(entries.has(question.term), `${question.term} has dictionary data.`);
      assert.ok(question.prompt.includes("_____"), "Every exercise has one clear blank.");
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      const key = `${lesson.id}:${question.term}`;
      assert.ok(!seenQuestions.has(key), `${question.term} is not repeated in a lesson.`);
      seenQuestions.add(key);
      courseTerms.push(question.term);
    }
  }
  assert.equal(courseTerms.length, entries.size, "Every new entry appears in one exercise.");
  assert.equal(new Set(courseTerms).size, entries.size);
  assert.equal(course.CONJUNCTION_COURSE_TITLE, "Liên từ trong câu");

  const linkingTerms = Object.keys(
    linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
  );
  const linkedQuestions = linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  assert.equal(
    linkingAdverbCourse.LINKING_ADVERB_COURSE_TITLE,
    "Trạng từ liên kết",
  );
  assert.equal(linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS.length, 3);
  assert.equal(linkingTerms.length, 17);
  assert.ok(!linkingTerms.includes("first"));
  assert.ok(!linkingTerms.includes("next"));
  assert.equal(linkedQuestions.length, linkingTerms.length);
  assert.deepEqual(
    [...linkedQuestions.map((question) => question.term)].sort(),
    [...linkingTerms].sort(),
    "Every linking adverb has one exercise.",
  );
  for (const lesson of linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS) {
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(
        linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES[question.term],
      );
    }
  }

  const ieltsTerms = ieltsTopicCourse.IELTS_TOPIC_WORD_LIST.flatMap(
    (topic) => topic.terms,
  );
  const ieltsQuestions = ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  assert.equal(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_TITLE,
    "Từ vựng IELTS theo chủ đề",
  );
  assert.equal(ieltsTopicCourse.IELTS_TOPIC_WORD_LIST.length, 5);
  assert.equal(ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.length, 5);
  assert.equal(ieltsTerms.length, 25);
  assert.equal(new Set(ieltsTerms).size, 25);
  assert.deepEqual(
    [...ieltsQuestions.map((question) => question.term)].sort(),
    [...ieltsTerms].sort(),
    "Every curated IELTS word has one exercise.",
  );
  assert.deepEqual(
    Object.keys(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES).sort(),
    [...ieltsTerms].sort(),
    "Every curated IELTS word has course feedback content.",
  );
  assert.equal(
    Object.values(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES).filter(
      (entry) => entry.dictionarySource === "authored",
    ).length,
    1,
    "Only a missing offline dictionary entry is authored.",
  );
  for (const lesson of ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS) {
    assert.equal(lesson.questions.length, 5);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES[question.term]);
    }
  }

  const root = mkdtempSync(join(tmpdir(), "vocabflow-conjunction-progress-"));
  const repository = createRepository(root);
  const { repo } = repository;
  try {
    const lessonId = `${course.CONJUNCTION_COURSE_ID}-time`;
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [],
    );
    await repo.markCourseLessonCompleted(lessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [lessonId],
    );
    await repo.markCourseLessonCompleted(lessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [lessonId],
      "Completing a lesson repeatedly does not duplicate its progress.",
    );
    const db = repository.db;
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS count FROM course_lesson_progress")
        .get().count,
      1,
    );
  } finally {
    repository.db?.close();
    rmSync(root, { recursive: true, force: true });
  }
}

(async () => {
  await checkDictionaryOverlay();
  await checkCourseContentAndProgress();
  console.log("Conjunction dictionary overlay and course checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
