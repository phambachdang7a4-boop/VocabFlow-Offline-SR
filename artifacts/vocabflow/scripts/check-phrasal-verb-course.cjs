const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const data = require("../domain/phrasal-verb-course-data.json");
const exampleTranslations = require(
  "../domain/phrasal-verb-example-translations.json",
);
const topicMap = require("../domain/phrasal-verb-topic-map.json");
const course = loadTs(
  join(__dirname, "../domain/phrasal-verb-course.ts"),
  { "./phrasal-verb-course-data.json": data },
);
const entries = course.PHRASAL_VERB_COURSE_ENTRIES;
const lessons = course.PHRASAL_VERB_COURSE_LESSONS;
const terms = Object.keys(entries);
const dictionaryTerms = Object.keys(data.entries);
const authoredLessons = lessons.slice(0, 6);
const dictionaryLessons = lessons.slice(6);

assert.equal(course.PHRASAL_VERB_COURSE_ID, "phrasal-verbs-v1");
assert.equal(data.uniqueTerms, dictionaryTerms.length);
assert.equal(exampleTranslations.sourceSha256, data.sourceSha256);
assert.equal(
  Object.keys(exampleTranslations.translations).length,
  dictionaryTerms.length,
  "Every extracted phrasal verb has a reviewed Vietnamese example translation.",
);
const reviewedTopicSamples = {
  "ask in": "Bạn nên mời vị khách đang chờ ngoài cửa vào nhà.",
  "bash out": "Tôi đã viết vội bài luận đó vào đêm trước khi phải nộp.",
  "sex up":
    "Họ đã cố gắng làm cho tin tức trở nên hấp dẫn hơn bằng những chi tiết bổ sung.",
  "back into": "Anh ấy thích lùi xe vào trong gara hơn.",
  "auction off":
    "Họ đã bán đấu giá tài sản của mình vì họ đang nợ nần chồng chất.",
  "act up":
    "Máy tính của tôi đang giở chứng; có lẽ nó bị nhiễm virus rồi.",
  "agree with":
    "Tôi cảm thấy tệ quá - món đó không hợp với dạ dày của tôi.",
  "strike down": "Tòa phúc thẩm đã bác bỏ phán quyết của tòa cấp dưới.",
  "stick at":
    "Cô ấy thấy khóa học rất khó nhưng cô ấy vẫn kiên trì theo đuổi và cuối cùng đã làm tốt.",
  "sit over":
    "Chúng tôi vừa ngồi nhâm nhi bữa tối vừa thảo luận về các kế hoạch.",
};
for (const [term, translation] of Object.entries(reviewedTopicSamples)) {
  assert.equal(data.entries[term]?.exampleTranslation, translation);
}
assert.ok(dictionaryTerms.length >= 1_500,
  "The filtered offline dictionary provides a broad course.");
assert.ok(terms.length >= 1_900,
  "The expanded course keeps the curated lessons and adds dictionary entries.");
assert.equal(course.PHRASAL_VERB_COURSE_WORD_COUNT, terms.length);
assert.equal(new Set(terms).size, terms.length, "Every course term is unique.");
assert.equal(Object.keys(topicMap).length, dictionaryTerms.length);
assert.equal(data.topics.length, 10);

const dictionaryDomain = readFileSync(
  join(__dirname, "../domain/dictionary.ts"),
  "utf8",
);
const expectedSourceHash =
  dictionaryDomain.match(/sha256:\s*'([a-f0-9]{64})'/i)?.[1];
assert.ok(expectedSourceHash, "The offline dictionary has a pinned source hash.");
assert.equal(data.sourceSha256, expectedSourceHash);

assert.equal(authoredLessons.length, 6);
assert.deepEqual(
  authoredLessons.map((lesson) => lesson.questions.length),
  [20, 20, 20, 20, 20, 20],
  "The original six reviewed lessons stay intact.",
);
assert.deepEqual(
  authoredLessons.map((lesson) => lesson.id),
  Array.from(
    { length: 6 },
    (_, index) =>
      `${course.PHRASAL_VERB_COURSE_ID}-lesson-${String(index + 1).padStart(3, "0")}`,
  ),
  "The existing lesson IDs remain stable for saved progress.",
);
assert.equal(course.PHRASAL_VERB_COURSE_TOPIC_COUNT, 16);
assert.ok(dictionaryLessons.length > 80);
assert.ok(
  dictionaryLessons.every((lesson) => lesson.topicId && lesson.topicTitle),
  "Dictionary lessons are grouped under named topics.",
);
assert.ok(
  lessons.every((lesson, index) =>
    index === 0 || lesson.id !== lessons[index - 1].id,
  ),
  "Lesson identifiers are not repeated.",
);

