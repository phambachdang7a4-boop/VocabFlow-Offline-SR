const assert = require("node:assert/strict");
const { join } = require("node:path");
const { readFileSync } = require("node:fs");
const {
  TOEIC_SPELLING_CONVENTION,
  applyToeicSpellingLabels,
  validateToeicSpellingData,
} = require("./build-toeic-topic-course-data.cjs");

const data = JSON.parse(
  readFileSync(join(__dirname, "../domain/toeic-topic-course-data.json"), "utf8"),
);

validateToeicSpellingData(data);
assert.equal(data.spellingConvention, TOEIC_SPELLING_CONVENTION);

for (const [american, british] of [
  ["traveling", "travelling"],
  ["traveled", "travelled"],
  ["license", "licence"],
  ["standardize", "standardise"],
  ["standardization", "standardisation"],
  ["computerize", "computerise"],
  ["legalize", "legalise"],
  ["organization", "organisation"],
  ["organizer", "organiser"],
  ["authorization", "authorisation"],
]) {
  const entry = data.entries[american];
  if (!entry) continue;
  assert.equal(
    entry.spellingNote,
    `Anh-Mỹ; chính tả Anh-Anh: ${british}.`,
    `${american} must identify its British equivalent.`,
  );
}

assert.throws(
  () =>
    validateToeicSpellingData({
      ...data,
      spellingConvention: "",
    }),
  /spelling convention is missing/,
);

const labeledExample = applyToeicSpellingLabels({
  entries: {
    traveling: { definition: "traveling" },
    travelling: { definition: "travelling" },
  },
});
assert.equal(
  labeledExample.entries.traveling.spellingNote,
  "Anh-Mỹ; chính tả Anh-Anh: travelling.",
);
assert.equal(labeledExample.entries.travelling.spellingNote, undefined);
assert.throws(
  () =>
    validateToeicSpellingData({
      ...data,
      entries: {
        ...data.entries,
        traveling: { ...data.entries.traveling, spellingNote: undefined },
      },
    }),
  /must be labeled/,
);

console.log(
  `PASS: TOEIC British-English preference and American spelling labels (${Object.keys(data.entries).length} entries).`,
);
