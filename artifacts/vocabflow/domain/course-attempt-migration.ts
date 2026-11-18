import type {
  OfflineCourseLesson,
  OfflineCourseBundle,
} from "../data/offline-course-data";

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
  migration: OfflineCourseBundle["ieltsAttemptMigration"] | undefined,
  standardLessons: readonly OfflineCourseLesson[],
): T {
  const originalTerms = migration?.originalLessonTerms[attempt.lessonId];
  const standardLesson = standardLessons.find(
    (lesson) => lesson.id === attempt.lessonId,
  );
  if (!originalTerms || !standardLesson || !migration) return attempt;

  const standardTermSet = new Set(migration.standardTerms);
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
