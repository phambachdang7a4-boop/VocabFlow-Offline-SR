import {
  TOEIC_TOPIC_COURSE_DATA,
  TOEIC_TOPIC_COURSE_ENTRIES,
  type ToeicTopicCourseEntry,
} from "./toeic-topic-course-data-loader";

export { TOEIC_TOPIC_COURSE_ENTRIES } from "./toeic-topic-course-data-loader";
export type { ToeicTopicCourseEntry } from "./toeic-topic-course-data-loader";

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

const data = TOEIC_TOPIC_COURSE_DATA;

export const TOEIC_TOPIC_COURSE_ID = "toeic-topic-collocations-v2";
export const TOEIC_TOPIC_COURSE_TITLE = "Cụm từ TOEIC theo chủ đề";
export const TOEIC_TOPIC_COURSE_SPELLING_CONVENTION =
  data.spellingConvention;
export const TOEIC_TOPIC_COURSE_WORD_COUNT = data.totalWords;
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
  const choices = [term];
  const addChoices = (
    candidates: readonly string[],
    isEligible: (candidate: string) => boolean,
  ) => {
    if (!candidates.length || choices.length >= 4) return;
    const start = stableHash(term) % candidates.length;
    for (
      let offset = 0;
      offset < candidates.length && choices.length < 4;
      offset += 1
    ) {
      const candidate = candidates[(start + offset) % candidates.length];
      if (!choices.includes(candidate) && isEligible(candidate)) {
        choices.push(candidate);
      }
    }
  };
  const sameTypeDifferentFamily = (candidate: string) => {
    const entry = TOEIC_TOPIC_COURSE_ENTRIES[candidate];
    return (
      candidate !== term &&
      entry.posGroup === answer.posGroup &&
      entry.family !== answer.family
    );
  };
  addChoices(topicTerms, sameTypeDifferentFamily);
  addChoices(allTerms, sameTypeDifferentFamily);
  addChoices(allTerms, (candidate) => candidate !== term);
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
        title: `Bài ${lessons.length + 1}`,
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
