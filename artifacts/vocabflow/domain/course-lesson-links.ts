type CourseLessonQuestion = {
  term: string;
};

type CourseLesson = {
  id: string;
  questions: readonly CourseLessonQuestion[];
};

function normalizeCourseTerm(term: string) {
  return term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function findCourseLessonsForTerm<TLesson extends CourseLesson>(
  lessons: readonly TLesson[],
  term: string,
  lessonIds?: readonly string[],
): TLesson[] {
  const normalizedTerm = normalizeCourseTerm(term);
  const allowedLessonIds = lessonIds?.length
    ? new Set(lessonIds)
    : null;
  return lessons.filter(
    (lesson) =>
      (!allowedLessonIds || allowedLessonIds.has(lesson.id)) &&
      lesson.questions.some(
        (question) => normalizeCourseTerm(question.term) === normalizedTerm,
      ),
  );
}
