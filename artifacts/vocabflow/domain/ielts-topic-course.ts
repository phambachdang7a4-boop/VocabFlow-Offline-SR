import courseData from "./ielts-topic-course-data.json";
import advancedTermsData from "./ielts-advanced-terms.json";

export interface IeltsTopicCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface IeltsTopicCourseLesson {
  id: string;
  title: string;
  focus: string;
  topicId: string;
  topicTitle: string;
  chapterId?: string;
  chapterTitle?: string;
  chapterNumber?: number;
  questions: readonly IeltsTopicCourseQuestion[];
}

export interface IeltsTopicCourseEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
  dictionarySource: "offline" | "authored";
  exampleSource: "offline" | "authored";
  partOfSpeech: string;
  posGroup: string;
  family: string;
  spellingNote?: string;
}

interface IeltsTopicCourseData {
  spellingConvention: string;
  totalWords: number;
  topics: {
    id: string;
    title: string;
    focus: string;
    terms: string[];
    readingTerms: string[];
    legacyLesson: {
      id: string;
      title: string;
      focus: string;
      questions: IeltsTopicCourseQuestion[];
    } | null;
  }[];
  entries: Record<string, IeltsTopicCourseEntry>;
}

interface IeltsAdvancedTermsData {
  classificationMethod: string;
  source: string;
  termsByTopic: Record<string, string[]>;
}

const data = courseData as IeltsTopicCourseData;
const advancedTerms = advancedTermsData as IeltsAdvancedTermsData;

export const IELTS_TOPIC_COURSE_ID = "ielts-topic-vocabulary-v1";
export const IELTS_TOPIC_COURSE_TITLE = "IELTS";
export const IELTS_ADVANCED_COURSE_ID = "ielts-advanced-vocabulary-v1";
export const IELTS_ADVANCED_COURSE_TITLE = "IELTS Nâng cao";
export const IELTS_ADVANCED_CLASSIFICATION_METHOD =
  advancedTerms.classificationMethod;
export const IELTS_TOPIC_COURSE_SPELLING_CONVENTION =
  data.spellingConvention;
export const IELTS_COURSE_CHAPTERS = [
  {
    id: "people-society",
    title: "Con người & xã hội",
    topicIds: ["society", "society-work", "family", "equality", "development", "psychology"],
  },
  {
    id: "education-language",
    title: "Giáo dục & ngôn ngữ",
    topicIds: ["education", "language", "academic-methods", "time-sequence"],
  },
  {
    id: "work-economy",
    title: "Công việc & kinh tế",
    topicIds: ["work", "economy", "consumerism", "globalization"],
  },
  {
    id: "environment-resources",
    title: "Môi trường & tài nguyên",
    topicIds: [
      "environment",
      "biodiversity",
      "water",
      "energy",
      "agriculture",
      "earth-science",
    ],
  },
  {
    id: "science-technology",
    title: "Khoa học & công nghệ",
    topicIds: [
      "technology",
      "science",
      "biology",
      "materials-science",
      "astronomy",
    ],
  },
  {
    id: "health-sports",
    title: "Sức khỏe & thể thao",
    topicIds: ["health", "sports"],
  },
  {
    id: "culture-media",
    title: "Văn hóa & truyền thông",
    topicIds: ["culture", "media", "history"],
  },
  {
    id: "travel-places",
    title: "Du lịch & nơi chốn",
    topicIds: ["transport", "housing", "tourism", "architecture", "geography"],
  },
  {
    id: "government-justice",
    title: "Chính phủ & pháp luật",
    topicIds: ["government", "crime"],
  },
  {
    id: "academic-reading",
    title: "Đọc hiểu học thuật",
    topicIds: ["general-reading"],
  },
] as const;
const allTerms = data.topics.flatMap((topic) => [
  ...topic.terms,
  ...topic.readingTerms,
]);
const legacyCoreTerms = new Set(
  data.topics.flatMap(
    (topic) => topic.legacyLesson?.questions.map((question) => question.term) ?? [],
  ),
);
const advancedTermSet = new Set(
  Object.values(advancedTerms.termsByTopic)
    .flat()
    .filter((term) => !legacyCoreTerms.has(term)),
);
const standardTermSet = new Set(
  allTerms.filter((term) => !advancedTermSet.has(term)),
);
export const IELTS_TOPIC_COURSE_WORD_COUNT = standardTermSet.size;
export const IELTS_ADVANCED_COURSE_WORD_COUNT = advancedTermSet.size;
const PRESERVED_GENERAL_READING_LESSON_COUNT = 46;
export const IELTS_TOPIC_COURSE_ENTRIES: Readonly<
  Record<string, IeltsTopicCourseEntry>
