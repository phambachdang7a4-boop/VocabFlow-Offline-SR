import {
  importDatabaseFromAssetAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import bundleManifest from "../assets/offline/bundle-manifest.json";
import type {
  OfflineCourse,
  OfflineCourseBundle,
  OfflineCourseEntry,
  OfflineCourseLesson,
  OfflineCourseQuestion,
} from "./offline-course-data";

type DatabaseCourseRow = {
  id: string;
  title: string;
  description: string;
  sequence: number;
  word_count: number | null;
  unit_label: string | null;
  topic_count: number | null;
  progress_prefixes_json: string;
};

type DatabaseLessonRow = {
  id: string;
  course_id: string;
  title: string;
  focus: string;
  topic_id: string | null;
  topic_title: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  chapter_number: number | null;
  sequence: number;
};

type DatabaseQuestionRow = {
  course_id: string;
  lesson_id: string;
  sequence: number;
  term: string;
  prompt: string;
  choices_json: string;
  dialogue_prompt: string | null;
};

type DatabaseEntryRow = {
  course_id: string;
  term: string;
  definition: string;
  example: string;
  example_translation: string | null;
  spelling_note: string | null;
  part_of_speech: string | null;
};

type MutableOfflineCourseLesson = Omit<OfflineCourseLesson, "questions"> & {
  questions: OfflineCourseQuestion[];
};

type MutableOfflineCourse = Omit<
  OfflineCourse,
  "lessons" | "entriesByTerm"
> & {
  lessons: MutableOfflineCourseLesson[];
  entriesByTerm: Record<string, OfflineCourseEntry>;
};

const courseAssetId = require("../assets/offline/vocabflow-courses.db") as number;
const courseDatabaseName = "vocabflow-courses.db";
const expectedCourseManifest = bundleManifest.courses;
const expectedDatabase = expectedCourseManifest.database;

let databasePromise: Promise<SQLiteDatabase> | undefined;
let bundlePromise: Promise<OfflineCourseBundle> | undefined;

function parseJson<T>(value: string, field: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Metadata khóa học không hợp lệ: ${field}.`);
  }
}

async function readPackageMetadata(
  database: SQLiteDatabase,
): Promise<Record<string, string>> {
  const rows = await database.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value
       FROM course_metadata
      WHERE key IN ('formatVersion', 'packageSha256', 'courseCount', 'lessonCount')`,
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

async function readBundleMetadata(
  database: SQLiteDatabase,
): Promise<Record<string, string>> {
  const rows = await database.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM course_metadata",
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function hasExpectedPackage(metadata: Record<string, string>): boolean {
  return (
    metadata.formatVersion === String(expectedCourseManifest.sourceVersion) &&
    metadata.packageSha256 === expectedCourseManifest.sha256 &&
    Number(metadata.courseCount) === expectedCourseManifest.courseCount &&
    Number(metadata.lessonCount) === expectedCourseManifest.lessonCount
  );
}

async function openImportedDatabase(
  forceOverwrite: boolean,
): Promise<SQLiteDatabase> {
  await importDatabaseFromAssetAsync(courseDatabaseName, {
    assetId: courseAssetId,
    forceOverwrite,
  });
  const database = await openDatabaseAsync(courseDatabaseName);
  await database.execAsync("PRAGMA query_only = ON;");
  return database;
}

async function openBundledCourseDatabase(): Promise<SQLiteDatabase> {
  let database: SQLiteDatabase | undefined;

  try {
    database = await openImportedDatabase(false);
    if (hasExpectedPackage(await readPackageMetadata(database))) {
      return database;
    }
  } catch {
    await database?.closeAsync().catch(() => undefined);
    database = undefined;
  }

  await database?.closeAsync();
  database = await openImportedDatabase(true);
  if (!hasExpectedPackage(await readPackageMetadata(database))) {
    await database.closeAsync();
    throw new Error("Gói khóa học trong APK không đúng phiên bản.");
  }
  return database;
}

function getCourseDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openBundledCourseDatabase().catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

export async function getBundledCourseDataStatus(): Promise<{
  state: "installed";
  bytes: number;
}> {
  await getCourseDatabase();
  return { state: "installed", bytes: expectedDatabase.bytes };
}

async function readBundleFromDatabase(): Promise<OfflineCourseBundle> {
  const database = await getCourseDatabase();
  const metadata = await readBundleMetadata(database);

  const courses = await database.getAllAsync<DatabaseCourseRow>(
    `SELECT id, title, description, sequence, word_count, unit_label,
            topic_count, progress_prefixes_json
       FROM courses
      ORDER BY sequence`,
  );
  const courseById = new Map<string, MutableOfflineCourse>();
  for (const row of courses) {
    courseById.set(row.id, {
      id: row.id,
      title: row.title,
      description: row.description,
      lessons: [],
      entriesByTerm: {},
      ...(row.word_count === null ? {} : { wordCount: row.word_count }),
      ...(row.unit_label === null ? {} : { unitLabel: row.unit_label }),
      ...(row.topic_count === null ? {} : { topicCount: row.topic_count }),
      progressPrefixes: parseJson<readonly string[]>(
        row.progress_prefixes_json,
        "progress_prefixes_json",
      ),
    });
  }

  const lessonRows = await database.getAllAsync<DatabaseLessonRow>(
    `SELECT id, course_id, title, focus, topic_id, topic_title, chapter_id,
            chapter_title, chapter_number, sequence
       FROM lessons
      ORDER BY course_id, sequence`,
  );
  const lessonById = new Map<string, MutableOfflineCourseLesson>();
  for (const row of lessonRows) {
    const course = courseById.get(row.course_id);
    if (!course) throw new Error(`Không tìm thấy khóa học ${row.course_id}.`);
    const lesson: MutableOfflineCourseLesson = {
      id: row.id,
      title: row.title,
      focus: row.focus,
      questions: [],
      ...(row.topic_id === null ? {} : { topicId: row.topic_id }),
      ...(row.topic_title === null ? {} : { topicTitle: row.topic_title }),
      ...(row.chapter_id === null ? {} : { chapterId: row.chapter_id }),
      ...(row.chapter_title === null ? {} : { chapterTitle: row.chapter_title }),
      ...(row.chapter_number === null
        ? {}
        : { chapterNumber: row.chapter_number }),
    };
    course.lessons.push(lesson);
    lessonById.set(row.id, lesson);
  }

  const questions = await database.getAllAsync<DatabaseQuestionRow>(
    `SELECT course_id, lesson_id, sequence, term, prompt, choices_json,
            dialogue_prompt
       FROM questions
      ORDER BY course_id, lesson_id, sequence`,
  );
  for (const row of questions) {
    const lesson = lessonById.get(row.lesson_id);
    if (!lesson) throw new Error(`Không tìm thấy bài học ${row.lesson_id}.`);
    lesson.questions.push({
      term: row.term,
      prompt: row.prompt,
      choices: parseJson<readonly string[]>(row.choices_json, "choices_json"),
      ...(row.dialogue_prompt === null
        ? {}
        : { dialoguePrompt: row.dialogue_prompt }),
    });
  }

  const entries = await database.getAllAsync<DatabaseEntryRow>(
    `SELECT course_id, term, definition, example, example_translation,
            spelling_note, part_of_speech
       FROM course_entries
      ORDER BY course_id, term`,
  );
  for (const row of entries) {
    const course = courseById.get(row.course_id);
    if (!course) throw new Error(`Không tìm thấy khóa học ${row.course_id}.`);
    course.entriesByTerm[row.term] = {
      definition: row.definition,
      example: row.example,
      ...(row.example_translation === null
        ? {}
        : { exampleTranslation: row.example_translation }),
      ...(row.spelling_note === null
        ? {}
        : { spellingNote: row.spelling_note }),
      ...(row.part_of_speech === null
        ? {}
        : { partOfSpeech: row.part_of_speech }),
    };
  }

  const bundle: OfflineCourseBundle = {
    formatVersion: Number(metadata.formatVersion),
    dictionaryIndex: parseJson(metadata.dictionaryIndex, "dictionaryIndex"),
    ieltsAttemptMigration: parseJson(
      metadata.ieltsAttemptMigration,
      "ieltsAttemptMigration",
    ),
    toeicAttemptMigration: parseJson(
      metadata.toeicAttemptMigration,
      "toeicAttemptMigration",
    ),
    sentenceStructureDistractorExplanations: parseJson(
      metadata.sentenceStructureDistractorExplanations,
      "sentenceStructureDistractorExplanations",
    ),
    courses: [...courseById.values()],
  };

  if (
    bundle.courses.length !== expectedCourseManifest.courseCount ||
    bundle.courses.reduce((total, course) => total + course.lessons.length, 0) !==
      expectedCourseManifest.lessonCount
  ) {
    throw new Error("Gói khóa học trong APK thiếu dữ liệu.");
  }
  return bundle;
}

export function getBundledOfflineCourseBundle(): Promise<OfflineCourseBundle> {
  if (!bundlePromise) {
    bundlePromise = readBundleFromDatabase().catch((error) => {
      bundlePromise = undefined;
      throw error;
    });
  }
  return bundlePromise;
}

export function clearBundledOfflineCourseBundleCache(): void {
  bundlePromise = undefined;
}
