import courseData from "./ielts-topic-course-data.json";

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

const data = courseData as IeltsTopicCourseData;

export const IELTS_TOPIC_COURSE_ID = "ielts-topic-vocabulary-v1";
export const IELTS_TOPIC_COURSE_TITLE = "Từ vựng IELTS theo chủ đề";
export const IELTS_TOPIC_COURSE_SPELLING_CONVENTION =
  data.spellingConvention;
export const IELTS_TOPIC_COURSE_WORD_COUNT = data.totalWords;
export const IELTS_TOPIC_COURSE_ENTRIES: Readonly<
  Record<string, IeltsTopicCourseEntry>
> = data.entries;

export const IELTS_TOPIC_WORD_LIST = data.topics.map((topic) => ({
  id: topic.id,
  title: topic.title,
  terms: [...topic.terms, ...topic.readingTerms],
}));

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
    const answer = IELTS_TOPIC_COURSE_ENTRIES[term];
    const key = `${answer.posGroup}\u0000${answer.family}`;
    if (poolsByGroup.has(key)) continue;

    const sameTopic = terms.filter((candidate) => {
      const entry = IELTS_TOPIC_COURSE_ENTRIES[candidate];
      return (
        candidate !== term &&
        entry.posGroup === answer.posGroup &&
        entry.family !== answer.family
      );
    });
    const sameCourse = allTerms.filter((candidate) => {
      const entry = IELTS_TOPIC_COURSE_ENTRIES[candidate];
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
    const entry = IELTS_TOPIC_COURSE_ENTRIES[term];
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

function splitLessonTerms(terms: readonly string[]): string[][] {
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

function buildLessons(): IeltsTopicCourseLesson[] {
  const coreTerms = data.topics.flatMap((topic) => topic.terms);
  const allTerms = data.topics.flatMap((topic) => [
    ...topic.terms,
    ...topic.readingTerms,
  ]);
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
    const chunks = splitLessonTerms(remainingTerms);
    chunks.forEach((terms, index) => {
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

    splitLessonTerms(topic.readingTerms).forEach((terms, index) => {
      lessons.push({
        id: `${IELTS_TOPIC_COURSE_ID}-${topic.id}-reading-lesson-${index + 1}`,
        title: `Reading · Bài ${index + 1}`,
        focus: topic.focus,
        topicId: topic.id,
        topicTitle: topic.title,
        questions: createQuestions(terms, allTerms),
      });
    });
  }

  return lessons;
}

export const IELTS_TOPIC_COURSE_LESSONS = buildLessons();
