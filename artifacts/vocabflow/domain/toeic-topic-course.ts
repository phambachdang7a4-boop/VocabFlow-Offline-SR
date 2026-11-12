import courseData from "./toeic-topic-course-data.json";

export interface ToeicTopicCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface ToeicTopicCourseLesson {
  id: string;
  title: string;
  focus: string;
  topicId: string;
  topicTitle: string;
  questions: readonly ToeicTopicCourseQuestion[];
}

export interface ToeicTopicCourseEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
  spellingNote?: string;
  dictionarySource: "offline" | "authored";
  exampleSource: "offline" | "authored";
  partOfSpeech: string;
  posGroup: string;
  family: string;
}

interface ToeicTopicCourseData {
  spellingConvention: string;
  totalWords: number;
  topics: {
    id: string;
    title: string;
    focus: string;
    terms: string[];
  }[];
  entries: Record<string, ToeicTopicCourseEntry>;
}

const data = courseData as ToeicTopicCourseData;

export const TOEIC_TOPIC_COURSE_ID = "toeic-topic-vocabulary-v1";
export const TOEIC_TOPIC_COURSE_TITLE = "Từ vựng TOEIC theo chủ đề";
export const TOEIC_TOPIC_COURSE_SPELLING_CONVENTION =
  data.spellingConvention;
export const TOEIC_TOPIC_COURSE_WORD_COUNT = data.totalWords;
export const TOEIC_TOPIC_COURSE_ENTRIES: Readonly<
  Record<string, ToeicTopicCourseEntry>
> = data.entries;

export const TOEIC_TOPIC_WORD_LIST = data.topics.map((topic) => ({
  id: topic.id,
  title: topic.title,
  terms: topic.terms,
}));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankTerm(example: string, term: string): string {
  return example.replace(
    new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"),
    "_____",
  );
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function choicesFor(
  term: string,
  topicTerms: readonly string[],
  allTerms: readonly string[],
): string[] {
  const answer = TOEIC_TOPIC_COURSE_ENTRIES[term];
  const sameTopic = topicTerms.filter((candidate) => {
    const entry = TOEIC_TOPIC_COURSE_ENTRIES[candidate];
    return (
      candidate !== term &&
      entry.posGroup === answer.posGroup &&
      entry.family !== answer.family
    );
  });
  const sameCourse = allTerms.filter((candidate) => {
    const entry = TOEIC_TOPIC_COURSE_ENTRIES[candidate];
    return (
      candidate !== term &&
      entry.posGroup === answer.posGroup &&
      entry.family !== answer.family
    );
  });
  const fallback = allTerms.filter((candidate) => candidate !== term);
  const pool = [...new Set([...sameTopic, ...sameCourse, ...fallback])];
  const start = pool.length ? stableHash(term) % pool.length : 0;
  const choices = [term];
  for (let offset = 0; offset < pool.length && choices.length < 4; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (!choices.includes(candidate)) choices.push(candidate);
  }
  return choices;
}

function createQuestions(
  terms: readonly string[],
  allTerms: readonly string[],
): ToeicTopicCourseQuestion[] {
  return terms.map((term) => {
    const entry = TOEIC_TOPIC_COURSE_ENTRIES[term];
    return {
      term,
      prompt: blankTerm(entry.example, term),
      choices: choicesFor(term, terms, allTerms),
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

function buildLessons(): ToeicTopicCourseLesson[] {
  const allTerms = data.topics.flatMap((topic) => topic.terms);
  const lessons: ToeicTopicCourseLesson[] = [];

  for (const topic of data.topics) {
    const chunks = splitLessonTerms(topic.terms);
    chunks.forEach((terms, index) => {
      const lessonNumber = index + 1;
      lessons.push({
        id: `${TOEIC_TOPIC_COURSE_ID}-${topic.id}-lesson-${lessonNumber}`,
        title: `Bài ${lessonNumber}`,
        focus: topic.focus,
        topicId: topic.id,
        topicTitle: topic.title,
        questions: createQuestions(terms, allTerms),
      });
    });
  }
  return lessons;
}

export const TOEIC_TOPIC_COURSE_LESSONS = buildLessons();
