const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const course = loadTs(join(__dirname, "../domain/phrasal-verb-course.ts"));
const entries = course.PHRASAL_VERB_COURSE_ENTRIES;
const lessons = course.PHRASAL_VERB_COURSE_LESSONS;
const terms = Object.keys(entries);

assert.equal(course.PHRASAL_VERB_COURSE_ID, "phrasal-verbs-v1");
assert.equal(course.PHRASAL_VERB_COURSE_WORD_COUNT, 120);
assert.equal(terms.length, 120);
assert.equal(new Set(terms).size, 120, "Every phrasal verb is unique.");
assert.ok(terms.every((term) => term.split(" ").length >= 2),
  "The course contains multiword verbs rather than single-word verbs.");
assert.equal(lessons.length, 6);
assert.deepEqual(
  lessons.map((lesson) => lesson.questions.length),
  [20, 20, 20, 20, 20, 20],
  "Each themed lesson contains exactly twenty questions.",
);
assert.deepEqual(
  lessons.map((lesson) => lesson.title),
  [
    "Bài 1: Sinh hoạt hằng ngày",
    "Bài 2: Nhà cửa và việc vặt",
    "Bài 3: Học tập và công việc",
    "Bài 4: Giao tiếp và các mối quan hệ",
    "Bài 5: Di chuyển và thay đổi",
    "Bài 6: Giải quyết tình huống",
  ],
  "Lessons are grouped by everyday situations, not alphabetically.",
);

const seenTerms = [];
const ambiguousPairs = [
  ["catch up", "keep up"],
  ["come back", "go back"],
  ["come back", "head back"],
  ["go back", "head back"],
  ["drive off", "come back"],
  ["drive off", "go back"],
  ["drive off", "head back"],
  ["fix up", "get rid of"],
  ["fix up", "take away"],
  ["go over", "read over"],
  ["point out", "bring up"],
  ["sort out", "deal with"],
  ["sort out", "work out"],
  ["take out", "put out"],
];
for (const lesson of lessons) {
  const lessonTerms = lesson.questions.map((question) => question.term);
  for (const question of lesson.questions) {
    const entry = entries[question.term];
    assert.ok(entry, `${question.term} has a bilingual course entry.`);
    assert.ok(entry.definition.trim(), `${question.term} has a Vietnamese meaning.`);
    assert.ok(entry.example.trim(), `${question.term} has an English example.`);
    assert.ok(
      /[à-ỹÀ-ỸđĐ]/u.test(entry.definition),
      `${question.term} definition is written in Vietnamese.`,
    );
    assert.ok(
      entry.exampleTranslation.trim(),
      `${question.term} has a complete Vietnamese example translation.`,
    );
    assert.ok(
      /[à-ỹÀ-ỸđĐ]/u.test(entry.exampleTranslation),
      `${question.term} translation is written in Vietnamese.`,
    );
    assert.ok(question.prompt.includes("_____"), `${question.term} has a cloze.`);
    assert.ok(
      !question.prompt.includes(question.term),
      `${question.term} is hidden in its prompt.`,
    );
    assert.equal(question.choices.length, 4);
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.term));
    assert.ok(
      question.choices.every((choice) => lessonTerms.includes(choice)),
      "Choices are drawn from the same lesson, preserving contextual relevance.",
    );
    for (const [left, right] of ambiguousPairs) {
      if (question.term === left) {
        assert.ok(!question.choices.includes(right),
          `${question.term} excludes the overlapping answer ${right}.`);
      }
      if (question.term === right) {
        assert.ok(!question.choices.includes(left),
          `${question.term} excludes the overlapping answer ${left}.`);
      }
    }
    seenTerms.push(question.term);
  }
}

assert.equal(new Set(seenTerms).size, 120);
assert.deepEqual(new Set(seenTerms), new Set(terms));
assert.ok(
  terms.some((term) => entries[term].spellingNote?.includes("đại từ")),
  "Separable verbs include a learner-facing note about pronoun placement.",
);
assert.ok(
  terms.some((term) => entries[term].spellingNote?.includes("Cụm ba từ")),
  "Three-part verbs include a short structure note.",
);

console.log(
  "PASS: 120 unique phrasal verbs across six themed lessons; every entry has Vietnamese meaning, natural example, full translation, and one correct choice.",
);
