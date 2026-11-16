const assert = require("node:assert/strict");
const { join } = require("node:path");
const { readFileSync } = require("node:fs");
const {
  TOEIC_SPELLING_CONVENTION,
  validateToeicInflectionData,
  validateToeicSpellingData,
} = require("./build-toeic-topic-course-data.cjs");

const domainDirectory = join(__dirname, "../domain");
const metadata = JSON.parse(
  readFileSync(join(domainDirectory, "toeic-topic-course-data.json"), "utf8"),
);
const expectedTopicIds = [
  "general-business",
  "office-issues",
  "personnel",
  "finance-accounting",
  "purchasing",
  "travel-transportation",
  "dining-hospitality",
  "health-medical",
  "real-estate",
  "entertainment-events",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exampleContainsTerm(term, example) {
  const phrase = term
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
  return new RegExp(`(?:^|[^a-z])${phrase}(?:$|[^a-z])`, "i").test(example);
}

assert.equal(metadata.totalWords, 3000, "The TOEIC course contains 3,000 phrases.");
assert.equal(metadata.topics.length, expectedTopicIds.length);
assert.deepEqual(
  metadata.topics.map((topic) => topic.id),
  expectedTopicIds,
  "The course uses the requested ten TOEIC topic groups.",
);
assert.equal(
  metadata.spellingConvention,
  TOEIC_SPELLING_CONVENTION,
  "The existing spelling convention remains available.",
);

const entries = {};
const allTerms = [];
for (const topic of metadata.topics) {
  assert.ok(topic.title && topic.focus, `${topic.id} has a title and focus.`);
  assert.ok(topic.terms.length > 0, `${topic.id} has course phrases.`);
  const topicData = JSON.parse(
    readFileSync(
      join(domainDirectory, "toeic-topic-course-data", `${topic.id}.json`),
      "utf8",
    ),
  );
  assert.equal(
    Object.keys(topicData.entries).length,
    topic.terms.length,
    `${topic.id} has exactly one entry per listed phrase.`,
  );

  for (const term of topic.terms) {
    const entry = topicData.entries[term];
    assert.ok(entry, `${term} exists in its topic data.`);
    assert.ok(
      term.trim().split(/\s+/).length >= 2,
      `${term} is a phrase rather than a standalone inflected word.`,
    );
    assert.ok(entry.definition.trim(), `${term} has a Vietnamese meaning.`);
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
    assert.notEqual(
      entry.exampleTranslation.trim(),
      entry.example.trim(),
      `${term} keeps its English example separate from its translation.`,
    );
    assert.ok(
      exampleContainsTerm(term, entry.example),
      `${term} appears in its example.`,
    );
    assert.equal(entry.partOfSpeech, "Phrase");
    assert.equal(entry.posGroup, "phrase");
    assert.equal(entry.dictionarySource, "authored");
    assert.equal(entry.exampleSource, "authored");
    entries[term] = entry;
    allTerms.push(term);
  }
}

assert.equal(allTerms.length, 3000);
assert.equal(
  new Set(allTerms.map((term) => term.trim().toLowerCase().replace(/\s+/g, " ")))
    .size,
  allTerms.length,
  "The course has no duplicate phrases across topics.",
);

const combinedData = { ...metadata, entries };
validateToeicSpellingData(combinedData);
validateToeicInflectionData(combinedData);

console.log(
  `PASS: ${allTerms.length} unique TOEIC phrases across ${metadata.topics.length} topics; each has a meaning, example, and translation.`,
);
