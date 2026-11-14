const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");
const {
  buildCourseWordCandidates,
  courseWordSelectionKey,
} = loadTs(join(__dirname, "../domain/course-word-selection.ts"));

const entries = new Map([
  ["however", { definition: "tuy nhiên", example: "However, we continued." }],
  ["therefore", { definition: "do đó", example: "Therefore, she waited." }],
  [
    "active cell",
    {
      definition: "ô đang hoạt động",
      example: "Select the active cell.",
      partOfSpeech: "Cụm danh từ",
    },
  ],
]);
const saved = [
  { term: "HOWEVER", meaning: "  tuy   nhiên " },
];
const candidates = buildCourseWordCandidates(
  ["however", "therefore", "however"],
  entries,
  saved,
);

assert.equal(candidates.length, 2, "Repeated lesson terms appear only once.");
assert.equal(candidates[0].alreadySaved, true, "Saved terms are recognized case/space-insensitively.");
assert.equal(candidates[1].alreadySaved, false);
assert.equal(candidates[1].example, "Therefore, she waited.");
assert.equal(candidates[1].ipa, "", "Courses without IPA keep the field blank.");
const officeCandidate = buildCourseWordCandidates(
  ["active cell"],
  entries,
  [],
)[0];
assert.equal(
  officeCandidate.partOfSpeech,
  "Cụm danh từ",
  "Office course candidates retain their part-of-speech label.",
);
assert.equal(
  courseWordSelectionKey("such  as", "ví dụ"),
  courseWordSelectionKey(" SUCH AS ", "ví dụ"),
);
console.log("Course word selection checks passed.");
