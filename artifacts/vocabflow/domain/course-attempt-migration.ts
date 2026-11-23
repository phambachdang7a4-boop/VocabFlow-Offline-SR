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

export function mapToeicSplitCourseAttempt<
  T extends IeltsSplitCourseAttempt & { updatedAt?: string },
>(
  targetLesson: OfflineCourseLesson,
  sourceLessonIds: readonly string[],
  migration: OfflineCourseBundle["toeicAttemptMigration"] | undefined,
  sourceAttempts: readonly T[],
  completedSourceLessonIds: ReadonlySet<string>,
): { completed: boolean; attempt?: T } {
  if (!migration || targetLesson.questions.length === 0) {
    return { completed: false };
  }

  const attemptsById = new Map(
    sourceAttempts.map((attempt) => [attempt.lessonId, attempt]),
  );
  const statusByTerm = new Map<
    string,
    { status: "completed" | "wrong" | "active"; attempt?: T }
  >();

  for (const sourceLessonId of sourceLessonIds) {
    const sourceTerms = migration.originalLessonTerms[sourceLessonId] ?? [];
    if (completedSourceLessonIds.has(sourceLessonId)) {
      for (const term of sourceTerms) {
        statusByTerm.set(term, { status: "completed" });
      }
      continue;
    }

    const attempt = attemptsById.get(sourceLessonId);
    if (!attempt) continue;
    const wrongSet = new Set(attempt.wrongQuestionIndices);
    const activeSourceIndex = attempt.retrying
      ? attempt.wrongQuestionIndices[
          Math.max(
            0,
            Math.min(
              attempt.retryIndex,
              attempt.wrongQuestionIndices.length - 1,
            ),
          )
        ]
      : attempt.currentIndex;

    sourceTerms.forEach((term, index) => {
      if (attempt.retrying) {
        const wrongPosition = attempt.wrongQuestionIndices.indexOf(index);
        if (wrongPosition >= 0 && wrongPosition < attempt.retryIndex) {
          statusByTerm.set(term, { status: "completed" });
        } else if (index === activeSourceIndex) {
          statusByTerm.set(term, { status: "active", attempt });
        } else if (wrongPosition >= 0) {
          statusByTerm.set(term, { status: "wrong" });
        } else {
          statusByTerm.set(term, { status: "completed" });
        }
        return;
      }

      if (index < attempt.currentIndex && !wrongSet.has(index)) {
        statusByTerm.set(term, { status: "completed" });
      } else if (index === activeSourceIndex) {
        statusByTerm.set(term, { status: "active", attempt });
      } else if (wrongSet.has(index)) {
        statusByTerm.set(term, { status: "wrong" });
      }
    });
  }

  const targetStatuses = targetLesson.questions.map((question) =>
    statusByTerm.get(question.term),
  );
  if (targetStatuses.length > 0 && targetStatuses.every((item) => item?.status === "completed")) {
    return { completed: true };
  }

  const currentIndex = Math.max(
    0,
    targetStatuses.findIndex((item) => item?.status !== "completed"),
  );
  const activeStatus =
    targetStatuses[currentIndex]?.status === "active"
      ? targetStatuses[currentIndex]
      : undefined;
  const latestAttempt = sourceAttempts
    .filter((attempt) => sourceLessonIds.includes(attempt.lessonId))
    .sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    )[0];
  if (!latestAttempt && targetStatuses.every((item) => !item)) {
    return { completed: false };
  }
  const baseAttempt =
    latestAttempt ??
    ({
      lessonId: targetLesson.id,
      currentIndex: 0,
      correctCount: 0,
      wrongQuestionIndices: [],
      retryIndex: 0,
      retrying: false,
      selectedAnswer: null,
      updatedAt: new Date().toISOString(),
    } as unknown as T);

  return {
    completed: false,
    attempt: {
      ...baseAttempt,
      lessonId: targetLesson.id,
      currentIndex,
      correctCount: targetStatuses.filter(
        (item) => item?.status === "completed",
      ).length,
      wrongQuestionIndices: targetStatuses.flatMap((item, index) =>
        item?.status === "wrong" ? [index] : [],
      ),
      retryIndex: 0,
      retrying: false,
      selectedAnswer:
        activeStatus?.attempt?.selectedAnswer ?? null,
    } as T,
  };
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
