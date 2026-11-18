const fs = require("node:fs");
const path = require("node:path");

const domainDir = path.join(__dirname, "../domain");
const advancedData = require("../domain/ielts-advanced-terms.json");
const courseData = require("../domain/ielts-topic-course-data.json");

// Exact source rows transcribed from the CEFR-J Wordlist v1.6 ALL sheet.
// The four POS conflicts are recorded separately and do not assign a level.
const sourceRows = [
  ["environment", "ecological", "adjective", "B1"],
  ["environment", "deforestation", "noun", "B2"],
  ["environment", "debris", "noun", "B1"],
  ["environment", "devastate", "verb", "B1"],
  ["environment", "climate change", "noun", "B2"],
  ["environment", "carbon footprint", "noun", "B2"],
  ["technology", "circuitry", "noun", "B2"],
  ["society-work", "resignation", "noun", "B2"],
  ["society", "diversion", "noun", "B2"],
  ["work", "redundant", "adjective", "B2"],
  ["economy", "accumulate", "verb", "B2"],
  ["economy", "deficit", "noun", "B2"],
  ["economy", "lucrative", "adjective", "B2"],
  ["economy", "offshore", "adjective", "B2"],
  ["economy", "fiscal", "adjective", "B2"],
  ["economy", "bankruptcy", "noun", "B2"],
  ["economy", "exchange rate", "noun", "B1"],
  ["tourism", "excursion", "noun", "B2"],
  ["tourism", "trek", "noun", "B2"],
  ["tourism", "voyage", "noun", "B1"],
  ["tourism", "souvenir", "noun", "B1"],
  ["culture", "impressionism", "noun", "B2"],
  ["government", "legislation", "noun", "B2"],
  ["government", "legislative", "adjective", "B2"],
  ["government", "legislator", "noun", "B2"],
  ["government", "abolish", "verb", "B2"],
  ["government", "consensus", "noun", "B2"],
  ["government", "enforce", "verb", "B2"],
  ["government", "invoke", "verb", "B2"],
  ["government", "regime", "noun", "B2"],
  ["government", "coalition", "noun", "B2"],
  ["government", "bureaucracy", "noun", "B2"],
  ["crime", "notorious", "adjective", "B1"],
  ["crime", "surveillance", "noun", "B2"],
  ["science", "catalyst", "noun", "B2"],
  ["science", "microscopic", "adjective", "B2"],
  ["science", "resonant", "adjective", "B2"],
  ["language", "acquisition", "noun", "B2"],
  ["sports", "endurance", "noun", "B2"],
  ["equality", "oppression", "noun", "B1"],
  ["development", "sanitation", "noun", "B2"],
  ["biodiversity", "ecologically", "adverb", "B2"],
  ["psychology", "adversity", "noun", "B2"],
  ["psychology", "aspiration", "noun", "B2"],
  ["psychology", "aspire", "verb", "B2"],
  ["psychology", "conceivable", "adjective", "B2"],
  ["psychology", "despair", "noun", "B1"],
  ["psychology", "folly", "noun", "B2"],
  ["psychology", "grim", "adjective", "B2"],
  ["psychology", "meditate", "verb", "B1"],
  ["psychology", "mystify", "verb", "B2"],
  ["psychology", "obsessive", "adjective", "B2"],
  ["psychology", "procrastination", "noun", "B1"],
  ["psychology", "subconscious", "adjective", "B1"],
  ["biology", "microorganism", "noun", "B2"],
  ["biology", "biotechnology", "noun", "B2"],
  ["academic-methods", "deduce", "verb", "B2"],
  ["academic-methods", "paradox", "noun", "B2"],
  ["geography", "picturesque", "adjective", "B2"],
  ["geography", "proximity", "noun", "B2"],
  ["geography", "subcontinent", "noun", "B2"],
  ["geography", "nomad", "noun", "B2"],
  ["materials-science", "inert", "adjective", "B2"],
];

const posMismatches = [
  ["media", "circular", "adjective", "B1"],
  ["government", "imperative", "noun", "B2"],
  ["language", "articulate", "verb", "B2"],
  ["psychology", "disillusion", "verb", "B2"],
];

const localPosName = {
  N: "noun",
  V: "verb",
  A: "adjective",
  D: "adverb",
  C: "conjunction",
  P: "preposition",
  I: "interjection",
};
const legacyCoreTerms = new Set(
  courseData.topics.flatMap(
    (topic) => topic.legacyLesson?.questions.map((question) => question.term) ?? [],
  ),
);
const exactSourceRows = new Map(
  sourceRows.map(([topic, term, partOfSpeech, level]) => [
    term.toLocaleLowerCase("en"),
    { topic, partOfSpeech, level },
  ]),
);
const mismatchRows = new Map(
  posMismatches.map(([topic, term, partOfSpeech, level]) => [
    term.toLocaleLowerCase("en"),
    { topic, partOfSpeech, level },
  ]),
);

if (exactSourceRows.size !== 63 || mismatchRows.size !== 4) {
  throw new Error("The reviewed CEFR-J row counts changed unexpectedly.");
}