> = Object.fromEntries(
  Object.entries(data.entries).filter(([term]) => standardTermSet.has(term)),
);
export const IELTS_ADVANCED_COURSE_ENTRIES: Readonly<
  Record<string, IeltsTopicCourseEntry>
> = Object.fromEntries(
  Object.entries(data.entries).filter(([term]) => advancedTermSet.has(term)),
);

export const IELTS_TOPIC_WORD_LIST = data.topics.map((topic) => ({
  id: topic.id,
  title: topic.title,
  terms: [...topic.terms, ...topic.readingTerms].filter((term) =>
    standardTermSet.has(term),
  ),
}));
export const IELTS_ADVANCED_TOPIC_WORD_LIST = data.topics
  .map((topic) => ({
    id: topic.id,
    title: topic.title,
    terms: (advancedTerms.termsByTopic[topic.id] ?? []).filter((term) =>
      advancedTermSet.has(term),
    ),
  }))
  .filter((topic) => topic.terms.length > 0);

for (const term of advancedTermSet) {
  if (!data.entries[term]) {
    throw new Error(`IELTS advanced term has no dictionary entry: ${term}`);
  }
}

const chapterOrderByTopic = new Map<
  string,
  {
    chapter: (typeof IELTS_COURSE_CHAPTERS)[number];
    chapterIndex: number;
    topicIndex: number;
  }
