const assert = require("node:assert/strict");
const courseData = require("../domain/ielts-topic-course-data.json");
const {
  DICTIONARY_SENSE_REVIEW,
  DICTIONARY_DEFINITION_REVIEW,
  IELTS_SPELLING_CONVENTION,
  RARE_HEADWORD_REVIEW,
  REQUIRED_COMMON_INFLECTIONS,
  REQUIRED_RELATED_HEADWORDS,
  REDUNDANT_VERB_INFLECTION_REVIEW,
  COURSE_POS_OVERRIDES,
  spellingNoteForTerm,
  validateCourseExamples,
  hasSubjectPronounConflict,
  validateCourseDataAgainstAuthoredOverrides,
  validateDictionaryDefinitionReview,
  validateDictionaryPosReview,
  validateDictionarySenseReview,
  findOfflineExampleSourceChanges,
  validateOfflineExampleSources,
  REVIEWED_EXAMPLES,
  validateReviewedExamples,
  applyReviewedExamples,
} = require("./build-ielts-topic-course-data.cjs");

function cloneCourseData() {
  return JSON.parse(JSON.stringify(courseData));
}

validateCourseExamples(courseData.entries);
const allIeltsTerms = new Set(
  courseData.topics.flatMap((topic) => topic.terms),
);
for (const term of REDUNDANT_VERB_INFLECTION_REVIEW) {
  assert.equal(
    courseData.entries[term],
    undefined,
    `${term} must stay out of IELTS lessons as a redundant verb form.`,
  );
  assert.equal(
    allIeltsTerms.has(term),
    false,
    `${term} must not be selected again when the course is rebuilt.`,
  );
}
assert.equal(
  REDUNDANT_VERB_INFLECTION_REVIEW.size,
  85,
  "The manually reviewed redundant verb-form list should remain explicit.",
);
assert.equal(
  hasSubjectPronounConflict(
    "She coached him through the interview.",
    "Cô ấy đã hướng dẫn anh ấy vượt qua buổi phỏng vấn.",
  ),
  false,
  "A different-gender object pronoun must not conflict with the English subject.",
);
assert.equal(
  hasSubjectPronounConflict(
    "The recruiter called her about the job.",
    "Người tuyển dụng đã gọi anh ấy về công việc.",
  ),
  false,
  "An object pronoun must not be mistaken for the English sentence subject.",
);
assert.equal(
  hasSubjectPronounConflict(
    "She said he coached her through the interview.",
    "Cô ấy nói anh ấy đã hướng dẫn cô ấy vượt qua buổi phỏng vấn.",
  ),
  false,
  "A different subject and object pronoun in a later clause must remain valid.",
);
assert.throws(
  () =>
    validateCourseExamples({
      studied: {
        example: "She said he studied biology at college.",
        exampleTranslation: "Cô ấy nói cô ấy đã học sinh học ở trường đại học.",
      },
    }),
  /studied: English subject pronoun conflicts with Vietnamese subject pronoun/,
  "A mismatched explicit subject pronoun in a later clause must fail validation.",
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
const changedTotalWords = cloneCourseData();
changedTotalWords.totalWords += 1;
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(changedTotalWords),
  /totalWords is \d+; topic term lists contain \d+/,
  "The stored total must match the sum of all topic term lists.",
);
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

const emptyTopic = cloneCourseData();
emptyTopic.topics[0].terms = [];
assert.throws(
  () => validateCourseDataAgainstAuthoredOverrides(emptyTopic),
  /education: topic has no terms/,
  "An IELTS topic without vocabulary must fail course validation.",
);

