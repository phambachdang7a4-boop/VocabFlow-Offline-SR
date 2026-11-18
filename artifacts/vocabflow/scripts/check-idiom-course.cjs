const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadDictionaryDomain, loadTs } = require("./test-support.cjs");

const data = require("../domain/idiom-course-data.json");
const exampleTranslations = require(
  "../domain/idiom-course-example-translations.json",
);
const dictionary = loadDictionaryDomain();
const course = loadTs(join(__dirname, "../domain/idiom-course.ts"), {
  "./idiom-course-data.json": data,
  "./idiom-course-example-translations.json": exampleTranslations,
  "./dictionary": dictionary,
});

assert.equal(data.generatedFrom, "dictionary_en_vi.db");
assert.equal(data.sourceSha256, dictionary.DICTIONARY.sha256,
  "Course data must come from the currently pinned offline dictionary.");
assert.equal(data.uniqueTerms, Object.keys(data.entries).length);
assert.equal(data.sourceRows, 1513);
assert.equal(data.uniqueTerms, 1499,
  "Duplicate entries differing only by capitalization appear once.");
assert.equal(course.IDIOM_COURSE_TITLE, "Idioms");
assert.equal(course.IDIOM_COURSE_WORD_COUNT, 1499);
assert.equal(Object.keys(exampleTranslations).length, 1499);
assert.ok(
  Object.keys(data.entries).every(
    (term) => exampleTranslations[term]?.trim(),
  ),
  "Every idiom has a translated example.",
);
assert.ok(
  Object.values(course.IDIOM_COURSE_ENTRIES).every(
    (entry) => entry.exampleTranslation?.trim(),
  ),
  "Translations reach course feedback entries.",
);
assert.ok(course.IDIOM_COURSE_LESSONS.length > 50);
assert.ok(course.IDIOM_COURSE_LESSONS.every((lesson) =>
  lesson.questions.length > 0 && lesson.questions.length <= 20,
));

const questions = course.IDIOM_COURSE_LESSONS.flatMap((lesson) => lesson.questions);
const terms = Object.keys(data.entries);
assert.equal(questions.length, terms.length,
  "Every dictionary idiom is included in a lesson.");
assert.equal(new Set(questions.map((question) => question.term)).size, terms.length,
  "An idiom appears only once in the course.");
assert.deepEqual(
  [...questions.map((question) => question.term)].sort(),
  [...terms].sort(),
);
for (const question of questions) {
  assert.ok(question.prompt.includes("_____"), `${question.term} has a blank.`);
  assert.ok(question.dialoguePrompt.includes("idiom"));
  assert.ok(!question.dialoguePrompt.toLocaleLowerCase("en").includes(question.term.toLocaleLowerCase("en")),
    `${question.term} must not leak in Corvi's clue.`);
  assert.equal(question.choices.length, 4);
  assert.equal(new Set(question.choices).size, 4);
  assert.ok(question.choices.includes(question.term));
  assert.ok(question.choices.every((choice) => data.entries[choice]),
    "All choices come from the offline idiom list.");
}

const exactExampleQuestions = questions.filter((question) => {
  return question.prompt !== "Mình đoán idiom đó là: _____";
});
const definitionFallbacks = questions.length - exactExampleQuestions.length;
assert.ok(exactExampleQuestions.length > 800,
  "Most entries use an example sentence with the idiom blanked.");
assert.ok(definitionFallbacks > 0,
  "Entries whose source example does not contain the exact headword use definition recall.");

const smallCourse = course.buildIdiomCourse({
  "a piece of cake": { definition: "dễ như ăn bánh", example: "The test was a piece of cake." },
  "break the ice": { definition: "phá tan sự ngượng ngùng", example: "She told a joke to break the ice." },
  "under the weather": { definition: "cảm thấy không khỏe", example: "He stayed home because he felt under the weather." },
  "once in a blue moon": { definition: "rất hiếm khi", example: "We only meet once in a blue moon." },
}, "idioms-test");
assert.equal(smallCourse.length, 1);
assert.equal(smallCourse[0].id, "idioms-test-lesson-001");
assert.equal(smallCourse[0].questions.length, 4);

console.log(
  `PASS: all ${questions.length} unique dictionary idioms appear once across ${course.IDIOM_COURSE_LESSONS.length} lessons; ${exactExampleQuestions.length} use clozed examples and ${definitionFallbacks} use meaning recall.`,
);
