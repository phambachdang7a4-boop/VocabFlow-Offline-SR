const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const {
  createRepository,
  loadDictionaryDomain,
  loadLocalDictionaryAdditions,
  loadTs,
  loadToeicTopicCourseDomain,
} = require("./test-support.cjs");

const additions = loadLocalDictionaryAdditions();
const course = loadTs(
  join(__dirname, "../domain/conjunction-course.ts"),
  { "./dictionary-local-additions": additions },
);
const linkingAdverbCourse = loadTs(
  join(__dirname, "../domain/linking-adverb-course.ts"),
);
const sentenceStructurePatternCourse = loadTs(
  join(__dirname, "../domain/sentence-structure-patterns.ts"),
);
const ieltsTopicCourse = loadTs(
  join(__dirname, "../domain/ielts-topic-course.ts"),
  {
    "./ielts-topic-course-data.json": require(
      "../domain/ielts-topic-course-data.json",
    ),
  },
);
const toeicTopicCourse = loadToeicTopicCourseDomain();
const dictionaryDomain = loadDictionaryDomain();
const { applyLocalDictionaryAdditions } = loadTs(
  join(__dirname, "../data/dictionary-local-additions.ts"),
  { "../domain/dictionary-local-additions": additions },
);

const sentenceStructureAnswerUniquenessReviews = new Map([
  [
    "either … or",
    {
      answer: "either … or",
      distractors: {
        "neither … nor": "The sentence requires one of two options, not neither option.",
        "not only … but also": "This asserts both options, which conflicts with “not both.”",
        "whether … or": "This introduces alternatives for consideration but does not express the required choice.",
      },
    },
  ],
  [
    "neither … nor",
    {
      answer: "neither … nor",
      distractors: {
        "both … and": "The prompt says the plan lacked both listed features.",
        "either … or": "This presents a choice instead of denying both features.",
        "not only … but also": "This asserts that both features were present, the opposite of the prompt.",
      },
    },
  ],
  [
    "not only … but also",
    {
      answer: "not only … but also",
      distractors: {
        "either … or": "The prompt explicitly says both advantages apply.",
        "neither … nor": "This denies both advantages instead of emphasizing them.",
        "whether … or": "This frames alternatives rather than asserting both advantages.",
      },
    },
  ],
  [
    "no matter how",
    {
      answer: "no matter how",
      distractors: {
        "as long as": "This sets a condition and cannot form “as long as carefully the team checked.”",
        "provided that": "This sets a condition and cannot precede the adverb “carefully” in this structure.",
        "even though": "This cannot form the required “even though carefully” clause.",
      },
    },
  ],
  [
    "so … that",
    {
      answer: "so … that",
      distractors: {
        "such … that": "“Such” needs a noun phrase here, as in “such a vast archive.”",
        "too … to": "This cannot connect the adjective “vast” to the finite clause after the second blank.",
        "as … as": "This requires a comparison, not the result clause “the researchers needed several weeks.”",
      },
    },
  ],
  [
    "the more … the more",
    {
      answer: "the more … the more",
      distractors: {
        "as … as": "This comparison does not form the paired-correlative structure in the sentence.",
        "so … that": "This requires a result clause rather than two changing quantities.",
        "not only … but also": "This requires two parallel features, not a comparative relationship.",
      },
    },
  ],
  [
    "not only did",
    {
      answer: "not only did",
      distractors: {
        "not only does": "The sentence locates the result in last year's pilot, so present-tense “does” conflicts with the time frame.",
        "not only has": "“Has the revised schedule reduce” is not grammatical; perfect inversion needs “reduced.”",
        "not only was": "“Was the revised schedule reduce” is not grammatical; “was” cannot support this base-form verb.",
      },
    },
  ],
  [
    "no sooner … than",
    {
      answer: "no sooner … than",
      distractors: {
        "hardly … than": "The standard paired form is “hardly … when/before,” not “hardly … than.”",
        "not until … than": "“Not until” does not pair with “than” to express this immediate sequence.",
        "as soon as … than": "“As soon as” does not take “than” as its paired connector.",
      },
    },
  ],
  [
    "it was … that",
    {
      answer: "it was … that",
      distractors: {
        "there was … which": "This existential construction does not cleft the object as required by “a simple water filter.”",
        "it had … when": "This does not form an object-focused cleft and “when” cannot introduce the object.",
        "there were … where": "This does not form an object-focused cleft and “where” cannot introduce the object.",
      },
    },
  ],
  [
    "having completed",
    {
      answer: "having completed",
      distractors: {
        "completed having": "The auxiliary and participle are in the wrong order.",
        "to have complete": "The perfect infinitive requires the past participle “completed,” not “complete.”",
        "having been complete": "“Complete” is an adjective here; this form does not express the engineer finishing the inspection.",
      },
    },
  ],
  [
    "so do I",
    {
      answer: "so do I",
      distractors: {
        "neither do I": "This disagrees with the positive statement “I enjoy reading.”",
        "so have I": "The original uses present simple “enjoy,” not the present perfect.",
        "neither I do": "This has incorrect word order for an agreeing response.",
      },
    },
  ],
  [
    "neither have I",
    {
      answer: "neither have I",
      distractors: {
        "so have I": "This agrees with a positive statement, but the speaker says “haven't.”",
        "neither I have": "This has incorrect word order for the agreeing negative response.",
        "I haven't neither": "This uses a nonstandard double negative rather than the required response pattern.",
      },
    },
  ],
  [
    "one / ones",
    {
      answer: "one / ones",
      distractors: {
        "it / them": "These pronouns refer to specific objects and do not replace the repeated count nouns in the adjective phrases.",
        "this / those": "These demonstratives do not serve as the stated singular/plural noun substitutes.",
        "some / any": "These are quantifiers and do not complete “the smaller” and “the cheaper” as noun substitutes.",
      },
    },
  ],
  [
    "in advance",
    {
      answer: "in advance",
      distractors: {
        "at advance": "The time expression takes “in,” not “at.”",
        "on advance": "The time expression takes “in,” not “on.”",
        "by advance": "“By advance” is not the standard expression for registering ahead of time.",
      },
    },
  ],
  [
    "at risk of",
    {
      answer: "at risk of",
      distractors: {
        "in risk of": "The fixed expression is “at risk,” not “in risk.”",
        "on risk of": "The fixed expression is “at risk,” not “on risk.”",
        "at risk to": "The risk is followed by “of” before the potential event.",
      },
    },
  ],
  [
    "on behalf of",
    {
      answer: "on behalf of",
      distractors: {
        "at behalf of": "The fixed expression is “on behalf of,” not “at behalf of.”",
        "by behalf of": "The fixed expression is “on behalf of,” not “by behalf of.”",
        "on behalf to": "The represented group is introduced by “of,” not “to.”",
      },
    },
  ],
  [
    "rely on",
    {
      answer: "rely on",
      distractors: {
        "rely to": "The verb “rely” takes “on,” not “to,” for the source of support.",
        "rely for": "“For” does not introduce the people providing the directions after “rely.”",
        "rely with": "The verb “rely” takes “on” before the guides being trusted.",
      },
    },
  ],
  [
    "apologize for",
    {
      answer: "apologize for",
      distractors: {
        "apologize of": "The thing being apologized for is introduced by “for.”",
        "apologize with": "“With” does not introduce the delay as the reason for the apology.",
        "apologize from": "“From” does not introduce the event being apologized for.",
      },
    },
  ],
  [
    "be responsible for",
    {
      answer: "be responsible for",
      distractors: {
        "be responsible of": "The adjective takes “for” before a duty or action.",
        "be responsible with": "“With” does not introduce the project lead's assigned duty.",
        "be responsible from": "“From” does not introduce a responsibility.",
      },
    },
  ],
  [
    "be familiar with",
    {
      answer: "be familiar with",
      distractors: {
        "be familiar on": "The adjective takes “with” before a process someone knows.",
        "be familiar from": "“From” does not introduce the subject someone knows.",
        "be familiar over": "“Over” does not introduce the subject someone knows.",
      },
    },
  ],
  [
    "access to",
    {
      answer: "access to",
      distractors: {
        "access for": "The noun “access” takes “to” before the resource available.",
        "access with": "“With” does not introduce the resource available to students.",
        "access on": "The noun “access” takes “to,” not “on,” before the resource.",
      },
    },
  ],
  [
    "prevent someone from",
    {
      answer: "prevent someone from",
      distractors: {
        "prevent someone to": "The verb pattern is “prevent someone from doing,” not an infinitive with “to.”",
        "prevent someone of": "The verb pattern requires “from” before the action.",
        "prevent someone with": "“With” does not introduce the action being prevented.",
      },
    },
  ],
  [
    "take part in",
    {
      answer: "take part in",
      distractors: {
        "take part at": "The fixed expression is “take part in” an event.",
        "take part of": "“Part of” means a portion of something and does not mean participate in it.",
        "take part by": "“By” does not introduce the event someone participates in.",
      },
    },
  ],
  [
    "in September",
    {
      answer: "in September",
      distractors: {
        "on September": "A month without a specific date takes “in.”",
        "at September": "A month without a specific date takes “in.”",
        "in the September": "Month names used this way do not take “the.”",
      },
    },
  ],
  [
    "on 2 June",
    {
      answer: "on 2 June",
      distractors: {
        "in 2 June": "A specific calendar date takes “on,” not “in.”",
        "at 2 June": "A specific calendar date takes “on,” not “at.”",
        "on the 2 June": "The date is conventionally written “on 2 June” without “the.”",
      },
    },
  ],
  [
    "at 8:30 a.m.",
    {
      answer: "at 8:30 a.m.",
      distractors: {
        "in 8:30 a.m.": "A specific clock time takes “at.”",
        "on 8:30 a.m.": "A specific clock time takes “at,” not “on.”",
        "on the 8:30 a.m.": "A clock time takes “at”; “on the 8:30 a.m.” is not a grammatical time phrase.",
      },
    },
  ],
  [
    "in the morning",
    {
      answer: "in the morning",
      distractors: {
        "on the morning": "The general period of a day takes “in” in this expression.",
        "at the morning": "The general period of a day takes “in” in this expression.",
        "in morning": "This general time expression requires the article “the.”",
      },
    },
  ],
  [
    "at night",
    {
      answer: "at night",
      distractors: {
        "in night": "The standard general time expression is “at night.”",
        "on night": "The standard general time expression is “at night.”",
        "at the night": "The general time expression normally omits “the.”",
      },
    },
  ],
  [
    "in a small drawer",
    {
      answer: "in a small drawer",
      distractors: {
        "on a small drawer": "The key is inside the drawer, not on its surface.",
        "at a small drawer": "“At” identifies a point or location, not containment inside a drawer.",
        "over a small drawer": "“Over” places the key above the drawer rather than inside it.",
      },
    },
  ],
  [
    "on the desk",
    {
      answer: "on the desk",
      distractors: {
        "in the desk": "The prompt specifies the top surface, not inside the desk.",
        "at the desk": "This means at the desk location, not resting on its top surface.",
        "under the desk": "This places the form below the desk, contrary to the prompt.",
      },
    },
  ],
  [
    "at the main entrance",
    {
      answer: "at the main entrance",
      distractors: {
        "in the main entrance": "The speaker waits outside the building, not inside an entrance area.",
        "on the main entrance": "“On” would place the person on the entrance structure, not at the location.",
        "through the main entrance": "“Through” describes movement via the entrance, not waiting outside it.",
      },
    },
  ],
  [
    "in Singapore",
    {
      answer: "in Singapore",
      distractors: {
        "on Singapore": "A city or country is expressed with “in.”",
        "at Singapore": "A city or country is expressed with “in,” not “at.”",
        "through Singapore": "“Through” describes movement across a place, not living there.",
      },
    },
  ],
  [
    "believe in",
    {
      answer: "believe in",
      distractors: {
        "believe on": "The fixed expression meaning have faith in a principle is “believe in.”",
        "believe at": "“At” does not introduce the principle someone accepts as valuable.",
        "believe for": "“For” does not introduce the object of belief in this meaning.",
      },
    },
  ],
  [
    "focus on",
    {
      answer: "focus on",
      distractors: {
        "focus in": "The verb takes “on” before the subject receiving attention.",
        "focus at": "“At” does not introduce the topic receiving attention.",
        "focus for": "“For” does not introduce the topic receiving attention.",
      },
    },
  ],
  [
    "good at",
    {
      answer: "good at",
      distractors: {
        "good in": "The usual pattern for ability at an activity is “good at.”",
        "good on": "“On” does not introduce an activity someone performs well.",
        "good for": "“Good for” means beneficial or suitable, not skilled at an activity.",
      },
    },
  ],
  [
    "interested in",
    {
      answer: "interested in",
      distractors: {
        "interested on": "The adjective takes “in” before a subject of interest.",
        "interested at": "“At” does not introduce the subject someone wants to learn about.",
        "interested for": "The adjective takes “in” before the subject of interest.",
      },
    },
  ],
]);