>();
IELTS_COURSE_CHAPTERS.forEach((chapter, chapterIndex) => {
  chapter.topicIds.forEach((topicId, topicIndex) => {
    chapterOrderByTopic.set(topicId, { chapter, chapterIndex, topicIndex });
  });
});
const courseTopicIds = new Set(data.topics.map((topic) => topic.id));
const chapterTopicIds = IELTS_COURSE_CHAPTERS.flatMap(
  (chapter) => chapter.topicIds,
);
if (
  chapterTopicIds.length !== courseTopicIds.size ||
  new Set(chapterTopicIds).size !== chapterTopicIds.length ||
  chapterTopicIds.some((topicId) => !courseTopicIds.has(topicId))
) {
  throw new Error("Every IELTS topic must belong to exactly one course chapter.");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankTerm(example: string, term: string): string {
  return example.replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"), "_____");
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

interface IeltsTopicCourseChoicePool {
  terms: string[];
  indexByTerm: Map<string, number>;
}

function choicesFor(
  term: string,
  pool: IeltsTopicCourseChoicePool,
): string[] {
  const poolLength = Math.max(0, pool.terms.length - 1);
  const excludedIndex = pool.indexByTerm.get(term) ?? -1;
  const start = poolLength ? stableHash(term) % poolLength : 0;
  const choices = [term];
  for (
    let offset = 0;
    offset < poolLength && choices.length < 4;
    offset += 1
  ) {
    const poolIndex = (start + offset) % poolLength;
    const orderedIndex =
      excludedIndex >= 0 && poolIndex >= excludedIndex
        ? poolIndex + 1
        : poolIndex;
    const candidate = pool.terms[orderedIndex];
    if (!choices.includes(candidate)) choices.push(candidate);
  }
  return choices;
}

function createQuestions(
  terms: readonly string[],
  allTerms: readonly string[],
): IeltsTopicCourseQuestion[] {
  const poolsByGroup = new Map<string, IeltsTopicCourseChoicePool>();
  for (const term of terms) {
    const answer = data.entries[term];
    const key = `${answer.posGroup}\u0000${answer.family}`;
    if (poolsByGroup.has(key)) continue;

    const sameTopic = terms.filter((candidate) => {
      const entry = data.entries[candidate];
      return (
        candidate !== term &&
        entry.posGroup === answer.posGroup &&
        entry.family !== answer.family
      );
    });
    const sameCourse = allTerms.filter((candidate) => {
      const entry = data.entries[candidate];
      return (
        candidate !== term &&
        entry.posGroup === answer.posGroup &&
        entry.family !== answer.family
      );
    });
    const prioritizedTerms = [...new Set([...sameTopic, ...sameCourse])];
    const prioritizedSet = new Set(prioritizedTerms);
    const poolTerms = [
      ...prioritizedTerms,
      ...allTerms.filter((candidate) => !prioritizedSet.has(candidate)),
    ];
    poolsByGroup.set(key, {
      terms: poolTerms,
      indexByTerm: new Map(poolTerms.map((candidate, index) => [candidate, index])),
    });
  }

  return terms.map((term) => {
    const entry = data.entries[term];
    const key = `${entry.posGroup}\u0000${entry.family}`;
    return {
      term,
      prompt: blankTerm(entry.example, term),
      choices: choicesFor(
        term,
        poolsByGroup.get(key) ?? { terms: [], indexByTerm: new Map() },
      ),
    };
  });
}

function splitLessonTerms(
  terms: readonly string[],
  desiredLessonCount?: number,
): string[][] {
  if (desiredLessonCount !== undefined) {
    if (terms.length < desiredLessonCount) {
      throw new Error(
        `Cannot preserve ${desiredLessonCount} lesson IDs with only ${terms.length} Reading terms.`,
      );
    }
    const baseSize = Math.floor(terms.length / desiredLessonCount);
    const remainder = terms.length % desiredLessonCount;
    let offset = 0;
    return Array.from({ length: desiredLessonCount }, (_, index) => {
      const size = baseSize + (index < remainder ? 1 : 0);
      const chunk = terms.slice(offset, offset + size);
      offset += size;
      return chunk;
    });
  }

  const chunks: string[][] = [];
  const sizes = [25, 28, 22, 30, 24, 26];
  let offset = 0;
  let chunkIndex = 0;
  while (offset < terms.length) {
    const remaining = terms.length - offset;
    if (remaining <= 35) {
      chunks.push(terms.slice(offset));
      break;
    }
    let size = sizes[chunkIndex % sizes.length];
    if (remaining - size < 20) size = Math.floor(remaining / 2);
    chunks.push(terms.slice(offset, offset + size));
    offset += size;
    chunkIndex += 1;
  }
  return chunks;
}

function buildOriginalLessons(): IeltsTopicCourseLesson[] {
  const coreTerms = data.topics.flatMap((topic) => topic.terms);
  const lessons: IeltsTopicCourseLesson[] = [];
  for (const topic of data.topics) {
    const legacy = topic.legacyLesson;
    if (legacy) {
      lessons.push({
        ...legacy,
        title: `Bài ${lessons.length + 1}`,
        topicId: topic.id,
        topicTitle: topic.title,
      });
    }

    const legacyTerms = new Set(legacy?.questions.map((question) => question.term));
    const remainingTerms = topic.terms.filter((term) => !legacyTerms.has(term));
    splitLessonTerms(remainingTerms).forEach((terms, index) => {
      const lessonNumber = index + (legacy ? 2 : 1);
      lessons.push({
        id: `${IELTS_TOPIC_COURSE_ID}-${topic.id}-lesson-${lessonNumber}`,
        title: `Bài ${lessons.length + 1}`,
        focus: topic.focus,
        topicId: topic.id,
        topicTitle: topic.title,
        questions: createQuestions(terms, coreTerms),
      });
    });

    const desiredReadingLessonCount =
      topic.id === "general-reading"
        ? PRESERVED_GENERAL_READING_LESSON_COUNT
        : undefined;
    splitLessonTerms(topic.readingTerms, desiredReadingLessonCount).forEach(
      (terms, index) => {
        lessons.push({
          id: `${IELTS_TOPIC_COURSE_ID}-${topic.id}-reading-lesson-${index + 1}`,
          title: `Reading · Bài ${index + 1}`,
          focus: topic.focus,
          topicId: topic.id,
          topicTitle: topic.title,
          questions: createQuestions(terms, allTerms),
        });
      },
    );
  }
  return lessons;
}

const originalLessons = buildOriginalLessons();
export const IELTS_PRE_SPLIT_LESSON_QUESTION_TERMS: Readonly<
  Record<string, readonly string[]>
> = Object.fromEntries(
  originalLessons.map((lesson) => [
    lesson.id,
    lesson.questions.map((question) => question.term),
  ]),
);

function buildStandardLessons(): IeltsTopicCourseLesson[] {
  const courseTerms = allTerms.filter((term) => standardTermSet.has(term));
  const lessons = originalLessons
    .map((lesson) => ({
      ...lesson,
      questions: lesson.questions.filter((question) =>
        standardTermSet.has(question.term),
      ),
    }))
    .filter((lesson) => lesson.questions.length > 0)
    .map((lesson) => ({
      ...lesson,
      questions: lesson.questions.map((question) => ({
        ...question,
        choices: createQuestions(
          [question.term],
          courseTerms.filter((term) => term !== question.term),
        )[0].choices,
      })),
    }));
  return organizeLessonsByChapter(lessons);
}

const advancedSourceLessonIds: Record<string, string[]> = {};

function organizeLessonsByChapter(
  lessons: readonly IeltsTopicCourseLesson[],
): IeltsTopicCourseLesson[] {
  return lessons
    .map((lesson, originalIndex) => {
      const chapterData = chapterOrderByTopic.get(lesson.topicId);
      if (!chapterData) {
        throw new Error(`No IELTS chapter is assigned to ${lesson.topicId}.`);
      }
      return {
        lesson: {
          ...lesson,
          chapterId: chapterData.chapter.id,
          chapterTitle: chapterData.chapter.title,
          chapterNumber: chapterData.chapterIndex + 1,
        },
        originalIndex,
        chapterIndex: chapterData.chapterIndex,
        topicIndex: chapterData.topicIndex,
      };
    })
    .sort(
      (a, b) =>
        a.chapterIndex - b.chapterIndex ||
        a.topicIndex - b.topicIndex ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ lesson }) => lesson);
}

