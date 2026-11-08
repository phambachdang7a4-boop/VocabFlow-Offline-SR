import { BASIC_COURSE_ATTRIBUTION, BASIC_COURSE_ID, BASIC_COURSE_LESSONS, BASIC_COURSE_TITLE, BASIC_COURSE_WORD_COUNT, type BasicCourseLesson } from './basic-course';
import { CEFR_COURSES, CEFR_COURSE_LESSONS } from './cefr-courses';

export interface CourseCatalogItem {
  id: string;
  title: string;
  sourceCount: number;
  missingCount: number;
  skippedDuplicateCount: number;
  lessons: BasicCourseLesson[];
  attribution: string;
}

export const COURSE_CATALOGS: CourseCatalogItem[] = [
  {
    id: BASIC_COURSE_ID,
    title: BASIC_COURSE_TITLE,
    sourceCount: BASIC_COURSE_WORD_COUNT,
    missingCount: 0,
    skippedDuplicateCount: 0,
    lessons: BASIC_COURSE_LESSONS,
    attribution: BASIC_COURSE_ATTRIBUTION,
  },
  ...CEFR_COURSES.map(course => ({
    id: course.id,
    title: course.title,
    sourceCount: course.sourceCount,
    missingCount: course.missingWords.length,
    skippedDuplicateCount: course.skippedDuplicateCount,
    lessons: course.lessons,
    attribution: course.attribution,
  })),
];

export const ALL_COURSE_LESSONS: BasicCourseLesson[] = [
  ...BASIC_COURSE_LESSONS,
  ...CEFR_COURSE_LESSONS,
];

export function courseForLesson(lessonId: string): CourseCatalogItem | undefined {
  return COURSE_CATALOGS.find(course => course.lessons.some(lesson => lesson.id === lessonId));
}