// Add a { term, alternative } entry when an audit finds a second plausible answer.
// The check below intentionally fails until the question is rewritten or the
// competing choice is removed.
const sentenceStructureAmbiguityFindings = [];

function checkSentenceStructureAnswerUniqueness(questions) {
  assert.equal(
    sentenceStructureAmbiguityFindings.length,
    0,
    `Sentence-structure questions have multiple plausible answers: ${sentenceStructureAmbiguityFindings
      .map(({ term, alternative }) => `${term}: ${alternative}`)
      .join("; ")}. Rewrite the prompt or remove the competing choice.`,
  );
  const questionsByTerm = new Map(
    questions.map((question) => [question.term, question]),
  );
  assert.equal(
    sentenceStructureAnswerUniquenessReviews.size,
    questionsByTerm.size,
    "Every sentence-structure grammar question must have a uniqueness review.",
  );
  for (const question of questions) {
    const review = sentenceStructureAnswerUniquenessReviews.get(question.term);
    assert.ok(
      review,
      `${question.term} is missing its answer-uniqueness review.`,
    );
    assert.equal(
      review.answer,
      question.term,
      `${question.term} must be reviewed against its keyed answer.`,
    );
    const distractorChoices = question.choices.filter(
      (choice) => choice !== question.term,
    );
    assert.deepEqual(
      Object.keys(review.distractors).sort(),
      [...distractorChoices].sort(),
      `${question.term} must review every distractor and no other choice.`,
    );
    for (const [choice, reason] of Object.entries(review.distractors)) {
      assert.ok(
        typeof reason === "string" && reason.trim().length >= 20,
        `${question.term}: explain why “${choice}” cannot also be correct.`,
      );
    }
  }
  for (const term of sentenceStructureAnswerUniquenessReviews.keys()) {
    assert.ok(
      questionsByTerm.has(term),
      `${term} has a uniqueness review but no grammar question.`,
    );
  }
}

