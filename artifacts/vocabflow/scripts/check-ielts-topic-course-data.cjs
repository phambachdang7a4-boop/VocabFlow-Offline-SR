const assert = require("node:assert/strict");
const courseData = require("../domain/ielts-topic-course-data.json");
const {
  DICTIONARY_SENSE_REVIEW,
  DICTIONARY_DEFINITION_REVIEW,
  IELTS_SPELLING_CONVENTION,
  RARE_HEADWORD_REVIEW,
  REQUIRED_COMMON_INFLECTIONS,
  REQUIRED_RELATED_HEADWORDS,
  COURSE_POS_OVERRIDES,
  spellingNoteForTerm,
  validateCourseExamples,
  hasOpeningSubjectPronounConflict,
  validateCourseDataAgainstAuthoredOverrides,
  validateDictionaryDefinitionReview,
  validateDictionarySenseReview,
} = require("./build-ielts-topic-course-data.cjs");

function cloneCourseData() {
  return JSON.parse(JSON.stringify(courseData));
}

validateCourseExamples(courseData.entries);
assert.equal(
  hasOpeningSubjectPronounConflict(
    "She coached him through the interview.",
    "Cô ấy đã hướng dẫn anh ấy vượt qua buổi phỏng vấn.",
  ),
  false,
  "A different-gender object pronoun must not conflict with the English subject.",
);
assert.equal(
  hasOpeningSubjectPronounConflict(
    "The recruiter called her about the job.",
    "Người tuyển dụng đã gọi anh ấy về công việc.",
  ),
  false,
  "An object pronoun must not be mistaken for the English sentence subject.",
);
assert.throws(
  () =>
    validateCourseExamples({
      studied: {
        example: "She studied biology at college.",
        exampleTranslation: "Anh ấy đã học sinh học ở trường đại học.",
      },
    }),
  /studied: English subject pronoun conflicts with Vietnamese subject pronoun/,
  "A mismatched explicit subject pronoun must fail course-example validation.",
);
validateCourseDataAgainstAuthoredOverrides(courseData);
assert.equal(
  courseData.spellingConvention,
  IELTS_SPELLING_CONVENTION,
  "IELTS lessons must declare British English as the preferred spelling convention.",
);

const availableCourseTerms = new Set(Object.keys(courseData.entries));
for (const [term, entry] of Object.entries(courseData.entries)) {
  const expectedSpellingNote = spellingNoteForTerm(term, availableCourseTerms);
  assert.equal(
    entry.spellingNote,
    expectedSpellingNote,
    `${term} must clearly label its British/American spelling alternative when a matching form is taught.`,
  );

  if (expectedSpellingNote) {
    const unlabelledSpellingVariant = cloneCourseData();
    delete unlabelledSpellingVariant.entries[term].spellingNote;
    assert.throws(
      () =>
        validateCourseDataAgainstAuthoredOverrides(unlabelledSpellingVariant),
      new RegExp(`${term}: British/American spelling note changed`),
      `${term} must trigger review if its spelling alternative is no longer labeled.`,
    );
  }
}

const duplicateTopicTerm = cloneCourseData();
duplicateTopicTerm.topics[1].terms.push(duplicateTopicTerm.topics[0].terms[0]);
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(duplicateTopicTerm),
  /headword appears in multiple topics/,
  "A headword assigned to multiple IELTS topics must fail validation.",
);

for (const [term, expectedPartOfSpeech] of Object.entries(
  COURSE_POS_OVERRIDES,
)) {
  assert.ok(
    courseData.entries[term],
    `${term} is a useful reviewed headword and must remain in the course.`,
  );
  assert.equal(
    courseData.entries[term].partOfSpeech,
    expectedPartOfSpeech,
    `${term} must keep the part-of-speech label supported by its lesson example.`,
  );

  const changedLessonLabel = cloneCourseData();
  changedLessonLabel.entries[term].partOfSpeech =
    expectedPartOfSpeech === "N" ? "V" : "N";
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(changedLessonLabel),
    new RegExp(`${term}: reviewed lesson part-of-speech label changed`),
    `${term} must trigger review if its lesson label changes.`,
  );

  const removedReviewedHeadword = cloneCourseData();
  delete removedReviewedHeadword.entries[term];
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(removedReviewedHeadword),
    new RegExp(`${term}: reviewed headword was removed`),
    `${term} must remain available after its lesson label is corrected.`,
  );
}

