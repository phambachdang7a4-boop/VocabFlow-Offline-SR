const assert = require("node:assert/strict");
const courseData = require("../domain/ielts-topic-course-data.json");
const {
  DICTIONARY_SENSE_REVIEW,
  REQUIRED_RELATED_HEADWORDS,
  validateCourseExamples,
  validateCourseDataAgainstAuthoredOverrides,
  validateDictionarySenseReview,
} = require("./build-ielts-topic-course-data.cjs");

function cloneCourseData() {
  return JSON.parse(JSON.stringify(courseData));
}

validateCourseExamples(courseData.entries);
validateCourseDataAgainstAuthoredOverrides(courseData);

for (const term of Object.keys(DICTIONARY_SENSE_REVIEW)) {
  assert.equal(
    courseData.entries[term],
    undefined,
    `${term} must stay out of IELTS lessons when its dictionary example uses an unrelated sense.`,
  );
}
for (const term of REQUIRED_RELATED_HEADWORDS) {
  assert.ok(
    courseData.entries[term],
    `${term} is a valid related headword and must survive exact-word filtering.`,
  );
}

const reviewedDictionary = new Map(
  Object.entries(DICTIONARY_SENSE_REVIEW).map(([term, review]) => [
    term,
    { example: review.example },
  ]),
);
validateDictionarySenseReview(reviewedDictionary);
const changedReviewedDictionary = new Map(reviewedDictionary);
changedReviewedDictionary.set("plant", { example: "A plant needs water and sunlight." });
assert.throws(
  () => validateDictionarySenseReview(changedReviewedDictionary),
  /plant: dictionary example changed; review its IELTS sense/,
  "A changed source example for a reviewed word must trigger a fresh sense review.",
);

for (const term of Object.keys(DICTIONARY_SENSE_REVIEW)) {
  const reintroducedMismatch = cloneCourseData();
  reintroducedMismatch.entries[term] = {
    definition: "Dictionary definition",
    example: DICTIONARY_SENSE_REVIEW[term].example,
    exampleTranslation: "Bản dịch ví dụ từ điển.",
    dictionarySource: "offline",
    exampleSource: "offline",
  };
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(reintroducedMismatch),
    new RegExp(`${term}: dictionary example uses an unrelated IELTS sense`),
    `${term} must not be restored without reviewing its intended IELTS sense.`,
  );
}

for (const term of REQUIRED_RELATED_HEADWORDS) {
  const removedRelatedHeadword = cloneCourseData();
  delete removedRelatedHeadword.entries[term];
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(removedRelatedHeadword),
    new RegExp(`${term}: valid related headword was removed by sense filtering`),
    `${term} must remain available despite filtering its related headword.`,
  );
}

const missingDefinition = cloneCourseData();
delete missingDefinition.entries.graduation;
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(missingDefinition),
  /graduation: missing authored IELTS definition/,
  "Missing authored definitions must fail the check.",
);

const changedDefinition = cloneCourseData();
changedDefinition.entries.graduation.definition = "Định nghĩa bị thay đổi.";
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(changedDefinition),
  /graduation: authored IELTS definition changed/,
  "Changed authored definitions must fail the check.",
);

const changedExample = cloneCourseData();
changedExample.entries.graduation.example = "She completed her course.";
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(changedExample),
  /graduation: authored IELTS example changed/,
  "Changed curated examples must fail the check.",
);

const changedExampleTranslation = cloneCourseData();
changedExampleTranslation.entries.graduation.exampleTranslation =
  "Bản dịch ví dụ đã bị thay đổi.";
assert.throws(
  () =>
    validateCourseDataAgainstAuthoredOverrides(changedExampleTranslation),
  /graduation: authored IELTS example translation changed/,
  "Changed curated example translations must fail the check.",
);

const changedReviewedTranslation = cloneCourseData();
changedReviewedTranslation.entries.fertilization.exampleTranslation =
  "Sự thụ phấn diễn ra sau khi phấn hoa đến được hoa.";
assert.throws(
  () =>
    validateCourseDataAgainstAuthoredOverrides(changedReviewedTranslation),
  /fertilization: authored IELTS example translation changed/,
  "Reviewed translation corrections must fail if a meaning mismatch returns.",
);

console.log(
  `IELTS course corrections verified: ${Object.keys(courseData.entries).length} entries, ${Object.keys(DICTIONARY_SENSE_REVIEW).length} mismatched dictionary senses are excluded, related headwords remain, and authored corrections match the builder.`,
);