async function checkDictionaryOverlay() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      lang_code TEXT NOT NULL DEFAULT 'vi'
    );
    CREATE TABLE definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      definition TEXT NOT NULL,
      pos TEXT,
      sub_pos TEXT,
      definition_lang TEXT DEFAULT 'vi',
      UNIQUE(definition, pos, sub_pos)
    );
    CREATE TABLE word_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      definition_id INTEGER NOT NULL,
      example TEXT
    );
  `);
  const existingToeicEntry = additions.TOEIC_TOPIC_DICTIONARY_ADDITIONS[0];
  const existingWordId = sqlite
    .prepare("INSERT INTO words (word, lang_code) VALUES (?, 'en')")
    .run(existingToeicEntry.term).lastInsertRowid;
  const existingDefinitionId = sqlite
    .prepare(
      "INSERT INTO definitions (definition, pos, sub_pos, definition_lang) VALUES (?, 'n', NULL, 'vi')",
    )
    .run("Nghĩa đã có trong từ điển gốc.").lastInsertRowid;
  sqlite
    .prepare(
      "INSERT INTO word_definitions (word_id, definition_id, example) VALUES (?, ?, ?)",
    )
    .run(existingWordId, existingDefinitionId, "An existing dictionary example.");
  const db = {
    getFirstAsync: async (sql, ...params) =>
      sqlite.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) =>
      sqlite.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    withTransactionAsync: async (callback) => {
      sqlite.exec("BEGIN");
      try {
        await callback();
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };

  await applyLocalDictionaryAdditions(db);
  await applyLocalDictionaryAdditions(db);
  const rows = sqlite
    .prepare(
      `SELECT w.word, d.definition, d.pos, d.sub_pos AS subPos,
        wd.example, w.lang_code AS langCode
       FROM words w
       JOIN word_definitions wd ON wd.word_id = w.id
       JOIN definitions d ON d.id = wd.definition_id
       ORDER BY w.word`,
    )
    .all();
  assert.equal(
    rows.length,
    additions.ALL_LOCAL_DICTIONARY_ADDITIONS.length + 1,
    "Overlay preserves an existing dictionary meaning and adds the course meaning.",
  );
  assert.equal(
    new Set(rows.map((row) => row.word)).size,
    additions.ALL_LOCAL_DICTIONARY_ADDITIONS.length,
  );
  for (const entry of additions.ALL_LOCAL_DICTIONARY_ADDITIONS) {
    const row = rows.find(
      (item) =>
        item.word === entry.term &&
        item.definition === entry.definition &&
        item.example === entry.example,
    );
    assert.ok(row, `${entry.term} exists in the offline dictionary.`);
    assert.equal(row.definition, entry.definition);
    assert.equal(row.example, entry.example);
    assert.equal(row.pos, entry.pos);
    assert.equal(row.subPos, entry.subPos);
    assert.equal(row.langCode, "en");
  }
  assert.ok(
    rows.some(
      (row) =>
        row.word === existingToeicEntry.term &&
        row.definition === "Nghĩa đã có trong từ điển gốc.",
    ),
    "Adding a course sense does not replace an existing dictionary meaning.",
  );
  assert.equal(dictionaryDomain.dictionaryPartOfSpeech("conj"), "conjunction");
  const draft = dictionaryDomain.dictionaryDraft(
    {
      id: 900001,
      term: "as if",
      pronunciations: [],
    },
    {
      id: 900001,
      definition: additions.LOCAL_DICTIONARY_ADDITIONS[0].definition,
      pos: "conj",
      subPos: "subordinating",
      example: additions.LOCAL_DICTIONARY_ADDITIONS[0].example,
    },
  );
  assert.match(draft.note, /biên soạn cho VocabFlow/);
  const flyAddition = additions.LOCAL_DICTIONARY_WORD_ADDITIONS[0];
  const flyDraft = dictionaryDomain.dictionaryDraft(
    { id: 900002, term: flyAddition.term, pronunciations: [] },
    {
      id: 900002,
      definition: flyAddition.definition,
      pos: flyAddition.pos,
      subPos: flyAddition.subPos,
      example: flyAddition.example,
    },
  );
  assert.equal(flyDraft.meaning, `(Verb) ${flyAddition.definition}`);
  assert.equal(flyDraft.example, "The birds have flown south for the winter.");
  assert.match(flyDraft.note, /biên soạn cho VocabFlow/);
  sqlite.close();
}

async function checkCourseContentAndProgress() {
  const entries = new Map(
    additions.LOCAL_DICTIONARY_ADDITIONS.map((entry) => [entry.term, entry]),
  );
  const seenQuestions = new Set();
  const courseTerms = [];
  for (const lesson of course.CONJUNCTION_COURSE_LESSONS) {
    assert.ok(lesson.questions.length > 0);
    for (const question of lesson.questions) {
      assert.ok(entries.has(question.term), `${question.term} has dictionary data.`);
      assert.ok(question.prompt.includes("_____"), "Every exercise has one clear blank.");
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      const key = `${lesson.id}:${question.term}`;
      assert.ok(!seenQuestions.has(key), `${question.term} is not repeated in a lesson.`);
      seenQuestions.add(key);
      courseTerms.push(question.term);
    }
  }
  assert.equal(courseTerms.length, entries.size, "Every new entry appears in one exercise.");
  assert.equal(new Set(courseTerms).size, entries.size);
  assert.equal(course.CONJUNCTION_COURSE_TITLE, "Cấu trúc câu & từ nối");
  assert.equal(course.CONJUNCTION_COURSE_ENTRY_BY_TERM.size, entries.size);
  for (const entry of course.CONJUNCTION_COURSE_ENTRY_BY_TERM.values()) {
    assert.match(entry.definition, /Ghi chú:/, `${entry.term} explains related terms.`);
  }
  const conjunctionQuestionByTerm = new Map(
    course.CONJUNCTION_COURSE_LESSONS.flatMap((lesson) =>
      lesson.questions.map((question) => [question.term, question]),
    ),
  );
  for (const [term, distractor] of [
    ["as soon as", "by the time"],
    ["by the time", "as soon as"],
    ["now when", "now that"],
    ["now that", "now when"],
    ["as though", "just as"],
    ["as far as", "just as"],
    ["as far as", "inasmuch as"],
  ]) {
    assert.ok(
      !conjunctionQuestionByTerm.get(term).choices.includes(distractor),
      `${term} does not compete with the similar answer ${distractor}.`,
    );
  }
  assert.match(
    conjunctionQuestionByTerm.get("even if").prompt,
    /forecast is uncertain/i,
  );
  assert.match(
    conjunctionQuestionByTerm.get("even though").prompt,
    /in fact/i,
  );
  assert.match(conjunctionQuestionByTerm.get("if only").prompt, /!/);
  assert.match(
    conjunctionQuestionByTerm.get("now when").prompt,
    /used to ignore the old school bell/i,
  );
  assert.ok(
    !conjunctionQuestionByTerm.get("even though").choices.includes("even if"),
    "A factual concession does not offer the hypothetical even-if alternative.",
  );
  assert.ok(
    !conjunctionQuestionByTerm.get("as much as").choices.includes("just as"),
    "The concessive as much as question does not offer the potentially competing just-as phrase.",
  );

  const linkingTerms = Object.keys(
    linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES,
  );
  const linkedQuestions = linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  assert.equal(
    linkingAdverbCourse.LINKING_ADVERB_COURSE_TITLE,
    "Trạng từ liên kết",
  );
  assert.equal(linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS.length, 3);
  assert.equal(linkingTerms.length, 17);
  assert.ok(!linkingTerms.includes("first"));
  assert.ok(!linkingTerms.includes("next"));
  assert.equal(linkedQuestions.length, linkingTerms.length);
  assert.deepEqual(
    [...linkedQuestions.map((question) => question.term)].sort(),
    [...linkingTerms].sort(),
    "Every linking adverb has one exercise.",
  );
  for (const lesson of linkingAdverbCourse.LINKING_ADVERB_COURSE_LESSONS) {
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(
        linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES[question.term],
      );
      assert.match(
        linkingAdverbCourse.LINKING_ADVERB_COURSE_ENTRIES[question.term]
          .definition,
        /Ghi chú:/,
        `${question.term} explains related linking adverbs.`,
      );
    }
  }
  const linkingQuestionByTerm = new Map(
    linkedQuestions.map((question) => [question.term, question]),
  );
  for (const [term, distractor] of [
    ["hence", "instead"],
    ["therefore", "moreover"],
    ["then", "accordingly"],
    ["meanwhile", "accordingly"],
    ["finally", "therefore"],
    ["indeed", "however"],
    ["indeed", "then"],
  ]) {
    assert.ok(
      !linkingQuestionByTerm.get(term).choices.includes(distractor),
      `${term} does not compete with the similar answer ${distractor}.`,
    );
  }
  assert.match(
    linkingQuestionByTerm.get("finally").prompt,
    /after an hour of checking every sheet.*at last/i,
    "The finally question establishes a completed search rather than a generic result.",
  );
  assert.match(
    linkingQuestionByTerm.get("indeed").prompt,
    /confirming how strenuous it was/i,
    "The indeed question makes the second clause explicit evidence for the first.",
  );
  assert.ok(
    !linkingQuestionByTerm.get("meanwhile").choices.includes("accordingly"),
    "The concurrent task does not offer accordingly as a second plausible connector.",
  );

  const patternLessons =
    sentenceStructurePatternCourse.SENTENCE_STRUCTURE_PATTERN_LESSONS;
  const patternEntries =
    sentenceStructurePatternCourse.SENTENCE_STRUCTURE_PATTERN_ENTRIES;
  const patternQuestions = patternLessons.flatMap((lesson) => lesson.questions);
  checkSentenceStructureAnswerUniqueness(patternQuestions);
  const patternTerms = Object.keys(patternEntries);
  assert.deepEqual(
    patternLessons.map((lesson) => lesson.title),
    [
      "Cặp liên từ và cấu trúc song hành",
      "Điều kiện, nhượng bộ và kết quả",
      "Đảo ngữ và câu nhấn mạnh",
      "Mệnh đề rút gọn, thay thế và lược bỏ",
      "Giới từ trong cụm thường gặp",
      "Phân biệt in, on và at",
    ],
  );
  const patternQuestionByTerm = new Map(
    patternQuestions.map((question) => [question.term, question]),
  );
  assert.match(
    patternQuestionByTerm.get("neither … nor").prompt,
    /it lacked both/i,
    "The paired-conjunction prompt establishes that both features are absent.",
  );
  assert.ok(
    !patternQuestionByTerm.get("so do I").choices.includes("so I do"),
    "The agreement question excludes the grammatical confirmation phrase so I do.",
  );
  assert.match(
    patternQuestionByTerm.get("on the desk").prompt,
    /top surface rather than inside a drawer/i,
    "The location question distinguishes the desk top from other desk locations.",
  );
  assert.equal(patternTerms.length, 36);
  assert.equal(patternQuestions.length, patternTerms.length);
  assert.deepEqual(
    [...patternQuestions.map((question) => question.term)].sort(),
    [...patternTerms].sort(),
    "Every added structure has one practice question.",
  );
  for (const lesson of patternLessons) {
    assert.ok(lesson.questions.length > 0);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(patternEntries[question.term]);
    }
  }
  for (const [term, entry] of Object.entries(patternEntries)) {
    assert.ok(term.includes(" "), `${term} is a multiword grammar pattern.`);
    assert.ok(entry.definition.trim(), `${term} has a Vietnamese explanation.`);
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
  }
  const prepositionTerms = [
    "in advance",
    "at risk of",
    "on behalf of",
    "rely on",
    "apologize for",
    "be responsible for",
    "be familiar with",
    "access to",
    "prevent someone from",
    "take part in",
  ];
  const prepositionLesson = patternLessons.find((lesson) =>
    lesson.id.endsWith("-preposition-patterns"),
  );
  assert.equal(
    sentenceStructurePatternCourse.SENTENCE_STRUCTURE_PATTERN_COURSE_ID,
    "sentence-structure-patterns-v1",
    "Adding patterns preserves the existing course ID.",
  );
  assert.ok(prepositionLesson);
  assert.deepEqual(
    prepositionLesson.questions.map((question) => question.term),
    prepositionTerms,
  );
  for (const question of prepositionLesson.questions) {
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.term));
    assert.ok(
      question.prompt.includes("_____"),
      `${question.term} has a fill-in question.`,
    );
  }
  const inOnAtLesson = patternLessons.find((lesson) =>
    lesson.id.endsWith("-in-on-at"),
  );
  const inOnAtTerms = [
    "in September",
    "on 2 June",
    "at 8:30 a.m.",
    "in the morning",
    "at night",
    "in a small drawer",
    "on the desk",
    "at the main entrance",
    "in Singapore",
    "believe in",
    "focus on",
    "good at",
    "interested in",
  ];
  assert.ok(inOnAtLesson);
  assert.match(inOnAtLesson.focus, /\bin, on hoặc at\b/);
  assert.deepEqual(
    inOnAtLesson.questions.map((question) => question.term),
    inOnAtTerms,
  );
  for (const question of inOnAtLesson.questions) {
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.term));
    assert.ok(question.prompt.includes("_____"));
    assert.ok(
      patternEntries[question.term].example.toLowerCase().includes(
        question.term.toLowerCase(),
      ),
      `${question.term} appears in its English example.`,
    );
  }
  assert.equal(
    new Set([...courseTerms, ...linkedQuestions.map((question) => question.term), ...patternTerms]).size,
    courseTerms.length + linkedQuestions.length + patternTerms.length,
    "Added patterns do not duplicate existing course items.",
  );

  const ieltsTerms = ieltsTopicCourse.IELTS_TOPIC_WORD_LIST.flatMap(
    (topic) => topic.terms,
  );
  const ieltsQuestions = ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  assert.equal(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_TITLE,
    "Từ vựng IELTS theo chủ đề",
  );
  assert.equal(ieltsTopicCourse.IELTS_TOPIC_WORD_LIST.length, 36);
  assert.ok(ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.length > 50);
  assert.deepEqual(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.map((lesson) => lesson.title),
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS.map(
      (_, index) => `Bài ${index + 1}`,
    ),
    "IELTS lesson display numbers are continuous across all topics.",
  );
  assert.ok(ieltsTerms.length >= 1100 && ieltsTerms.length <= 2000);
  assert.equal(new Set(ieltsTerms).size, ieltsTerms.length);
  assert.equal(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_WORD_COUNT,
    ieltsTerms.length,
  );
  assert.deepEqual(
    [...ieltsQuestions.map((question) => question.term)].sort(),
    [...ieltsTerms].sort(),
    "Every IELTS word has one exercise.",
  );
  assert.deepEqual(
    Object.keys(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES).sort(),
    [...ieltsTerms].sort(),
    "Every IELTS word has course feedback content.",
  );
  for (const [term, entry] of Object.entries(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES,
  )) {
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
    assert.notEqual(
      entry.exampleTranslation,
      entry.example,
      `${term} keeps its English example separate from the translation.`,
    );
  }
  assert.ok(
    Object.values(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES).some(
      (entry) => entry.dictionarySource === "authored",
    ),
    "Authored entries support IELTS terms absent from the offline dictionary.",
  );
  assert.deepEqual(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS
      .filter(
        (lesson) =>
          lesson.id.startsWith("ielts-topic-vocabulary-v1-") &&
          !lesson.id.includes("-lesson-"),
      )
      .slice(0, 5)
      .map((lesson) => lesson.id),
    [
      "ielts-topic-vocabulary-v1-education",
      "ielts-topic-vocabulary-v1-environment",
      "ielts-topic-vocabulary-v1-technology",
      "ielts-topic-vocabulary-v1-health",
      "ielts-topic-vocabulary-v1-society-work",
    ],
    "Existing lesson IDs remain stable so saved progress remains visible.",
  );
  for (const lesson of ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS) {
    assert.ok(lesson.questions.length > 0 && lesson.questions.length <= 35);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(ieltsTopicCourse.IELTS_TOPIC_COURSE_ENTRIES[question.term]);
    }
  }
  assert.ok(
    ieltsTopicCourse.IELTS_TOPIC_COURSE_LESSONS
      .filter((lesson) => lesson.id.includes("-lesson-"))
      .every((lesson) => lesson.questions.length >= 15),
    "New lessons use substantial word groups.",
  );

  const toeicTerms = toeicTopicCourse.TOEIC_TOPIC_WORD_LIST.flatMap(
    (topic) => topic.terms,
  );
  const toeicQuestions = toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.flatMap(
    (lesson) => lesson.questions,
  );
  const toeicDictionaryTerms = new Set(
    additions.TOEIC_TOPIC_DICTIONARY_ADDITIONS.map((entry) => entry.term),
  );
  assert.equal(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_TITLE,
    "Cụm từ TOEIC theo chủ đề",
  );
  assert.equal(toeicTopicCourse.TOEIC_TOPIC_WORD_LIST.length, 10);
  assert.ok(toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.length >= 100);
  assert.deepEqual(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.map((lesson) => lesson.title),
    toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS.map(
      (_, index) => `Bài ${index + 1}`,
    ),
    "TOEIC lesson display numbers are continuous across all topics.",
  );
  assert.equal(toeicTerms.length, 3000);
  assert.equal(new Set(toeicTerms).size, toeicTerms.length);
  assert.equal(
    additions.TOEIC_TOPIC_DICTIONARY_ADDITIONS.length,
    toeicTerms.length,
    "Every TOEIC course phrase is also installed in the offline dictionary.",
  );
  assert.ok(
    toeicTerms.every((term) => toeicDictionaryTerms.has(term)),
    "Course phrases and offline dictionary entries stay aligned.",
  );
  assert.equal(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_WORD_COUNT,
    toeicTerms.length,
  );
  assert.deepEqual(
    [...toeicQuestions.map((question) => question.term)].sort(),
    [...toeicTerms].sort(),
    "Every TOEIC word has one exercise.",
  );
  assert.deepEqual(
    Object.keys(toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES).sort(),
    [...toeicTerms].sort(),
    "Every TOEIC word has course feedback content.",
  );
  for (const [term, entry] of Object.entries(
    toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES,
  )) {
    assert.ok(entry.example.trim(), `${term} has an English example.`);
    assert.ok(
      entry.exampleTranslation.trim(),
      `${term} has a Vietnamese example translation.`,
    );
    assert.notEqual(
      entry.exampleTranslation,
      entry.example,
      `${term} keeps its English example separate from its translation.`,
    );
  }
  for (const term of toeicTerms) {
    const entry = toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES[term];
    assert.ok(
      term.split(/\s+/).length >= 2,
      `${term} is a phrase, not a standalone word.`,
    );
    assert.ok(
      entry.example.toLowerCase().includes(term.toLowerCase()),
      `${term} appears in its example.`,
    );
  }
  for (const lesson of toeicTopicCourse.TOEIC_TOPIC_COURSE_LESSONS) {
    assert.ok(lesson.questions.length >= 10 && lesson.questions.length <= 35);
    assert.ok(lesson.topicTitle);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.includes("_____"));
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.term));
      assert.ok(toeicTopicCourse.TOEIC_TOPIC_COURSE_ENTRIES[question.term]);
    }
  }

  const root = mkdtempSync(join(tmpdir(), "vocabflow-conjunction-progress-"));
  const repository = createRepository(root);
  const { repo } = repository;
  try {
    const lessonId = `${course.CONJUNCTION_COURSE_ID}-time`;
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [],
    );
    await repo.markCourseLessonCompleted(lessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [lessonId],
    );
    await repo.markCourseLessonCompleted(lessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(course.CONJUNCTION_COURSE_ID),
      [lessonId],
      "Completing a lesson repeatedly does not duplicate its progress.",
    );
    const toeicLessonId =
      `${toeicTopicCourse.TOEIC_TOPIC_COURSE_ID}-office-issues-lesson-1`;
    await repo.markCourseLessonCompleted(toeicLessonId);
    assert.deepEqual(
      await repo.getCourseLessonCompletions(
        toeicTopicCourse.TOEIC_TOPIC_COURSE_ID,
      ),
      [toeicLessonId],
      "TOEIC lesson completion is stored separately from other courses.",
    );
    const db = repository.db;
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS count FROM course_lesson_progress")
        .get().count,
      2,
    );
  } finally {
    repository.db?.close();
    rmSync(root, { recursive: true, force: true });
  }
}

(async () => {
  await checkDictionaryOverlay();
  await checkCourseContentAndProgress();
  console.log("Conjunction dictionary overlay and course checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