const topicOrder = Object.keys(advancedData.termsByTopic);
const sourceTermsByTopic = new Map(
  topicOrder.map((topic) => [topic, [...advancedData.termsByTopic[topic]]]),
);
for (const [topic, term] of sourceRows) {
  if (!sourceTermsByTopic.has(topic)) {
    throw new Error(`Unknown IELTS topic for source match: ${topic}`);
  }
  sourceTermsByTopic.get(topic).push(term);
}
for (const [topic, term] of posMismatches) {
  if (!sourceTermsByTopic.has(topic)) {
    throw new Error(`Unknown IELTS topic for POS conflict: ${topic}`);
  }
  if (!sourceTermsByTopic.get(topic).includes(term)) {
    throw new Error(`POS-conflict term is missing from IELTS Advanced: ${term}`);
  }
}

const items = [];
for (const topic of topicOrder) {
  for (const term of sourceTermsByTopic.get(topic)) {
    const key = term.toLocaleLowerCase("en");
    const exact = exactSourceRows.get(key);
    const mismatch = mismatchRows.get(key);
    const entry = courseData.entries[term];
    if (!entry) throw new Error(`Missing course entry for ${term}.`);

    const localPartOfSpeech =
      localPosName[entry.partOfSpeech] ?? entry.posGroup ?? "unknown";
    const item = {
      topic,
      term,
      localPartOfSpeech,
      comparison: "not_listed",
      sourceLevel: null,
      sourcePartOfSpeech: null,
      assignment: "IELTS Nâng cao",
    };
    if (exact) {
      if (exact.topic !== topic || exact.partOfSpeech !== localPartOfSpeech) {
        throw new Error(`Source match does not agree with course data: ${term}`);
      }
      item.comparison = "exact_headword_and_part_of_speech";
      item.sourceLevel = exact.level;
      item.sourcePartOfSpeech = exact.partOfSpeech;
      item.assignment = "IELTS";
    } else if (mismatch) {
      if (mismatch.topic !== topic || mismatch.partOfSpeech === localPartOfSpeech) {
        throw new Error(`Expected POS conflict does not match: ${term}`);
      }
      item.comparison = "headword_found_part_of_speech_differs";
      item.sourcePartOfSpeech = mismatch.partOfSpeech;
      item.sourceLevelObserved = mismatch.level;
    } else if (legacyCoreTerms.has(term)) {
      item.assignment = "IELTS";
    }
    items.push(item);
  }
}

const terms = items.map((item) => item.term.toLocaleLowerCase("en"));
if (items.length !== 777 || new Set(terms).size !== items.length) {
  throw new Error(`Expected 777 unique reviewed terms; got ${items.length}.`);
}
const exactMatches = items.filter(
  (item) => item.comparison === "exact_headword_and_part_of_speech",
);
if (
  exactMatches.length !== 63 ||
  exactMatches.filter((item) => item.sourceLevel === "B1").length !== 12 ||
  exactMatches.filter((item) => item.sourceLevel === "B2").length !== 51
) {
  throw new Error("Exact CEFR-J match totals changed unexpectedly.");
}

const review = {
  title: "IELTS Advanced CEFR-J comparison",
  reviewedOn: "2026-11-18",
  reviewedTermCount: items.length,
  scopeNote:
    "The task brief named 694 terms; the file contained 777 distinct terms when reviewed, so the comparison covers all 777 present at that time.",
  source: {
    name: "CEFR-J Wordlist Version 1.6",
    compiler: "Yukio Tono, Tokyo University of Foreign Studies",
    retrievedFrom: "https://www.cefr-j.org/download.html",
    citation:
      "The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from https://www.cefr-j.org/download.html on 2026-11-18.",
    rights:
      "The source page identifies Tono Laboratory at TUFS as copyright holder and permits research and commercial use with proper acknowledgement.",
    coverage:
      "The published vocabulary levels cover A1 through B2, with headwords and parts of speech. The source describes its list as textbook-corpus-based and notes it may contain errors.",
  },
  method: {
    matching:
      "Compared case-insensitive exact headwords and the course entry's part of speech against the CEFR-J v1.6 ALL sheet. No inflection, spelling, or phrase-component matching was used.",
    reassignment:
      "Exact headword-and-part-of-speech matches reported at A1–B2 were moved to the standard IELTS course. A headword match with a different part of speech was not assigned that source level and remains in IELTS Advanced.",
    limits:
      "CEFR-J v1.6 stops at B2. A missing or part-of-speech-mismatched entry does not establish C1 or C2 and receives no CEFR label.",
    labels:
      "Levels in sourceLevel reproduce the CEFR-J source entry only; they are not presented as an official CEFR certification for the learner or the course.",
  },
  summary: {
    exactHeadwordAndPartOfSpeechMatches: 63,
    exactMatchesBySourceLevel: { B1: 12, B2: 51 },
    headwordFoundButPartOfSpeechDiffers: 4,
    noExactHeadword: 710,
    movedToStandardIelts: 63,
    alreadyStandardByLegacyCourseRule: 2,
    retainedInIeltsAdvanced: 712,
  },
  items,
};

fs.writeFileSync(
  path.join(domainDir, "ielts-cefr-review.json"),
  `${JSON.stringify(review, null, 2)}\n`,
);
console.log(
  `Wrote CEFR-J review: ${items.length} terms, ${exactMatches.length} exact matches.`,
);
