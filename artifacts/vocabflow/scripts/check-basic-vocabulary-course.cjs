const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const examples = require("../domain/basic-vocabulary-examples.json");
const course = loadTs(join(__dirname, "../domain/basic-vocabulary-course.ts"), {
  "./basic-vocabulary-examples.json": examples,
});
const entries = course.BASIC_VOCABULARY_COURSE_ENTRIES;
const lessons = course.BASIC_VOCABULARY_COURSE_LESSONS;
const terms = Object.keys(entries);
const seenTerms = [];

assert.equal(course.BASIC_VOCABULARY_COURSE_WORD_COUNT, 300);
assert.equal(terms.length, 300);
assert.equal(course.BASIC_VOCABULARY_COURSE_TOPIC_COUNT, 8);
assert.equal(lessons.length, 25);
assert.equal(new Set(terms).size, 300, "The course has no repeated terms.");
assert.ok(
  terms.every((term) => entries[term].definition.trim()),
  "Every term has a Vietnamese meaning.",
);
assert.ok(
  terms.every(
    (term) =>
      entries[term].example.trim() &&
      entries[term].exampleTranslation.trim(),
  ),
  "Every term has a bilingual example.",
);

for (const lesson of lessons) {
  assert.equal(lesson.questions.length, 12, `${lesson.title} has twelve words.`);
  for (const question of lesson.questions) {
    assert.ok(entries[question.term], `${question.term} has a Vietnamese meaning.`);
    assert.ok(question.prompt.includes(entries[question.term].definition));
    assert.equal(question.choices.length, 4);
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.term));
    seenTerms.push(question.term);
  }
}

assert.equal(new Set(seenTerms).size, 300);
assert.deepEqual(new Set(seenTerms), new Set(terms));
const screen = readFileSync(join(__dirname, "../app/(tabs)/courses.tsx"), "utf8");
assert.match(screen, /BASIC_VOCABULARY_COURSE_ID/);
assert.match(screen, /isBasicVocabularyCourse/);
assert.match(screen, /testIdPrefix: "basic-vocabulary"/);
console.log(
  "PASS: 300 unique A1–A2 terms across 8 topics and 25 lessons of 12, with Vietnamese prompts and four answer choices.",
);