const allowedParticles = new Set([
  "about", "across", "after", "against", "along", "apart", "around",
  "aside", "at", "away", "back", "by", "down", "for", "forth", "from",
  "in", "into", "off", "on", "onto", "out", "over", "past", "through",
  "to", "together", "under", "up", "upon", "with", "without",
]);
const dataTopicById = new Map(data.topics.map((topic) => [topic.id, topic]));
assert.deepEqual(
  new Set(dictionaryTerms),
  new Set(data.topics.flatMap((topic) => topic.terms)),
  "Each extracted term belongs to exactly one topic.",
);
for (const term of dictionaryTerms) {
  const entry = entries[term];
  const sourceEntry = data.entries[term];
  assert.ok(entry, `${term} is available in the course.`);
  assert.equal(entry.dictionarySource, "offline");
  assert.equal(entry.rootVerb, term.split(" ")[0]);
  assert.equal(topicMap[term], sourceEntry.topicId);
  assert.equal(entry.topicId, sourceEntry.topicId);
  assert.ok(dataTopicById.has(entry.topicId));
  assert.ok(entry.topicTitle);
  assert.equal(sourceEntry.partOfSpeech, "V");
  assert.equal(
    sourceEntry.exampleTranslation,
    exampleTranslations.translations[term],
    `${term} uses its checked Vietnamese example translation.`,
  );
  assert.ok(
    sourceEntry.exampleTranslation?.trim() &&
      /[à-ỹÀ-ỸđĐ]/u.test(sourceEntry.exampleTranslation),
    `${term} has a non-empty Vietnamese example translation.`,
  );
  const parts = term.split(" ");
  assert.ok(parts.length >= 2 && parts.length <= 4);
  assert.ok(allowedParticles.has(parts.at(-1)));
}

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
  assert.ok(lesson.questions.length > 0 && lesson.questions.length <= 20);
  const lessonTerms = lesson.questions.map((question) => question.term);
  if (lesson.topicId && dataTopicById.has(lesson.topicId)) {
    const sortedTerms = [...lessonTerms].sort((left, right) =>
      entries[left].rootVerb.localeCompare(entries[right].rootVerb, "en") ||
      left.localeCompare(right, "en"),
    );
    assert.deepEqual(
      lessonTerms,
      sortedTerms,
      `${lesson.title} is sorted by root verb.`,
    );
  }
  for (const question of lesson.questions) {
    const entry = entries[question.term];
    assert.ok(entry, `${question.term} has a course entry.`);
    assert.ok(entry.definition.trim(), `${question.term} has a Vietnamese meaning.`);
    assert.ok(entry.example.trim(), `${question.term} has an English example.`);
    if (!entry.dictionarySource) {
      assert.ok(
        /[à-ỹÀ-ỸđĐ]/u.test(entry.definition),
        `${question.term} reviewed definition is written in Vietnamese.`,
      );
    }
    assert.ok(
      entry.exampleTranslation?.trim() &&
        /[à-ỹÀ-ỸđĐ]/u.test(entry.exampleTranslation),
      `${question.term} has a non-empty Vietnamese example translation.`,
    );
    if (!entry.dictionarySource) {
      assert.ok(
        entry.exampleTranslation?.trim(),
        `${question.term} keeps the reviewed Vietnamese example translation.`,
      );
    }
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
      "Choices are drawn from the same lesson.",
    );
    for (const [left, right] of ambiguousPairs) {
      if (question.term === left)
        assert.ok(!question.choices.includes(right));
      if (question.term === right)
        assert.ok(!question.choices.includes(left));
    }
    seenTerms.push(question.term);
  }
}

assert.equal(new Set(seenTerms).size, terms.length);
assert.deepEqual(new Set(seenTerms), new Set(terms));
assert.ok(
  terms.some((term) => entries[term].spellingNote?.includes("đại từ")),
  "The reviewed separable verbs retain their pronoun-placement notes.",
);
assert.ok(
  terms.some((term) => entries[term].spellingNote?.includes("Cụm ba từ")),
  "The reviewed three-part verbs retain their structure notes.",
);

console.log(
  `PASS: ${terms.length} unique multiword verbs across ${lessons.length} lessons and ${course.PHRASAL_VERB_COURSE_TOPIC_COUNT} groups; all extracted entries have dictionary meanings, examples, and root/topic ordering.`,
);