for (const [term, review] of Object.entries(
  COURSE_POS_OVERRIDES,
)) {
  assert.ok(
    courseData.entries[term],
    `${term} is a useful reviewed headword and must remain in the course.`,
  );
  assert.equal(
    courseData.entries[term].partOfSpeech,
    review.partOfSpeech,
    `${term} must keep the part-of-speech label supported by its lesson example.`,
  );

  const changedLessonLabel = cloneCourseData();
  changedLessonLabel.entries[term].partOfSpeech =
    review.partOfSpeech === "N" ? "V" : "N";
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

  const changedLessonExample = cloneCourseData();
  changedLessonExample.entries[term].example += " The wording changed.";
  assert.throws(
    () => validateCourseDataAgainstAuthoredOverrides(changedLessonExample),
    new RegExp(`${term}: reviewed source example changed`),
    `${term} must be reviewed again if the lesson's supporting source example changes.`,
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

const reviewedPosDictionaryRows = Object.entries(COURSE_POS_OVERRIDES).map(
  ([word, review]) => ({
    word,
    example: review.sourceExample,
  }),
);
assert.doesNotThrow(
  () => validateDictionaryPosReview(reviewedPosDictionaryRows),
  "Unchanged source examples must keep their reviewed lesson labels.",
);
assert.doesNotThrow(
  () =>
    validateDictionaryPosReview([
      ...reviewedPosDictionaryRows,
      {
        word: "flooding",
        example: "The flooding damaged many homes.",
      },
    ]),
  "Another dictionary example must not invalidate a still-present reviewed source sentence.",
);
for (const [term, review] of Object.entries(COURSE_POS_OVERRIDES)) {
  const changedPosSourceExample = reviewedPosDictionaryRows.map((row) =>
    row.word === term
      ? { ...row, example: `${review.sourceExample} Changed.` }
      : row,
  );
  assert.throws(
    () => validateDictionaryPosReview(changedPosSourceExample),
    new RegExp(
      `${term}: dictionary example changed; review its lesson part-of-speech label`,
    ),
    `${term} must require a fresh lesson-label review if its dictionary example changes.`,
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

const translatedOfflineEntry = {
  employment: {
    example: "She is currently looking for full-time employment.",
    exampleTranslation: "Cô ấy hiện đang tìm việc làm toàn thời gian.",
    exampleSource: "offline",
  },
};
const translatedOfflineEntryBeforeCheck = JSON.stringify(translatedOfflineEntry);
assert.doesNotThrow(
  () =>
    validateOfflineExampleSources(translatedOfflineEntry, [
      {
        word: "employment",
        example: "She is currently looking for full-time employment.",
      },
    ]),
  "An unchanged dictionary example must keep its reviewed translation.",
);
const changedOfflineEntries = {
  ...translatedOfflineEntry,
  education: {
    example: "The school introduced a new course.",
    exampleTranslation: "Trường học đã giới thiệu một khóa học mới.",
    exampleSource: "offline",
  },
  orphaned: {
    example: "The term appeared in an older dictionary edition.",
    exampleTranslation: "",
    exampleSource: "offline",
  },
};
const changedOfflineEntriesBeforeCheck = JSON.stringify(changedOfflineEntries);
const changedOfflineRows = [
  {
    word: "employment",
    example: "She found employment after finishing her studies.",
  },
  {
    word: "employment",
    example: "The company offers employment to local residents.",
  },
  {
    word: "education",
    example: "The school changed its teaching methods.",
  },
];
assert.deepEqual(
  findOfflineExampleSourceChanges(changedOfflineEntries, changedOfflineRows),
  [
    {
      term: "employment",
      savedExample: "She is currently looking for full-time employment.",
      currentExamples: [
        "She found employment after finishing her studies.",
        "The company offers employment to local residents.",
      ],
      translation: "Cô ấy hiện đang tìm việc làm toàn thời gian.",
    },
    {
      term: "education",
      savedExample: "The school introduced a new course.",
      currentExamples: ["The school changed its teaching methods."],
      translation: "Trường học đã giới thiệu một khóa học mới.",
    },
    {
      term: "orphaned",
      savedExample: "The term appeared in an older dictionary edition.",
      currentExamples: [],
      translation: "",
    },
  ],
  "Every changed offline example must include its saved and current source sentences and existing translation.",
);
assert.throws(
  () => validateOfflineExampleSources(changedOfflineEntries, changedOfflineRows),
  (error) => {
    assert.match(
      error.message,
      /rebuild stopped without changing course data/,
    );
    assert.match(
      error.message,
      /Saved English source: "She is currently looking for full-time employment\."/,
    );
    assert.match(
      error.message,
      /Current English sources:\n    - "She found employment after finishing her studies\."\n    - "The company offers employment to local residents\."/,
    );
    assert.match(
      error.message,
      /Existing Vietnamese translation: "Cô ấy hiện đang tìm việc làm toàn thời gian\."/,
    );
    assert.match(
      error.message,
      /- education\n  Saved English source: "The school introduced a new course\."/,
    );
    assert.match(
      error.message,
      /Current English source:\n    - "The school changed its teaching methods\."/,
    );
    assert.match(
      error.message,
      /Existing Vietnamese translation: "Trường học đã giới thiệu một khóa học mới\."/,
    );
    assert.match(
      error.message,
      /- orphaned\n  Saved English source: "The term appeared in an older dictionary edition\."\n  Current English sources:\n    - \(no current dictionary example found\)\n  Existing Vietnamese translation: \(none saved\)/,
    );
    return true;
  },
  "A changed dictionary sentence must produce a complete report for every affected offline example.",
);
assert.equal(
  JSON.stringify(translatedOfflineEntry),
  translatedOfflineEntryBeforeCheck,
  "Source-change detection must preserve the existing useful headword and course entry.",
);
assert.equal(
  JSON.stringify(changedOfflineEntries),
  changedOfflineEntriesBeforeCheck,
  "The review report must not alter saved examples or translations.",
);

const reviewedDictionaryRows = Object.entries(REVIEWED_EXAMPLES).flatMap(
  ([word, review]) =>
    review.dictionaryExamples.map((example) => ({ word, example })),
);
assert.doesNotThrow(
  () => validateReviewedExamples(REVIEWED_EXAMPLES, reviewedDictionaryRows),
  "An unchanged dictionary snapshot must keep its reviewed IELTS example pair.",
);
const changedReviewedDictionaryRows = [
  ...reviewedDictionaryRows.filter((row) => row.word !== "obesity"),
  { word: "obesity", example: "A new dictionary example for obesity." },
  { word: "unrelated", example: "An unrelated dictionary sentence." },
];
assert.throws(
  () =>
    validateReviewedExamples(REVIEWED_EXAMPLES, changedReviewedDictionaryRows),
  /obesity: dictionary examples changed; review the approved IELTS example and translation/,
  "A changed dictionary example must require review without being hidden by the approved pair.",
);
assert.doesNotThrow(
  () =>
    validateOfflineExampleSources(
      {
        obesity: {
          example: "An outdated generated example.",
          exampleTranslation: "Một bản dịch đã cũ.",
          exampleSource: "offline",
        },
      },
      [{ word: "obesity", example: "A changed dictionary example." }],
    ),
  "Reviewed source data, not generated course output, must control checks for reviewed headwords.",
);

const reviewedExampleEntries = {
  obesity: {
    example: "Old dictionary example.",
    exampleTranslation: "Bản dịch cũ.",
    exampleSource: "offline",
  },
  unrelated: {
    example: "An unrelated sentence.",
    exampleTranslation: "Một câu không liên quan.",
    exampleSource: "offline",
  },
};
const unrelatedEntryBeforeReview = JSON.stringify(
  reviewedExampleEntries.unrelated,
);
applyReviewedExamples(reviewedExampleEntries, {
  obesity: REVIEWED_EXAMPLES.obesity,
});
assert.deepEqual(
  reviewedExampleEntries.obesity,
  {
    example: REVIEWED_EXAMPLES.obesity.example,
    exampleTranslation: REVIEWED_EXAMPLES.obesity.exampleTranslation,
    exampleSource: "authored",
  },
  "A reviewed pair must replace the generated example and be marked as authored.",
);
assert.equal(
  JSON.stringify(reviewedExampleEntries.unrelated),
  unrelatedEntryBeforeReview,
  "Applying a reviewed pair must leave unrelated course entries unchanged.",
);
assert.throws(
  () => applyReviewedExamples({}, { missing: REVIEWED_EXAMPLES.obesity }),
  /missing: reviewed IELTS example headword is missing from the course/,
  "A review record must not be silently ignored when its course headword is missing.",
);

const reviewedCourseEntries = cloneCourseData().entries;
const reviewedCourseEntriesBeforeApply = JSON.stringify(reviewedCourseEntries);
applyReviewedExamples(reviewedCourseEntries);
assert.equal(
  JSON.stringify(reviewedCourseEntries),
  reviewedCourseEntriesBeforeApply,
  "Reapplying durable review records must not change reviewed or unrelated course output.",
);

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