function buildAdvancedLessons(): IeltsTopicCourseLesson[] {
  const courseTerms = [...advancedTermSet];
  const sourceLessonByTerm = new Map<string, string>();
  for (const lesson of originalLessons) {
    for (const question of lesson.questions) {
      sourceLessonByTerm.set(question.term, lesson.id);
    }
  }
  const lessons: IeltsTopicCourseLesson[] = [];

  for (const topic of data.topics) {
    const terms = (advancedTerms.termsByTopic[topic.id] ?? []).filter((term) =>
      advancedTermSet.has(term),
    );
    splitLessonTerms(terms).forEach((lessonTerms) => {
      const lesson = {
        id: `${IELTS_ADVANCED_COURSE_ID}-${topic.id}-lesson-${lessons.length + 1}`,
        title: `Bài ${lessons.length + 1}`,
        focus: topic.focus,
        topicId: topic.id,
        topicTitle: topic.title,
        questions: createQuestions(lessonTerms, courseTerms),
      };
      advancedSourceLessonIds[lesson.id] = [
        ...new Set(
          lessonTerms
            .map((term) => sourceLessonByTerm.get(term))
            .filter((lessonId): lessonId is string => Boolean(lessonId)),
        ),
      ];
      lessons.push(lesson);
    });
  }

  return organizeLessonsByChapter(lessons);
}

