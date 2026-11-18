import courseData from "./idiom-course-data.json";
import exampleTranslations from "./idiom-course-example-translations.json";
import { exampleSegments } from "./dictionary";

export interface IdiomCourseQuestion {
  term: string;
  dialoguePrompt: string;
  prompt: string;
  choices: readonly string[];
}

export interface IdiomCourseLesson {
  id: string;
  title: string;
  focus: string;
  questions: readonly IdiomCourseQuestion[];
}

export interface IdiomCourseEntry {
  definition: string;
  example: string;
  exampleTranslation?: string;
}

interface IdiomCourseData {
  generatedFrom: string;
  sourceSha256: string;
  sourceRows: number;
  uniqueTerms: number;
  entries: Record<string, IdiomCourseEntry>;
}

const data = courseData as IdiomCourseData;
const translations = exampleTranslations as Record<string, string>;

export const IDIOM_COURSE_ID = "idioms-v1";
export const IDIOM_COURSE_TITLE = "Idioms";
export const IDIOM_COURSE_ENTRIES: Readonly<
  Record<string, IdiomCourseEntry>
> = Object.fromEntries(
  Object.entries(data.entries).map(([term, entry]) => [
    term,
    {
      ...entry,
      exampleTranslation: translations[term] ?? "",
    },
  ]),
);
export const IDIOM_COURSE_WORD_COUNT = Object.keys(data.entries).length;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  }
  return hash >>> 0;
}

function blankIdiom(example: string, term: string): string | null {
  const segments = exampleSegments(example, term);
  if (!segments.some((segment) => segment.underline)) return null;
  return segments
    .map((segment) => segment.underline ? "_____" : segment.text)
    .join("");
}

function hideHeadword(text: string, term: string): string {
  return exampleSegments(text, term)
    .map((segment) => segment.underline ? "…" : segment.text)
    .join("");
}

function choicesFor(term: string, terms: readonly string[]): string[] {
  const distractors: string[] = [];
  const first = stableHash(`${term}:distractors`) % terms.length;
  for (let offset = 0; offset < terms.length && distractors.length < 3; offset += 1) {
    const candidate = terms[(first + offset) % terms.length];
    if (candidate !== term) distractors.push(candidate);
  }
  return [term, ...distractors].sort((left, right) =>
    stableHash(`${term}:choice:${left}`) -
      stableHash(`${term}:choice:${right}`) ||
    left.localeCompare(right, "en"),
  );
}

export function buildIdiomCourse(
  entries: Readonly<Record<string, IdiomCourseEntry>>,
  courseId = IDIOM_COURSE_ID,
): IdiomCourseLesson[] {
  const terms = Object.keys(entries);
  if (!/^[a-z0-9-]{1,80}$/i.test(courseId))
    throw new Error("Mã khóa học idiom không hợp lệ.");
  if (terms.length < 4)
    throw new Error("Cần ít nhất bốn idiom để tạo câu hỏi trắc nghiệm.");

  const lessonSize = 20;
  const lessons: IdiomCourseLesson[] = [];
  for (let start = 0; start < terms.length; start += lessonSize) {
    const lessonTerms = terms.slice(start, start + lessonSize);
    const firstTerm = lessonTerms[0];
    const lastTerm = lessonTerms.at(-1)!;
    lessons.push({
      id: `${courseId}-lesson-${String(lessons.length + 1).padStart(3, "0")}`,
      title: `Bài ${lessons.length + 1}`,
      focus:
        firstTerm === lastTerm
          ? `Thành ngữ bắt đầu với “${firstTerm}”.`
          : `Thành ngữ từ “${firstTerm}” đến “${lastTerm}”.`,
      questions: lessonTerms.map((term) => {
        const entry = entries[term];
        const examplePrompt = blankIdiom(entry.example, term);
        return {
          term,
          dialoguePrompt:
            `Tớ đang nghĩ đến một idiom có nghĩa là “${hideHeadword(entry.definition, term)}”. Cậu chọn cụm phù hợp nhé.`,
          prompt:
            examplePrompt ??
            `Mình đoán idiom đó là: _____`,
          choices: choicesFor(term, terms),
        };
      }),
    });
  }
  return lessons;
}

export const IDIOM_COURSE_LESSONS = buildIdiomCourse(
  IDIOM_COURSE_ENTRIES,
);