const courseTopicTerms = new Set(
  courseData.topics.flatMap((topic) => topic.terms),
);
for (const term of Object.keys(RARE_HEADWORD_REVIEW)) {
  assert.equal(
    courseData.entries[term],
    undefined,
    `${term} must stay out of IELTS lesson entries after review.`,
  );
  assert.equal(
    courseTopicTerms.has(term),
    false,
    `${term} must stay out of every IELTS topic.`,
  );

  const reintroducedRareHeadword = cloneCourseData();
  reintroducedRareHeadword.entries[term] = {};
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(reintroducedRareHeadword),
    new RegExp(`${term}: reviewed rare or obsolete headword remains in the course`),
    `${term} must not return without a new review.`,
  );

  const reintroducedTopicTerm = cloneCourseData();
  reintroducedTopicTerm.topics[0].terms.push(term);
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(reintroducedTopicTerm),
    new RegExp(`${term}: reviewed rare or obsolete headword remains in the course`),
    `${term} must not return in a topic even if its entry is missing.`,
  );
}

for (const term of Object.keys(DICTIONARY_DEFINITION_REVIEW)) {
  assert.ok(
    courseData.entries[term],
    `${term} is a useful headword and must remain after its definition is corrected.`,
  );
}

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
for (const term of REQUIRED_COMMON_INFLECTIONS) {
  assert.ok(
    courseData.entries[term],
    `${term} is a useful common inflection and must remain in the course.`,
  );

  const removedInflection = cloneCourseData();
  delete removedInflection.entries[term];
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(removedInflection),
    new RegExp(`${term}: useful common inflection was removed`),
    `${term} must not disappear during a future course rebuild.`,
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

const reviewedDefinitionDictionary = new Map(
  Object.entries(DICTIONARY_DEFINITION_REVIEW).map(([term, review]) => [
    term,
    { definition: review.definition, example: review.example },
  ]),
);
validateDictionaryDefinitionReview(reviewedDefinitionDictionary);
for (const [term, review] of Object.entries(DICTIONARY_DEFINITION_REVIEW)) {
  const changedDefinition = new Map(reviewedDefinitionDictionary);
  changedDefinition.set(term, {
    definition: `${review.definition} (changed)`,
    example: review.example,
  });
  assert.throws(
    () => validateDictionaryDefinitionReview(changedDefinition),
    new RegExp(`${term}: dictionary definition/example changed`),
    `${term} must be reviewed again when its source definition changes.`,
  );

  const changedExample = new Map(reviewedDefinitionDictionary);
  changedExample.set(term, {
    definition: review.definition,
    example: `${review.example} The source sentence changed.`,
  });
  assert.throws(
    () => validateDictionaryDefinitionReview(changedExample),
    new RegExp(`${term}: dictionary definition/example changed`),
    `${term} must be reviewed again when its source example changes.`,
  );

  const removedReviewedHeadword = cloneCourseData();
  delete removedReviewedHeadword.entries[term];
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(removedReviewedHeadword),
    new RegExp(`${term}: reviewed headword was removed`),
    `${term} must remain available when its mismatched definition is corrected.`,
  );
}

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

const changedPronounTranslation = cloneCourseData();
changedPronounTranslation.entries.paternally.exampleTranslation =
  "Anh ấy trả lời một cách đầy bao dung như một người cha và mỉm cười.";
assert.throws(
  () =>
    validateCourseDataAgainstAuthoredOverrides(changedPronounTranslation),
  /paternally: authored IELTS example translation changed/,
  "A reviewed translation must fail if it contradicts the example's subject.",
);

console.log(
  `IELTS course corrections verified: ${Object.keys(courseData.entries).length} entries, ${Object.keys(DICTIONARY_SENSE_REVIEW).length} unrelated dictionary senses and ${Object.keys(RARE_HEADWORD_REVIEW).length} rare or obsolete headwords are excluded, ${REQUIRED_COMMON_INFLECTIONS.length} useful inflections remain, and authored corrections match the builder.`,
);