export const IELTS_TOPIC_COURSE_LESSONS = buildStandardLessons();
export const IELTS_ADVANCED_COURSE_LESSONS = buildAdvancedLessons();
export const IELTS_ADVANCED_SOURCE_LESSON_IDS_BY_LESSON =
  advancedSourceLessonIds;

export interface IeltsSplitCourseAttempt {
  lessonId: string;
  currentIndex: number;
  correctCount: number;
  wrongQuestionIndices: number[];
  retryIndex: number;
  retrying: boolean;
  selectedAnswer: string | null;
}

export function mapIeltsStandardAttempt<T extends IeltsSplitCourseAttempt>(
  attempt: T,
): T {
  const originalTerms = IELTS_PRE_SPLIT_LESSON_QUESTION_TERMS[attempt.lessonId];
  const standardLesson = IELTS_TOPIC_COURSE_LESSONS.find(
    (lesson) => lesson.id === attempt.lessonId,
  );
  if (!originalTerms || !standardLesson) return attempt;

  const standardIndexByOriginalIndex = new Map<number, number>();
  let standardIndex = 0;
  originalTerms.forEach((term, originalIndex) => {
    if (!standardTermSet.has(term)) return;
    standardIndexByOriginalIndex.set(originalIndex, standardIndex);
    standardIndex += 1;
  });

  const mappedWrongQuestions = attempt.wrongQuestionIndices
    .map((originalIndex, originalPosition) => ({
      originalIndex,
      originalPosition,
      standardIndex: standardIndexByOriginalIndex.get(originalIndex),
    }))
    .filter(
      (
        item,
      ): item is {
        originalIndex: number;
        originalPosition: number;
        standardIndex: number;
      } => item.standardIndex !== undefined,
    );
  const wrongQuestionIndices = mappedWrongQuestions.map(
    (item) => item.standardIndex,
  );

  if (attempt.retrying && wrongQuestionIndices.length > 0) {
    const currentRetryPosition = mappedWrongQuestions.findIndex(
      (item) => item.originalPosition >= attempt.retryIndex,
    );
    const retryIndex =
      currentRetryPosition >= 0
        ? currentRetryPosition
        : wrongQuestionIndices.length - 1;
    const currentIndex = wrongQuestionIndices[retryIndex];
    const currentQuestionIsSame =
      originalTerms[attempt.currentIndex] ===
      standardLesson.questions[currentIndex]?.term;
    return {
      ...attempt,
      currentIndex,
      correctCount: Math.max(
        0,
        standardLesson.questions.length - wrongQuestionIndices.length,
      ),
      wrongQuestionIndices,
      retryIndex,
      retrying: true,
      selectedAnswer: currentQuestionIsSame ? attempt.selectedAnswer : null,
    };
  }

  const boundedOriginalIndex = Math.max(
    0,
    Math.min(attempt.currentIndex, originalTerms.length),
  );
  const originalCurrentTerm = originalTerms[boundedOriginalIndex];
  const currentQuestionIsStandard =
    originalCurrentTerm !== undefined &&
    standardTermSet.has(originalCurrentTerm);
  const currentIndex = originalTerms
    .slice(0, boundedOriginalIndex)
    .filter((term) => standardTermSet.has(term)).length;
  const standardWrongBeforeCurrent = mappedWrongQuestions.filter(
    (item) => item.originalIndex < boundedOriginalIndex,
  ).length;
  const standardAnsweredBeforeCurrent = currentIndex;

  return {
    ...attempt,
    currentIndex: Math.min(
      currentIndex,
      Math.max(0, standardLesson.questions.length - 1),
    ),
    correctCount: Math.max(
      0,
      standardAnsweredBeforeCurrent - standardWrongBeforeCurrent,
    ),
    wrongQuestionIndices,
    retryIndex: 0,
    retrying: false,
    selectedAnswer: currentQuestionIsStandard ? attempt.selectedAnswer : null,
  };
}
