const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "../..");
const candidatePath = resolve(
  ROOT,
  "artifacts/vocabflow/domain/ielts-book-c1-c2-candidates.json",
);
const previousBookCandidates = existsSync(candidatePath)
  ? JSON.parse(readFileSync(candidatePath, "utf8"))
  : null;
const existingCandidates = JSON.parse(
  readFileSync(resolve(__dirname, "ielts-expansion-candidates.json"), "utf8"),
);
const courseData = JSON.parse(
  readFileSync(
    resolve(ROOT, "artifacts/vocabflow/domain/ielts-topic-course-data.json"),
    "utf8",
  ),
);
const phrasalData = JSON.parse(
  readFileSync(
    resolve(
      ROOT,
      "artifacts/vocabflow/domain/phrasal-verb-course-data.json",
    ),
    "utf8",
  ),
);

const vocabularyPath = resolve(
  ROOT,
  "attached_assets/f8b4ed5b-ae72-4348-b292-a79900e105ee_c1_c2_vocabulary_1794952902257.txt",
);
const phrasalPath = resolve(
  ROOT,
  "attached_assets/17316810-010a-4451-87de-6e483dfe8ac5_c1_c2_phrasal_verbs_1794952902211.txt",
);

function readTerms(path) {
  return readFileSync(path, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

const previouslyImportedTerms = new Set(
  (previousBookCandidates?.topics ?? []).flatMap((topic) => topic.terms),
);
const existingIeltsTerms = new Set(
  courseData.topics
    .flatMap((topic) => [...topic.terms, ...(topic.readingTerms ?? [])])
    .map((term) => term.toLowerCase())
    .filter((term) => !previouslyImportedTerms.has(term)),
);

const vocabularyRanges = [
  [1, 41, "psychology"],
  [42, 61, "education"],
  [62, 101, "philosophy"],
  [102, 120, "technology"],
  [121, 160, "research-methods"],
  [161, 180, "work"],
  [181, 223, "geography"],
  [224, 243, "tourism"],
  [244, 283, "linguistics"],
  [284, 303, "culture"],
  [304, 341, "psychology"],
  [342, 360, "environment"],
  [361, 400, "research-methods"],
  [401, 419, "economy"],
  [420, 461, "materials-science"],
  [462, 479, "geography"],
  [480, 519, "psychology"],
  [520, 537, "health"],
  [538, 577, "government"],
  [578, 595, "society"],
  [596, 631, "research-methods"],
  [632, 650, "culture"],
  [651, 690, "society"],
  [691, 711, "society"],
  [712, 751, "psychology"],
  [752, 771, "culture"],
];

function vocabularyTopicAt(index) {
  const range = vocabularyRanges.find(
    ([first, last]) => index >= first && index <= last,
  );
  if (!range) {
    throw new Error(`No IELTS topic is assigned to vocabulary line ${index}.`);
  }
  return range[2];
}

const phrasalTopicRoutes = {
  communication: "linguistics",
  "daily-life": "psychology",
  "health-emotions": "health",
  "money-shopping": "economy",
  "other-situations": "research-methods",
  "problem-solving": "research-methods",
  "rules-safety": "government",
  technology: "technology",
  "travel-movement": "tourism",
  "work-study": "work",
};

function inferPhrasalTopic(term, existingEntry) {
  if (existingEntry?.topicId && phrasalTopicRoutes[existingEntry.topicId]) {
    return phrasalTopicRoutes[existingEntry.topicId];
  }
  if (/\b(ask|answer|blurt|confide|read|say|shout|speak|talk|tell|write)\b/.test(term)) {
    return "linguistics";
  }
  if (/\b(buy|pay|sell|shop|spend|cost)\b/.test(term)) return "economy";
  if (/\b(black out|break down|cool down|heat up|throw up|ward off|wear out)\b/.test(term)) {
    return "health";
  }
  if (/\b(come|fall|go|head|move|pass|pull|run|slip|walk)\b/.test(term)) {
    return "tourism";
  }
  if (/\b(keep|knuckle|lay off|set up|take on|work)\b/.test(term)) {
    return "work";
  }
  return "research-methods";
}

const topicMetadata = new Map(
  existingCandidates.topics.map((topic) => [topic.id, topic]),
);
const termsByTopic = new Map(
  existingCandidates.topics.map((topic) => [topic.id, []]),
);
const seen = new Set(existingIeltsTerms);
const inputCounts = {
  vocabulary: 0,
  vocabularyDuplicates: 0,
  vocabularyAlreadyInIelts: 0,
  vocabularyInvalid: 0,
  phrasalVerbs: 0,
  phrasalDuplicates: 0,
  phrasalAlreadyInIelts: 0,
};

const vocabularyTerms = readTerms(vocabularyPath);
inputCounts.vocabulary = vocabularyTerms.length;
for (const [offset, term] of vocabularyTerms.entries()) {
  if (term === "etc") {
    inputCounts.vocabularyInvalid += 1;
    continue;
  }
  if (seen.has(term)) {
    if (existingIeltsTerms.has(term)) {
      inputCounts.vocabularyAlreadyInIelts += 1;
    } else {
      inputCounts.vocabularyDuplicates += 1;
    }
    continue;
  }
  const topicId = vocabularyTopicAt(offset + 1);
  const terms = termsByTopic.get(topicId);
  if (!terms) {
    throw new Error(`Unknown vocabulary topic ${topicId} for ${term}.`);
  }
  terms.push(term);
  seen.add(term);
}

const phrasalTerms = readTerms(phrasalPath);
inputCounts.phrasalVerbs = phrasalTerms.length;
for (const term of phrasalTerms) {
  if (seen.has(term)) {
    if (existingIeltsTerms.has(term)) {
      inputCounts.phrasalAlreadyInIelts += 1;
    } else {
      inputCounts.phrasalDuplicates += 1;
    }
    continue;
  }
  const topicId = inferPhrasalTopic(term, phrasalData.entries[term]);
  const terms = termsByTopic.get(topicId);
  if (!terms) {
    throw new Error(`Unknown phrasal-verb topic ${topicId} for ${term}.`);
  }
  terms.push(term);
  seen.add(term);
}

const topics = [...termsByTopic.entries()]
  .filter(([, terms]) => terms.length > 0)
  .map(([id, terms]) => {
    const topic = topicMetadata.get(id);
    return {
      id,
      ...(topic.courseTopicId ? { courseTopicId: topic.courseTopicId } : {}),
      title: topic.title,
      focus: topic.focus,
      terms,
    };
  });

const allTerms = topics.flatMap((topic) => topic.terms);
if (allTerms.length !== 464 || new Set(allTerms).size !== allTerms.length) {
  throw new Error(
    `Expected 464 unique new terms; prepared ${allTerms.length}.`,
  );
}

writeFileSync(
  candidatePath,
  `${JSON.stringify(
    {
      provenance: {
        source: "User-provided book-extracted C1/C2 vocabulary and phrasal-verb lists",
        vocabularyInputCount: inputCounts.vocabulary,
        vocabularyAlreadyInIelts: inputCounts.vocabularyAlreadyInIelts,
        invalidVocabularyItemsExcluded: inputCounts.vocabularyInvalid,
        phrasalVerbInputCount: inputCounts.phrasalVerbs,
        reusablePhrasalEntries: phrasalTerms.filter(
          (term) => Boolean(phrasalData.entries[term]),
        ).length,
        note: "Included in IELTS Advanced based on the supplied book lists; CEFR labels were not independently verified.",
      },
      topics,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      ...inputCounts,
      importedVocabulary: topics.reduce(
        (sum, topic) =>
          sum +
          topic.terms.filter((term) => vocabularyTerms.includes(term)).length,
        0,
      ),
      importedPhrasalVerbs: topics.reduce(
        (sum, topic) =>
          sum +
          topic.terms.filter((term) => phrasalTerms.includes(term)).length,
        0,
      ),
      totalUniqueNewTerms: allTerms.length,
      reusablePhrasalEntries: phrasalTerms.filter(
        (term) => Boolean(phrasalData.entries[term]),
      ).length,
    },
    null,
    2,
  ),
);
