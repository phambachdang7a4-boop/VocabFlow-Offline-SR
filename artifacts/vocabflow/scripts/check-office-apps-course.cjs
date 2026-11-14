const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const course = loadTs(join(__dirname, "../domain/office-apps-course.ts"));
const topics = course.OFFICE_APPS_COURSE_TOPICS;
const entries = course.OFFICE_APPS_COURSE_ENTRIES;
const lessons = course.OFFICE_APPS_COURSE_LESSONS;
const terms = Object.keys(entries);
const missingTranslations = terms.filter(
  (term) => !entries[term].exampleTranslation?.trim(),
);

assert.equal(course.OFFICE_APPS_COURSE_WORD_COUNT, 180);
assert.equal(course.OFFICE_APPS_COURSE_TOPIC_COUNT, 3);
assert.deepEqual(
  topics.map((topic) => topic.id),
  ["excel", "word", "powerpoint"],
);
assert.ok(topics.every((topic) => topic.terms.length === 60));
assert.equal(terms.length, 180, "All course terms are unique.");
assert.deepEqual(missingTranslations, [], "Every example has a Vietnamese translation.");
assert.ok(
  terms.every((term) => entries[term].partOfSpeech?.trim()),
  "Every Office vocabulary item has a part-of-speech label.",
);
assert.equal(entries["active cell"].partOfSpeech, "Cụm danh từ");
assert.equal(entries["freeze panes"].partOfSpeech, "Cụm động từ");
assert.equal(entries.bold.partOfSpeech, "Tính từ");
assert.equal(entries["after previous"].partOfSpeech, "Cụm giới từ");
assert.equal(lessons.length, 15);

const seenTerms = [];
for (const topic of topics) {
  const topicLessons = lessons.filter((lesson) => lesson.topicId === topic.id);
  assert.equal(topicLessons.length, 5, `${topic.title} has five lessons.`);
  assert.ok(topicLessons.every((lesson) => lesson.topicTitle === topic.title));
  assert.ok(
    topicLessons.every((lesson) => lesson.questions.length === 12),
    `${topic.title} lessons contain twelve questions each.`,
  );
}

for (const lesson of lessons) {
  for (const question of lesson.questions) {
    const entry = entries[question.term];
    assert.ok(entry, `${question.term} has a course entry.`);
    assert.ok(entry.definition.trim());
    assert.ok(entry.example.trim());
    assert.ok(entry.exampleTranslation.trim());
    assert.ok(question.prompt.includes("_____"), `${question.term} is blanked.`);
    assert.ok(
      question.choices.includes(question.term),
      `${question.term} is one of its answer choices.`,
    );
    assert.equal(new Set(question.choices).size, 4);
    const escaped = question.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      entry.example,
      new RegExp(`\\b${escaped}\\b`, "i"),
      `${question.term} appears in its example.`,
    );
    seenTerms.push(question.term);
  }
}

assert.equal(new Set(seenTerms).size, 180, "Every term appears once in lessons.");
assert.deepEqual(new Set(seenTerms), new Set(terms));
console.log(
  `PASS: ${terms.length} terms across ${topics.length} apps and ${lessons.length} lessons; all ${terms.length} examples have Vietnamese translations, with cloze prompts and answer choices.`,
);
