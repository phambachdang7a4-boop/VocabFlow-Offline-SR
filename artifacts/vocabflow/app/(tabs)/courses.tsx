import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useBottomPad } from "@/components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, F, MaterialSheen } from "@/components/ui";
import {
  BASIC_VOCABULARY_COURSE_ID,
  CONJUNCTION_COURSE_ID,
  IDIOM_COURSE_ID,
  IELTS_ADVANCED_COURSE_ID,
  IELTS_TOPIC_COURSE_ID,
  LINKING_ADVERB_COURSE_ID,
  OFFICE_APPS_COURSE_ID,
  PHRASAL_VERB_COURSE_ID,
  SENTENCE_STRUCTURE_PATTERN_COURSE_ID,
  TOEIC_TOPIC_COURSE_ID,
} from "@/domain/course-ids";
import {
  getOfflineCourseBundle,
  type OfflineCourseBundle,
  type OfflineCourseEntry,
  type OfflineCourseLesson,
  type OfflineCourseQuestion,
} from "@/data/offline-course-data";
import { mapIeltsStandardAttempt } from "@/domain/course-attempt-migration";
import {
  getCourseLessonAttempts,
  getCourseLessonCompletions,
  markCourseLessonCompleted,
  recordStoneInvestmentStudyDay,
  saveCourseLessonAttempt,
  type CourseLessonAttempt,
} from "@/data/vocabulary";
import { getDictionaryPronunciationsForTerms } from "@/data/dictionary";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { LearningGoalCard } from "@/components/LearningGoalCard";
import {
  readLearningGoal,
  writeLearningGoal,
} from "@/data/learning-goal";
import {
  getLearningGoalOption,
  type LearningGoalId,
} from "@/domain/learning-goals";
import {
  buildCourseWordCandidates,
  isSingleWordCourseTerm,
  type CourseWordCandidate,
} from "@/domain/course-word-selection";
import { findCourseLessonsForTerm } from "@/domain/course-lesson-links";
import { useColors } from "@/hooks/useColors";

type CourseQuestion = OfflineCourseQuestion;

export function shuffleLessonChoices(
  questions: readonly Pick<CourseQuestion, "term" | "choices">[],
  random: () => number = Math.random,
): string[][] {
  let previousCorrectIndex = -1;
  return questions.map(({ term, choices }) => {
    const shuffled = [...choices];
    if (!shuffled.includes(term)) {
      throw new Error(`Đáp án đúng không có trong lựa chọn: ${term}`);
    }

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }

    let correctIndex = shuffled.indexOf(term);
    if (shuffled.length > 1 && correctIndex === previousCorrectIndex) {
      const offset = 1 + Math.floor(random() * (shuffled.length - 1));
      const swapIndex = (correctIndex + offset) % shuffled.length;
      [shuffled[correctIndex], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[correctIndex],
      ];
      correctIndex = swapIndex;
    }
    previousCorrectIndex = correctIndex;
    return shuffled;
  });
}

type CourseLesson = OfflineCourseLesson;
type CourseAnswer = OfflineCourseEntry;

function toCourseWordSaveInput(candidate: CourseWordCandidate) {
  return {
    term: candidate.term,
    meaning: candidate.meaning,
    ipa: candidate.ipa,
    example: candidate.example,
    note: candidate.partOfSpeech
      ? `Từ loại: ${candidate.partOfSpeech}`
      : "",
  };
}

type CourseCatalogItem = {
  id: string;
  title: string;
  description: string;
  lessons: readonly CourseLesson[];
  entriesByTerm: ReadonlyMap<string, CourseAnswer>;
  icon: React.ComponentProps<typeof Feather>["name"];
  catalogArtwork: ImageSourcePropType;
  testIdPrefix: string;
  wordCount?: number;
  unitLabel?: string;
  topicCount?: number;
  progressPrefixes?: readonly string[];
};

type RelatedLessonChoice = {
  courseId: string;
  courseTitle: string;
  lesson: CourseLesson;
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const COURSE_PRESENTATION: readonly Pick<
  CourseCatalogItem,
  "id" | "icon" | "catalogArtwork" | "testIdPrefix" | "progressPrefixes"
>[] = [
  {
    id: BASIC_VOCABULARY_COURSE_ID,
    icon: "book-open",
    catalogArtwork: require("../../assets/navigation/courses.png"),
    testIdPrefix: "basic-vocabulary",
  },
  {
    id: IDIOM_COURSE_ID,
    icon: "book-open",
    catalogArtwork: require("../../assets/courses/idioms.png"),
    testIdPrefix: "idioms",
  },
  {
    id: PHRASAL_VERB_COURSE_ID,
    icon: "message-circle",
    catalogArtwork: require("../../assets/courses/phrasal-verbs.png"),
    testIdPrefix: "phrasal-verbs",
  },
  {
    id: CONJUNCTION_COURSE_ID,
    icon: "git-merge",
    catalogArtwork: require("../../assets/courses/sentence-structures.png"),
    testIdPrefix: "conjunction",
    progressPrefixes: [
      CONJUNCTION_COURSE_ID,
      LINKING_ADVERB_COURSE_ID,
      SENTENCE_STRUCTURE_PATTERN_COURSE_ID,
    ],
  },
  {
    id: IELTS_TOPIC_COURSE_ID,
    icon: "globe",
    catalogArtwork: require("../../assets/courses/ielts.png"),
    testIdPrefix: "ielts",
  },
  {
    id: IELTS_ADVANCED_COURSE_ID,
    icon: "globe",
    catalogArtwork: require("../../assets/courses/ielts.png"),
    testIdPrefix: "ielts-advanced",
  },
  {
    id: TOEIC_TOPIC_COURSE_ID,
    icon: "briefcase",
    catalogArtwork: require("../../assets/courses/toeic.png"),
    testIdPrefix: "toeic",
  },
  {
    id: OFFICE_APPS_COURSE_ID,
    icon: "monitor",
    catalogArtwork: require("../../assets/courses/office-apps.png"),
    testIdPrefix: "office-apps",
  },
];

export default function CoursesScreen() {
  const routeParams = useLocalSearchParams<{
    courseId?: string | string[];
    term?: string | string[];
    lessonIds?: string | string[];
  }>();
  const requestedCourseId = firstSearchParam(routeParams.courseId);
  const requestedTerm = firstSearchParam(routeParams.term);
  const requestedLessonIds = firstSearchParam(routeParams.lessonIds);
  const c = useColors();
  const bottom = useBottomPad();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 67 : insets.top;
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonAttempts, setLessonAttempts] = useState<CourseLessonAttempt[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [learningGoalId, setLearningGoalId] = useState<LearningGoalId | null>(null);
  const [learningGoalReady, setLearningGoalReady] = useState(false);
  const [learningGoalSaving, setLearningGoalSaving] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrongQuestionIndices, setWrongQuestionIndices] = useState<number[]>([]);
  const [retryingMistakes, setRetryingMistakes] = useState(false);
  const [retryQuestionPosition, setRetryQuestionPosition] = useState(0);
  const [lessonChoices, setLessonChoices] = useState<readonly string[][]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finishedLessonId, setFinishedLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseBundle, setCourseBundle] =
    useState<OfflineCourseBundle | null>(null);
  const [courseDataStatus, setCourseDataStatus] = useState<
    "checking" | "missing" | "installed" | "damaged"
  >("checking");
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseWordKeys, setSelectedCourseWordKeys] = useState<
    string[]
  >([]);
  const [courseWordsSavedMessage, setCourseWordsSavedMessage] = useState<
    string | null
  >(null);
  const [idiomsSavedAutomatically, setIdiomsSavedAutomatically] =
    useState(false);
  const [bulkAddConfirmationOpen, setBulkAddConfirmationOpen] = useState(false);
  const [bulkAddProgress, setBulkAddProgress] = useState<{
    completed: number;
    total: number;
    stage: "ipa" | "save";
  } | null>(null);
  const [bulkCourseWordsSavedMessage, setBulkCourseWordsSavedMessage] =
    useState<string | null>(null);
  const [relatedLessonChoices, setRelatedLessonChoices] = useState<
    RelatedLessonChoice[]
  >([]);
  const { words: savedWords, saveWords } = useVocabulary();

  const courseCatalog = useMemo(
    () =>
      courseBundle
        ? courseBundle.courses.flatMap((course) => {
            const presentation = COURSE_PRESENTATION.find(
              (item) => item.id === course.id,
            );
            return presentation
              ? [
                  {
                    ...course,
                    ...presentation,
                    entriesByTerm: new Map(
                      Object.entries(course.entriesByTerm),
                    ),
                  } satisfies CourseCatalogItem,
                ]
              : [];
          })
        : [],
    [courseBundle],
  );
  const activeCourse =
    courseCatalog.find((course) => course.id === activeCourseId) ?? null;
  const learningGoal = getLearningGoalOption(learningGoalId);
  const learningGoalCourse = learningGoal
    ? courseCatalog.find((course) => course.id === learningGoal.courseId) ?? null
    : null;
  const inProgressGoalLesson = learningGoalCourse?.lessons.find(
    (lesson) =>
      !completedLessons.includes(lesson.id) &&
      lessonAttempts.some((attempt) => attempt.lessonId === lesson.id),
  );
  const recommendedGoalLesson =
    inProgressGoalLesson ??
    learningGoalCourse?.lessons.find(
      (lesson) => !completedLessons.includes(lesson.id),
    ) ??
    null;
  const recommendedGoalLessonAttempt = recommendedGoalLesson
    ? lessonAttempts.find(
        (attempt) => attempt.lessonId === recommendedGoalLesson.id,
      )
    : null;
  const allCourseWordCandidates = useMemo(
    () =>
      activeCourse
        ? buildCourseWordCandidates(
            [...activeCourse.entriesByTerm.keys()],
            activeCourse.entriesByTerm,
            savedWords,
          )
        : [],
    [activeCourse, savedWords, savedWords.length],
  );
  const addableAllCourseWords = allCourseWordCandidates.filter(
    (candidate) => !candidate.alreadySaved,
  );
  const bulkIpaRequiredCount = addableAllCourseWords.filter(
    (candidate) =>
      isSingleWordCourseTerm(candidate.term) && !candidate.ipa.trim(),
  ).length;
  const alreadySavedCourseWords =
    allCourseWordCandidates.length - addableAllCourseWords.length;
  const missingCourseEntries = activeCourse
    ? Math.max(
        0,
        activeCourse.entriesByTerm.size - allCourseWordCandidates.length,
      )
    : 0;

  const loadProgress = useCallback(async () => {
    setLoading(true);
    try {
      const progressPrefixes = COURSE_PRESENTATION.flatMap(
        (course) => course.progressPrefixes ?? [course.id],
      );
      const progress = await Promise.all(
        progressPrefixes.map((prefix) => getCourseLessonCompletions(prefix)),
      );
      const attempts = await Promise.all(
        progressPrefixes.map((prefix) => getCourseLessonAttempts(prefix)),
      );
      const completedIds = new Set(progress.flat());
      for (const [advancedLessonId, sourceLessonIds] of Object.entries(
        courseBundle?.ieltsAttemptMigration.advancedSourceLessonIds ?? {},
      )) {
        if (
          sourceLessonIds.length > 0 &&
          sourceLessonIds.every((lessonId) => completedIds.has(lessonId))
        ) {
          completedIds.add(advancedLessonId);
        }
      }
      setCompletedLessons([...completedIds]);
      const standardLessons =
        courseBundle?.courses.find(
          (course) => course.id === IELTS_TOPIC_COURSE_ID,
        )?.lessons ?? [];
      setLessonAttempts(
        attempts.flat().map((attempt) =>
          mapIeltsStandardAttempt(
            attempt,
            courseBundle?.ieltsAttemptMigration,
            standardLessons,
          ),
        ),
      );
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể tải tiến độ khóa học.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseBundle]);

  const refreshCourseBundle = useCallback(async () => {
    setCourseDataStatus("checking");
    try {
      const bundle = await getOfflineCourseBundle();
      setCourseBundle(bundle);
      setCourseDataStatus(bundle ? "installed" : "missing");
    } catch {
      setCourseBundle(null);
      setCourseDataStatus("damaged");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readLearningGoal()
      .then((goal) => {
        if (!cancelled) setLearningGoalId(goal);
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(
            failure instanceof Error
              ? `Không thể đọc mục tiêu học đã lưu. ${failure.message}`
              : "Không thể đọc mục tiêu học đã lưu.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLearningGoalReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  useFocusEffect(
    useCallback(() => {
      void refreshCourseBundle();
    }, [refreshCourseBundle]),
  );

  const chooseLearningGoal = async (
    goal: LearningGoalId,
  ): Promise<boolean> => {
    if (learningGoalSaving) return false;
    setLearningGoalSaving(true);
    try {
      await writeLearningGoal(goal);
      setLearningGoalId(goal);
      setError(null);
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? `Không thể lưu mục tiêu trên thiết bị. ${failure.message}`
          : "Không thể lưu mục tiêu trên thiết bị.",
      );
      return false;
    } finally {
      setLearningGoalSaving(false);
    }
  };

  const startLesson = useCallback(async (
    lesson: CourseLesson,
    courseId?: string,
  ) => {
    setSaving(true);
    try {
      const storedAttempt = (await getCourseLessonAttempts(lesson.id)).find(
        (attempt) => attempt.lessonId === lesson.id,
      );
      const standardLessons =
        courseBundle?.courses.find(
          (course) => course.id === IELTS_TOPIC_COURSE_ID,
        )?.lessons ?? [];
      const savedAttempt = storedAttempt
        ? mapIeltsStandardAttempt(
            storedAttempt,
            courseBundle?.ieltsAttemptMigration,
            standardLessons,
          )
        : undefined;
      const validAttempt =
        savedAttempt &&
        savedAttempt.currentIndex < lesson.questions.length &&
        savedAttempt.wrongQuestionIndices.every(
          (index) => index < lesson.questions.length,
        ) &&
        (!savedAttempt.retrying ||
          (savedAttempt.retryIndex < savedAttempt.wrongQuestionIndices.length &&
            savedAttempt.currentIndex ===
              savedAttempt.wrongQuestionIndices[savedAttempt.retryIndex]))
          ? savedAttempt
          : null;
      const attempt: CourseLessonAttempt = validAttempt ?? {
        lessonId: lesson.id,
        currentIndex: 0,
        correctCount: 0,
        wrongQuestionIndices: [],
        retryIndex: 0,
        retrying: false,
        selectedAnswer: null,
        updatedAt: new Date().toISOString(),
      };
      const persistedAttempt = validAttempt
        ? storedAttempt &&
          JSON.stringify(validAttempt) !== JSON.stringify(storedAttempt)
          ? await saveCourseLessonAttempt(validAttempt)
          : validAttempt
        : await saveCourseLessonAttempt(attempt);
      setLessonAttempts((previous) => [
        ...previous.filter((item) => item.lessonId !== lesson.id),
        persistedAttempt,
      ]);
      if (courseId) setActiveCourseId(courseId);
      setActiveLesson(lesson);
      setQuestionIndex(persistedAttempt.currentIndex);
      setWrongQuestionIndices(persistedAttempt.wrongQuestionIndices);
      setRetryingMistakes(persistedAttempt.retrying);
      setRetryQuestionPosition(persistedAttempt.retryIndex);
      setLessonChoices(shuffleLessonChoices(lesson.questions));
      const resumedQuestion = lesson.questions[persistedAttempt.currentIndex];
      setSelectedAnswer(
        persistedAttempt.selectedAnswer &&
          resumedQuestion?.choices.includes(persistedAttempt.selectedAnswer)
          ? persistedAttempt.selectedAnswer
          : null,
      );
      setCorrectCount(persistedAttempt.correctCount);
      setFinishedLessonId(null);
      setSelectedCourseWordKeys([]);
      setCourseWordsSavedMessage(null);
      setIdiomsSavedAutomatically(false);
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể lưu tiến độ bài học.",
      );
    } finally {
      setSaving(false);
    }
  }, [courseBundle]);

  useEffect(() => {
    if (!requestedCourseId || !requestedTerm) return;
    if (courseDataStatus === "checking") return;
    const course = courseCatalog.find(
      (candidate) => candidate.id === requestedCourseId,
    );
    const lessonIds = new Set(
      (requestedLessonIds ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
    const choices = course
      ? findCourseLessonsForTerm(
          course.lessons,
          requestedTerm,
          lessonIds.size > 0 ? [...lessonIds] : undefined,
        )
          .map((lesson) => ({
            courseId: course.id,
            courseTitle: course.title,
            lesson,
          }))
      : [];

    router.setParams({
      courseId: undefined,
      term: undefined,
      lessonIds: undefined,
    });
    setError(null);
    if (choices.length === 1) {
      void startLesson(choices[0].lesson, choices[0].courseId);
    } else if (choices.length > 1) {
      setRelatedLessonChoices(choices);
    } else {
      setError(
        courseDataStatus === "missing" || courseDataStatus === "damaged"
          ? "Hãy cài dữ liệu khóa học trong Cài đặt để mở mục này."
          : `Không tìm thấy bài học cho “${requestedTerm}” trong khóa học này.`,
      );
    }
  }, [
    requestedCourseId,
    courseCatalog,
    courseDataStatus,
    requestedLessonIds,
    requestedTerm,
    startLesson,
  ]);

  const leaveLesson = () => {
    setActiveLesson(null);
    setFinishedLessonId(null);
    setLessonChoices([]);
    setSelectedAnswer(null);
    setRetryingMistakes(false);
    setRetryQuestionPosition(0);
    setWrongQuestionIndices([]);
    setSelectedCourseWordKeys([]);
    setCourseWordsSavedMessage(null);
    setIdiomsSavedAutomatically(false);
    setError(null);
  };

  const returnToCourseList = () => {
    setActiveCourseId(null);
    setActiveLesson(null);
    setFinishedLessonId(null);
    setLessonChoices([]);
    setSelectedAnswer(null);
    setRetryingMistakes(false);
    setRetryQuestionPosition(0);
    setWrongQuestionIndices([]);
    setBulkAddConfirmationOpen(false);
    setBulkAddProgress(null);
    setBulkCourseWordsSavedMessage(null);
    setIdiomsSavedAutomatically(false);
    setError(null);
  };

  const finishLesson = async (
    finalCorrectCount = correctCount,
    alreadySaving = false,
  ) => {
    if (!activeLesson || (saving && !alreadySaving)) return;
    const lesson = activeLesson;
    const course = activeCourse;
    setSaving(true);
    try {
      await markCourseLessonCompleted(lesson.id);
      setLessonAttempts((previous) =>
        previous.filter((attempt) => attempt.lessonId !== lesson.id),
      );
      setCompletedLessons((previous) =>
        previous.includes(lesson.id)
          ? previous
          : [...previous, lesson.id],
      );
      setFinishedLessonId(lesson.id);
      const addableWords = buildCourseWordCandidates(
        lesson.questions.map((question) => question.term),
        course?.entriesByTerm ?? new Map(),
        savedWords,
      ).filter((candidate) => !candidate.alreadySaved);
      setSelectedCourseWordKeys(addableWords.map((candidate) => candidate.key));
      setIdiomsSavedAutomatically(false);
      setCourseWordsSavedMessage(null);
      setError(null);

      if (course?.id === IDIOM_COURSE_ID) {
        try {
          if (addableWords.length > 0) {
            await saveWords(addableWords.map(toCourseWordSaveInput));
          }
          setSelectedCourseWordKeys([]);
          setCourseWordsSavedMessage(
            addableWords.length > 0
              ? `Đã tự thêm ${addableWords.length} idiom mới vào Sổ từ.`
              : "Các idiom trong bài đã có sẵn trong Sổ từ.",
          );
          setIdiomsSavedAutomatically(true);
        } catch (failure) {
          const reason =
            failure instanceof Error ? ` ${failure.message}` : "";
          setError(
            `Bài học đã hoàn thành nhưng chưa tự thêm idiom vào Sổ từ.${reason} Bạn có thể chọn các mục bên dưới để thử lại.`,
          );
        }
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể lưu tiến độ bài học.",
      );
    } finally {
      setSaving(false);
    }
  };

  const advance = async () => {
    if (!activeLesson || !currentQuestion || !selectedAnswer || saving) return;
    const answeredCorrectly = selectedAnswer === currentQuestion.term;
    const updatedCorrectCount =
      correctCount + (answeredCorrectly ? 1 : 0);
    const updatedWrongIndices =
      !retryingMistakes && !answeredCorrectly
        ? [...wrongQuestionIndices, questionIndex]
        : wrongQuestionIndices;
    const persistAttempt = async (next: CourseLessonAttempt) => {
      const savedAttempt = await saveCourseLessonAttempt({
        lessonId: next.lessonId,
        currentIndex: next.currentIndex,
        correctCount: next.correctCount,
        wrongQuestionIndices: next.wrongQuestionIndices,
        retryIndex: next.retryIndex,
        retrying: next.retrying,
        selectedAnswer: next.selectedAnswer,
      });
      setLessonAttempts((previous) => [
        ...previous.filter((item) => item.lessonId !== savedAttempt.lessonId),
        savedAttempt,
      ]);
    };

    setSaving(true);
    try {
      if (retryingMistakes) {
        if (retryQuestionPosition >= wrongQuestionIndices.length - 1) {
          await finishLesson(updatedCorrectCount, true);
          return;
        }
        const nextRetryPosition = retryQuestionPosition + 1;
        const nextQuestionIndex = wrongQuestionIndices[nextRetryPosition];
        await persistAttempt({
          lessonId: activeLesson.id,
          currentIndex: nextQuestionIndex,
          correctCount: updatedCorrectCount,
          wrongQuestionIndices,
          retryIndex: nextRetryPosition,
          retrying: true,
          selectedAnswer: null,
          updatedAt: new Date().toISOString(),
        });
        setCorrectCount(updatedCorrectCount);
        setRetryQuestionPosition(nextRetryPosition);
        setQuestionIndex(nextQuestionIndex);
        setSelectedAnswer(null);
        return;
      }

      if (questionIndex < activeLesson.questions.length - 1) {
        const nextQuestionIndex = questionIndex + 1;
        await persistAttempt({
          lessonId: activeLesson.id,
          currentIndex: nextQuestionIndex,
          correctCount: updatedCorrectCount,
          wrongQuestionIndices: updatedWrongIndices,
          retryIndex: 0,
          retrying: false,
          selectedAnswer: null,
          updatedAt: new Date().toISOString(),
        });
        setCorrectCount(updatedCorrectCount);
        setWrongQuestionIndices(updatedWrongIndices);
        setQuestionIndex(nextQuestionIndex);
        setSelectedAnswer(null);
        return;
      }

      if (updatedWrongIndices.length > 0) {
        const firstRetryIndex = updatedWrongIndices[0];
        await persistAttempt({
          lessonId: activeLesson.id,
          currentIndex: firstRetryIndex,
          correctCount: updatedCorrectCount,
          wrongQuestionIndices: updatedWrongIndices,
          retryIndex: 0,
          retrying: true,
          selectedAnswer: null,
          updatedAt: new Date().toISOString(),
        });
        setCorrectCount(updatedCorrectCount);
        setWrongQuestionIndices(updatedWrongIndices);
        setRetryingMistakes(true);
        setRetryQuestionPosition(0);
        setQuestionIndex(firstRetryIndex);
        setSelectedAnswer(null);
        return;
      }

      await finishLesson(updatedCorrectCount, true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể lưu tiến độ bài học.",
      );
    } finally {
      setSaving(false);
    }
  };

  const currentQuestion =
    activeLesson?.questions[questionIndex] ?? null;
  const activeCourseCompleted = activeCourse
    ? completedLessons.filter((lessonId) =>
        activeCourse.lessons.some((lesson) => lesson.id === lessonId),
      )
    : [];
  const isLessonFinished =
    activeLesson !== null && finishedLessonId === activeLesson.id;
  const lessonWordCandidates =
    activeLesson && activeCourse
      ? buildCourseWordCandidates(
          activeLesson.questions.map((question) => question.term),
          activeCourse.entriesByTerm,
          savedWords,
        )
      : [];
  const addableLessonWords = lessonWordCandidates.filter(
    (candidate) => !candidate.alreadySaved,
  );

  const setAllCourseWordsSelected = (selected: boolean) => {
    setSelectedCourseWordKeys(
      selected ? addableLessonWords.map((candidate) => candidate.key) : [],
    );
  };

  const toggleCourseWord = (candidate: CourseWordCandidate) => {
    if (candidate.alreadySaved || saving) return;
    setSelectedCourseWordKeys((previous) =>
      previous.includes(candidate.key)
        ? previous.filter((key) => key !== candidate.key)
        : [...previous, candidate.key],
    );
  };

  const addSelectedCourseWords = async () => {
    if (!activeLesson || !activeCourse || saving) return;
    const selected = lessonWordCandidates.filter(
      (candidate) =>
        !candidate.alreadySaved &&
        selectedCourseWordKeys.includes(candidate.key),
    );
    if (selected.length === 0) return;

    setSaving(true);
    setError(null);
    setCourseWordsSavedMessage(null);
    try {
      await saveWords(
        selected.map(toCourseWordSaveInput),
      );
      setSelectedCourseWordKeys([]);
      if (activeCourse.id === IDIOM_COURSE_ID) {
        setIdiomsSavedAutomatically(true);
        setCourseWordsSavedMessage(
          `Đã thêm ${selected.length} idiom vào Sổ từ. Các mục mới bắt đầu ở Cấp 1.`,
        );
      } else {
        setCourseWordsSavedMessage(
          `Đã thêm ${selected.length} từ vào Sổ từ. Các từ mới bắt đầu ở Cấp 1.`,
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể thêm từ vào Sổ từ. Hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openBulkAddConfirmation = () => {
    if (!activeCourse || saving || addableAllCourseWords.length === 0) return;
    setBulkAddProgress(null);
    setBulkCourseWordsSavedMessage(null);
    setError(null);
    setBulkAddConfirmationOpen(true);
  };

  const cancelBulkAdd = () => {
    if (saving) return;
    setBulkAddConfirmationOpen(false);
  };

  const addAllCourseWords = async () => {
    if (
      !activeCourse ||
      saving ||
      addableAllCourseWords.length === 0
    ) {
      return;
    }

    const selected = addableAllCourseWords;
    const wordsNeedingIpa = selected.filter(
      (candidate) =>
        isSingleWordCourseTerm(candidate.term) && !candidate.ipa.trim(),
    );
    setSaving(true);
    setBulkAddProgress({
      completed: 0,
      total: wordsNeedingIpa.length || selected.length,
      stage: wordsNeedingIpa.length ? "ipa" : "save",
    });
    setError(null);
    setBulkCourseWordsSavedMessage(null);
    try {
      const ipaByTerm = await getDictionaryPronunciationsForTerms(
        wordsNeedingIpa.map((candidate) => candidate.term),
        (completed, total) =>
          setBulkAddProgress({ completed, total, stage: "ipa" }),
      );
      const missingIpa = wordsNeedingIpa.filter(
        (candidate) => !ipaByTerm.get(candidate.term)?.trim(),
      );
      if (missingIpa.length) {
        const examples = missingIpa
          .slice(0, 5)
          .map((candidate) => candidate.term)
          .join(", ");
        throw new Error(
          `Chưa tìm thấy IPA cho ${missingIpa.length.toLocaleString("vi-VN")} từ đơn${examples ? ` (ví dụ: ${examples})` : ""}. Chưa có từ nào được nạp; hãy cài dữ liệu từ điển/IPA rồi thử lại.`,
        );
      }

      setBulkAddProgress({
        completed: 0,
        total: selected.length,
        stage: "save",
      });
      await saveWords(
        selected.map((candidate) => ({
          term: candidate.term,
          meaning: candidate.meaning,
          ipa:
            candidate.ipa.trim() ||
            (isSingleWordCourseTerm(candidate.term)
              ? ipaByTerm.get(candidate.term)?.trim() ?? ""
              : ""),
          example: candidate.example,
          note: candidate.partOfSpeech
            ? `Từ loại: ${candidate.partOfSpeech}`
            : "",
        })),
        (completed, total) =>
          setBulkAddProgress({ completed, total, stage: "save" }),
      );
      setBulkCourseWordsSavedMessage(
        `Đã nạp ${selected.length.toLocaleString("vi-VN")} từ mới vào Sổ từ; bỏ qua ${alreadySavedCourseWords.toLocaleString("vi-VN")} từ đã có cùng nghĩa.`,
      );
      setBulkAddConfirmationOpen(false);
      setBulkAddProgress(null);
    } catch (failure) {
      setBulkAddProgress(null);
      setError(
        failure instanceof Error
          ? `${failure.message} Dữ liệu đã có vẫn được giữ nguyên; hãy thử lại.`
          : "Không thể nạp toàn bộ từ của khóa học. Dữ liệu đã có vẫn được giữ nguyên; hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.pageHeader,
          {
            paddingTop: top + 12,
            backgroundColor: activeCourse || activeLesson ? c.header : c.background,
          },
        ]}
      >
        {activeCourse || activeLesson ? (
          <MaterialSheen tone="navy" radius={0} />
        ) : null}
        <View style={styles.pageHeaderCopy}>
          <Text style={[styles.pageKicker, { color: c.headerMuted }]}>
            {activeLesson ? "BÀI HỌC NGOẠI TUYẾN" : "KHÓA HỌC NGOẠI TUYẾN"}
          </Text>
          <Text style={[styles.pageTitle, { color: c.headerForeground }]}>
            {activeLesson?.title ?? activeCourse?.title ?? "Khóa học"}
          </Text>
        </View>
        {activeLesson || activeCourse ? (
          <Pressable
            testID={
              activeLesson
                ? `${activeCourse?.testIdPrefix ?? "course"}-leave-lesson`
                : "return-to-course-list"
            }
            accessibilityRole="button"
            accessibilityLabel={
              activeLesson
                ? "Quay lại danh sách bài học"
                : "Quay lại danh sách khóa học"
            }
            onPress={activeLesson ? leaveLesson : returnToCourseList}
            hitSlop={10}
            style={styles.headerButton}
          >
            <Feather name="arrow-left" size={23} color={c.headerForeground} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View
            testID="course-error"
            style={[
              styles.errorBox,
              { backgroundColor: c.destructiveSoft, borderColor: c.destructive },
            ]}
          >
            <Text style={[styles.errorText, { color: c.destructiveText }]}>
              {error}
            </Text>
            {!activeLesson ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadProgress()}
                style={styles.retryButton}
              >
                <Text style={[styles.retryText, { color: c.destructiveText }]}>
                  Thử lại
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!courseBundle && !activeLesson ? (
          <View
            testID="course-data-required"
            style={[
              styles.courseDataNotice,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: c.accent }]}>
              {courseDataStatus === "checking" ? (
                <ActivityIndicator color={c.accentForeground} />
              ) : (
                <Feather
                  name={courseDataStatus === "damaged" ? "alert-circle" : "download"}
                  size={23}
                  color={c.accentForeground}
                />
              )}
            </View>
            <View style={styles.courseDataNoticeCopy}>
              <Text style={[styles.lessonTitle, { color: c.foreground }]}>
                {courseDataStatus === "checking"
                  ? "Đang kiểm tra dữ liệu khóa học"
                  : courseDataStatus === "damaged"
                    ? "Gói khóa học cần được tải lại"
                    : "Tải dữ liệu khóa học để bắt đầu"}
              </Text>
              <Text style={[styles.lessonFocus, { color: c.mutedForeground }]}>
                Tám khóa học được lưu thành gói riêng, không làm tăng bộ cài ứng dụng.
              </Text>
              {courseDataStatus !== "checking" ? (
                <Button
                  testID="course-data-open-settings"
                  label="Mở Cài đặt"
                  icon="settings"
                  onPress={() => router.push("/settings")}
                  style={styles.courseDataSettingsButton}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {activeLesson && currentQuestion ? (
          isLessonFinished ? (
            <LessonComplete
              testIdPrefix={activeCourse?.testIdPrefix ?? "course"}
              lesson={activeLesson}
              correctCount={correctCount}
              words={lessonWordCandidates}
              selectedWordKeys={selectedCourseWordKeys}
              savedMessage={courseWordsSavedMessage}
              autoSaveOnCompletion={activeCourse?.id === IDIOM_COURSE_ID}
              autoSaved={idiomsSavedAutomatically}
              saving={saving}
              onToggleWord={toggleCourseWord}
              onSelectAll={() => setAllCourseWordsSelected(true)}
              onClearSelection={() => setAllCourseWordsSelected(false)}
              onAddSelected={() => void addSelectedCourseWords()}
              onReturn={leaveLesson}
              onRetry={() => startLesson(activeLesson)}
            />
          ) : (
            <QuestionView
              testIdPrefix={activeCourse?.testIdPrefix ?? "course"}
              isIdiomCourse={activeCourse?.id === IDIOM_COURSE_ID}
              isBasicVocabularyCourse={
                activeCourse?.id === BASIC_VOCABULARY_COURSE_ID
              }
              isSentenceStructureCourse={activeCourse?.id === CONJUNCTION_COURSE_ID}
              lesson={activeLesson}
              question={currentQuestion}
              choices={lessonChoices[questionIndex] ?? currentQuestion.choices}
              entriesByTerm={activeCourse?.entriesByTerm ?? new Map()}
              distractorExplanations={
                activeCourse?.id === CONJUNCTION_COURSE_ID
                  ? courseBundle?.sentenceStructureDistractorExplanations
                  : undefined
              }
              questionIndex={questionIndex}
              isRetryingMistakes={retryingMistakes}
              retryQuestionPosition={retryQuestionPosition}
              retryQuestionCount={wrongQuestionIndices.length}
              wrongQuestionCount={wrongQuestionIndices.length}
              selectedAnswer={selectedAnswer}
              correctCount={correctCount}
              saving={saving}
              onSelect={(answer) => {
                if (selectedAnswer !== null) return;
                setSelectedAnswer(answer);
                void saveCourseLessonAttempt({
                  lessonId: activeLesson.id,
                  currentIndex: questionIndex,
                  correctCount,
                  wrongQuestionIndices,
                  retryIndex: retryQuestionPosition,
                  retrying: retryingMistakes,
                  selectedAnswer: answer,
                }).catch((failure) =>
                  setError(
                    failure instanceof Error
                      ? `Không thể lưu lựa chọn hiện tại. ${failure.message}`
                      : "Không thể lưu lựa chọn hiện tại.",
                  ),
                );
                void recordStoneInvestmentStudyDay("course").catch((failure) =>
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Không thể ghi nhận hoạt động học hôm nay.",
                  ),
                );
              }}
              onAdvance={() => void advance()}
            />
          )
        ) : activeCourse ? (
          <View style={styles.courseIntro}>
            <View
              style={[
                styles.courseHero,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <MaterialSheen tone="navy" radius={22} />
              <View style={[styles.heroIcon, { backgroundColor: c.accent }]}>
                <Feather
                  name={activeCourse.icon}
                  size={25}
                  color={c.accentForeground}
                />
              </View>
              <Text style={[styles.heroDescription, { color: c.mutedForeground }]}>
                {activeCourse.description}
              </Text>
              <View style={styles.courseStats}>
                <Feather name="wifi-off" size={15} color={c.primary} />
                <Text style={[styles.courseStatsText, { color: c.primary }]}>
                  {activeCourse.lessons.length} bài ·{" "}
                  {activeCourse.lessons.reduce(
                    (count, lesson) => count + lesson.questions.length,
                    0,
                  )}{" "}
                  câu
                  {activeCourse.wordCount
                    ? ` · ${activeCourse.wordCount.toLocaleString("vi-VN")} ${activeCourse.unitLabel ?? "từ"}`
                    : ""}{" "}
                  · học ngoại tuyến
                </Text>
              </View>
            </View>

            <View
              testID={`${activeCourse.testIdPrefix}-bulk-add-section`}
              style={styles.bulkAddSection}
            >
              <Button
                testID={`${activeCourse.testIdPrefix}-bulk-add-button`}
                label={
                  addableAllCourseWords.length > 0
                    ? `Nạp toàn bộ từ vào Sổ (${addableAllCourseWords.length.toLocaleString("vi-VN")} từ mới)`
                    : "Tất cả từ đã có trong Sổ"
                }
                icon="download"
                onPress={openBulkAddConfirmation}
                disabled={saving || addableAllCourseWords.length === 0}
              />
              <Text style={[styles.bulkAddHint, { color: c.mutedForeground }]}>
                {allCourseWordCandidates.length.toLocaleString("vi-VN")} mục từ đủ nghĩa
                {" · "}
                {alreadySavedCourseWords.toLocaleString("vi-VN")} mục đã có sẽ được bỏ qua
                {missingCourseEntries > 0
                  ? ` · ${missingCourseEntries.toLocaleString("vi-VN")} mục thiếu nghĩa sẽ không được thêm`
                  : ""}
              </Text>
              {bulkCourseWordsSavedMessage ? (
                <Text
                  testID={`${activeCourse.testIdPrefix}-bulk-add-success`}
                  style={[styles.courseWordSavedMessage, { color: c.successText }]}
                >
                  {bulkCourseWordsSavedMessage}
                </Text>
              ) : null}
            </View>

            <View style={styles.lessonHeading}>
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                Các bài học
              </Text>
              <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
                {activeCourseCompleted.length}/{activeCourse.lessons.length} đã hoàn thành
              </Text>
            </View>
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={c.primary} />
                <Text style={[styles.loadingText, { color: c.mutedForeground }]}>
                  Đang tải tiến độ…
                </Text>
              </View>
            ) : (
              activeCourse.lessons.map((lesson, index) => {
                const completed = completedLessons.includes(lesson.id);
                const attempt = lessonAttempts.find(
                  (item) => item.lessonId === lesson.id,
                );
                const startsChapter =
                  lesson.chapterId !== undefined &&
                  lesson.chapterId !==
                    activeCourse.lessons[index - 1]?.chapterId;
                const chapterLessons = startsChapter
                  ? activeCourse.lessons.filter(
                      (candidate) =>
                        candidate.chapterId === lesson.chapterId,
                    )
                  : [];
                const chapterCompletedCount = chapterLessons.filter(
                  (candidate) => completedLessons.includes(candidate.id),
                ).length;
                const chapterWordCount = chapterLessons.reduce(
                  (count, candidate) =>
                    count + candidate.questions.length,
                  0,
                );
                const startsTopic =
                  activeCourse.topicCount !== undefined &&
                  lesson.topicId !==
                    activeCourse.lessons[index - 1]?.topicId;
                const topicLessonCount = startsTopic
                  ? activeCourse.lessons.filter(
                      (candidate) => candidate.topicId === lesson.topicId,
                    ).length
                  : 0;
                return (
                  <React.Fragment key={lesson.id}>
                    {startsChapter ? (
                      <View
                        testID={`${activeCourse.testIdPrefix}-chapter-${lesson.chapterId}`}
                        accessibilityLabel={`${lesson.chapterTitle}, ${chapterCompletedCount} trên ${chapterLessons.length} bài hoàn thành`}
                        style={[
                          styles.chapterGroupHeading,
                          {
                            backgroundColor: c.card,
                            borderColor: c.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.chapterNumberBadge,
                            { backgroundColor: c.primary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chapterNumberText,
                              { color: c.primaryForeground },
                            ]}
                          >
                            CHƯƠNG {lesson.chapterNumber}
                          </Text>
                        </View>
                        <View style={styles.chapterGroupCopy}>
                          <Text
                            style={[
                              styles.chapterGroupTitle,
                              { color: c.foreground },
                            ]}
                          >
                            {lesson.chapterTitle}
                          </Text>
                          <Text
                            style={[
                              styles.chapterGroupHint,
                              { color: c.mutedForeground },
                            ]}
                          >
                            {chapterLessons.length} bài · {chapterWordCount} từ
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.chapterProgress,
                            { color: c.primary },
                          ]}
                        >
                          {chapterCompletedCount}/{chapterLessons.length}
                        </Text>
                      </View>
                    ) : null}
                    {startsTopic ? (
                      <View style={styles.topicGroupHeading}>
                        <Text
                          style={[
                            styles.topicGroupTitle,
                            { color: c.foreground },
                          ]}
                        >
                          {lesson.topicTitle}
                        </Text>
                        <Text
                          style={[
                            styles.topicGroupHint,
                            { color: c.mutedForeground },
                          ]}
                        >
                          {topicLessonCount} bài ·{" "}
                          {activeCourse.lessons
                            .filter(
                              (candidate) =>
                                candidate.topicId === lesson.topicId,
                            )
                            .reduce(
                              (count, candidate) =>
                                count + candidate.questions.length,
                              0,
                            )}{" "}
                          từ
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={[
                        styles.lessonCard,
                        {
                          backgroundColor: completed ? c.successSoft : c.card,
                          borderColor: completed ? c.success : c.border,
                        },
                      ]}
                    >
                      <MaterialSheen
                        tone={completed ? "surface" : "navy"}
                        radius={18}
                      />
                      <Pressable
                        testID={`${activeCourse.testIdPrefix}-lesson-${index + 1}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${lesson.topicTitle ? `${lesson.topicTitle}, ` : ""}${lesson.title}, ${lesson.questions.length} câu${completed ? ", đã hoàn thành" : attempt ? attempt.retrying ? `, đang làm lại câu sai ${attempt.retryIndex + 1} trên ${attempt.wrongQuestionIndices.length}, chạm để tiếp tục` : `, đang học câu ${attempt.currentIndex + 1}, chạm để tiếp tục` : ""}`}
                        onPress={() => void startLesson(lesson)}
                        style={({ pressed }) => [
                          styles.lessonMain,
                          { opacity: pressed ? 0.86 : 1 },
                        ]}
                      >
                        <View
                          style={[
                            styles.lessonNumber,
                            {
                              backgroundColor: completed
                                ? c.success
                                : c.secondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.lessonNumberText,
                              {
                                color: completed
                                  ? c.destructiveForeground
                                  : c.secondaryForeground,
                              },
                            ]}
                          >
                            {completed ? "✓" : index + 1}
                          </Text>
                        </View>
                        <View style={styles.lessonCopy}>
                          <Text
                            style={[
                              styles.lessonTitle,
                              { color: completed ? c.successText : c.foreground },
                            ]}
                          >
                            {lesson.title}
                          </Text>
                          <Text
                            style={[
                              styles.lessonFocus,
                              { color: c.mutedForeground },
                            ]}
                            numberOfLines={2}
                          >
                            {lesson.focus}
                          </Text>
                          <Text
                            style={[
                              styles.lessonCount,
                              { color: completed ? c.successText : c.primary },
                            ]}
                          >
                            {lesson.questions.length} từ ·{" "}
                            {completed
                              ? "Đã hoàn thành"
                              : attempt
                                ? attempt.retrying
                                  ? `Làm lại câu sai ${attempt.retryIndex + 1}/${attempt.wrongQuestionIndices.length}`
                                  : `Đang học · câu ${attempt.currentIndex + 1}/${lesson.questions.length}`
                                : "Chưa học"}
                          </Text>
                        </View>
                      </Pressable>
                      {attempt && !completed ? (
                        <Pressable
                          testID={`${activeCourse.testIdPrefix}-resume-lesson-${index + 1}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Tiếp tục ${lesson.title}${attempt.retrying ? `, làm lại câu sai ${attempt.retryIndex + 1} trên ${attempt.wrongQuestionIndices.length}` : ` từ câu ${attempt.currentIndex + 1}`}`}
                          onPress={() => void startLesson(lesson)}
                          style={styles.lessonResumeAction}
                        >
                          <Feather name="play-circle" size={20} color={c.primary} />
                          <Text style={[styles.lessonResumeText, { color: c.primary }]}>
                            Tiếp tục
                          </Text>
                        </Pressable>
                      ) : (
                        <Feather
                          name={completed ? "check-circle" : "chevron-right"}
                          size={22}
                          color={completed ? c.success : c.primary}
                        />
                      )}
                    </View>
                  </React.Fragment>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.courseIntro}>
            {courseBundle ? <LearningGoalCard
              goal={learningGoal}
              courseTitle={learningGoalCourse?.title ?? null}
              recommendation={
                recommendedGoalLesson
                  ? {
                      title: recommendedGoalLesson.title,
                      focus: recommendedGoalLesson.focus,
                      isResume: !!recommendedGoalLessonAttempt,
                    }
                  : null
              }
              loading={!learningGoalReady || loading}
              saving={learningGoalSaving}
              onChoose={chooseLearningGoal}
              onOpenCourse={() => {
                if (learningGoalCourse) {
                  setActiveCourseId(learningGoalCourse.id);
                }
              }}
            /> : null}
            {courseCatalog.map((course) => {
              const completedCount = completedLessons.filter((lessonId) =>
                course.lessons.some((lesson) => lesson.id === lessonId),
              ).length;
              const progressPercent = course.lessons.length
                ? Math.round((completedCount / course.lessons.length) * 100)
                : 0;
              const questionCount = course.lessons.reduce(
                (count, lesson) => count + lesson.questions.length,
                0,
              );
              return (
                <Pressable
                  key={course.id}
                  testID={`${course.testIdPrefix}-course-card`}
                  accessibilityRole="button"
                  accessibilityLabel={`${course.title}, ${completedCount} trên ${course.lessons.length} bài hoàn thành, ${progressPercent} phần trăm, ${questionCount} câu`}
                  onPress={() => setActiveCourseId(course.id)}
                  style={({ pressed }) => [
                    styles.catalogCard,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      opacity: pressed ? 0.86 : 1,
                    },
                  ]}
                >
                  <MaterialSheen tone="navy" radius={18} />
                  <Image
                    source={course.catalogArtwork}
                    resizeMode="contain"
                    accessible={false}
                    style={styles.catalogIcon}
                  />
                  <View style={styles.lessonCopy}>
                    <Text style={[styles.lessonTitle, { color: c.foreground }]}>
                      {course.title}
                    </Text>
                    <Text
                      style={[styles.lessonFocus, { color: c.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {course.description}
                    </Text>
                    <Text style={[styles.lessonCount, { color: c.primary }]}>
                      {course.lessons.length} bài · {questionCount} câu
                    </Text>
                    <View style={styles.courseProgress}>
                      <View style={styles.courseProgressLabels}>
                        <Text
                          style={[
                            styles.courseProgressText,
                            { color: c.mutedForeground },
                          ]}
                        >
                          {completedCount}/{course.lessons.length} bài hoàn thành
                        </Text>
                        <Text
                          style={[
                            styles.courseProgressPercent,
                            { color: progressPercent === 100 ? c.success : c.primary },
                          ]}
                        >
                          {progressPercent}%
                        </Text>
                      </View>
                      <View
                        testID={`${course.testIdPrefix}-course-progress`}
                        accessible
                        accessibilityRole="progressbar"
                        accessibilityLabel={`Tiến độ ${course.title}`}
                        accessibilityValue={{
                          min: 0,
                          max: course.lessons.length,
                          now: completedCount,
                        }}
                        style={[
                          styles.courseProgressTrack,
                          { backgroundColor: c.muted },
                        ]}
                      >
                        <View
                          testID={`${course.testIdPrefix}-course-progress-fill`}
                          style={[
                            styles.courseProgressFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor:
                                progressPercent === 100 ? c.success : c.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={22} color={c.primary} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Modal
        testID="dictionary-related-lesson-picker"
        visible={relatedLessonChoices.length > 1}
        transparent
        animationType="fade"
        onRequestClose={() => setRelatedLessonChoices([])}
      >
        <View
          style={[
            styles.bulkAddBackdrop,
            { backgroundColor: c.overlay },
          ]}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.relatedLessonDialog,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                borderRadius: c.radius + 6,
              },
            ]}
          >
            <View style={styles.bulkAddDialogHeading}>
              <View
                style={[
                  styles.bulkAddInfoIcon,
                  { backgroundColor: c.secondary },
                ]}
              >
                <Feather name="book-open" size={21} color={c.primary} />
              </View>
              <View style={styles.bulkAddDialogTitleCopy}>
                <Text
                  style={[styles.bulkAddDialogTitle, { color: c.foreground }]}
                >
                  Chọn bài học
                </Text>
                <Text
                  style={[
                    styles.bulkAddDialogSubtitle,
                    { color: c.mutedForeground },
                  ]}
                >
                  Từ “{requestedTerm}” có trong nhiều bài
                </Text>
              </View>
            </View>
            <ScrollView
              style={styles.relatedLessonList}
              contentContainerStyle={styles.bulkAddDialogContent}
              showsVerticalScrollIndicator
            >
              {relatedLessonChoices.map(({ courseId, courseTitle, lesson }) => (
                <Pressable
                  key={`${courseId}-${lesson.id}`}
                  testID={`dictionary-related-lesson-${lesson.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Mở ${lesson.title}${lesson.topicTitle ? `, ${lesson.topicTitle}` : ""} trong khóa ${courseTitle}`}
                  onPress={() => {
                    setRelatedLessonChoices([]);
                    void startLesson(lesson, courseId);
                  }}
                  style={({ pressed }) => [
                    styles.relatedLessonOption,
                    {
                      backgroundColor: c.secondary,
                      borderColor: c.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <View style={styles.relatedLessonCopy}>
                    <Text
                      style={[
                        styles.relatedLessonCourse,
                        { color: c.primary },
                      ]}
                    >
                      {courseTitle}
                    </Text>
                    {lesson.topicTitle ? (
                      <Text
                        style={[
                          styles.relatedLessonCourse,
                          { color: c.mutedForeground },
                        ]}
                      >
                        {lesson.topicTitle}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.relatedLessonTitle,
                        { color: c.foreground },
                      ]}
                    >
                      {lesson.title}
                    </Text>
                    <Text
                      style={[
                        styles.relatedLessonFocus,
                        { color: c.mutedForeground },
                      ]}
                    >
                      {lesson.focus}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={21} color={c.primary} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              testID="dictionary-related-lesson-cancel"
              accessibilityRole="button"
              onPress={() => setRelatedLessonChoices([])}
              style={styles.relatedLessonCancel}
            >
              <Text
                style={[
                  styles.relatedLessonCancelText,
                  { color: c.mutedForeground },
                ]}
              >
                Để sau
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {activeCourse ? (
        <Modal
          testID={`${activeCourse.testIdPrefix}-bulk-add-confirmation`}
          visible={bulkAddConfirmationOpen}
          transparent
          animationType="fade"
          onRequestClose={cancelBulkAdd}
        >
          <View
            style={[
              styles.bulkAddBackdrop,
              { backgroundColor: c.overlay },
            ]}
          >
            <View
              accessibilityViewIsModal
              style={[
                styles.bulkAddDialog,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  borderRadius: c.radius + 6,
                },
              ]}
            >
              <View style={styles.bulkAddDialogHeading}>
                <View
                  style={[
                    styles.bulkAddInfoIcon,
                    { backgroundColor: c.secondary },
                  ]}
                >
                  <Feather
                    name="book-open"
                    size={21}
                    color={c.primary}
                  />
                </View>
                <View style={styles.bulkAddDialogTitleCopy}>
                  <Text
                    style={[styles.bulkAddDialogTitle, { color: c.foreground }]}
                  >
                    Xác nhận nạp toàn khóa
                  </Text>
                  <Text
                    style={[
                      styles.bulkAddDialogSubtitle,
                      { color: c.mutedForeground },
                    ]}
                  >
                    {activeCourse.title}
                  </Text>
                </View>
              </View>
              <ScrollView
                style={styles.bulkAddDialogScroll}
                contentContainerStyle={styles.bulkAddDialogContent}
                showsVerticalScrollIndicator
              >
                <View
                  testID={`${activeCourse.testIdPrefix}-bulk-add-summary`}
                  style={[
                    styles.bulkAddSummary,
                    { backgroundColor: c.secondary, borderColor: c.border },
                  ]}
                >
                  <View style={styles.bulkAddSummaryRow}>
                    <Text style={[styles.bulkAddSummaryLabel, { color: c.foreground }]}>
                      Từ mới sẽ thêm
                    </Text>
                    <Text style={[styles.bulkAddSummaryValue, { color: c.primary }]}>
                      {addableAllCourseWords.length.toLocaleString("vi-VN")}
                    </Text>
                  </View>
                  <View style={styles.bulkAddSummaryRow}>
                    <Text style={[styles.bulkAddSummaryLabel, { color: c.foreground }]}>
                      Từ trùng nghĩa sẽ bỏ qua
                    </Text>
                    <Text style={[styles.bulkAddSummaryValue, { color: c.foreground }]}>
                      {alreadySavedCourseWords.toLocaleString("vi-VN")}
                    </Text>
                  </View>
                  {missingCourseEntries > 0 ? (
                    <View style={styles.bulkAddSummaryRow}>
                      <Text style={[styles.bulkAddSummaryLabel, { color: c.foreground }]}>
                        Mục thiếu nghĩa, không thêm
                      </Text>
                      <Text style={[styles.bulkAddSummaryValue, { color: c.foreground }]}>
                        {missingCourseEntries.toLocaleString("vi-VN")}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.bulkAddSummaryRow}>
                    <Text style={[styles.bulkAddSummaryLabel, { color: c.foreground }]}>
                      Từ đơn cần bổ sung IPA
                    </Text>
                    <Text style={[styles.bulkAddSummaryValue, { color: c.foreground }]}>
                      {bulkIpaRequiredCount.toLocaleString("vi-VN")}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.bulkAddHint, { color: c.mutedForeground }]}>
                  Từ đơn sẽ được tra IPA ngoại tuyến; cụm từ không cần IPA.
                </Text>

                {error ? (
                  <View
                    testID={`${activeCourse.testIdPrefix}-bulk-add-error`}
                    style={[
                      styles.bulkAddError,
                      {
                        backgroundColor: c.destructiveSoft,
                        borderColor: c.destructive,
                      },
                    ]}
                  >
                    <Text style={[styles.errorText, { color: c.destructiveText }]}>
                      {error}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              {saving && bulkAddProgress ? (
                <View
                  testID={`${activeCourse.testIdPrefix}-bulk-add-progress`}
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: bulkAddProgress.total,
                    now: bulkAddProgress.completed,
                  }}
                  style={styles.bulkAddProgress}
                >
                  <View style={styles.bulkAddProgressCopy}>
                    <ActivityIndicator color={c.primary} size="small" />
                    <Text
                      style={[
                        styles.bulkAddProgressText,
                        { color: c.foreground },
                      ]}
                    >
                      {bulkAddProgress.stage === "ipa"
                        ? "Đang bổ sung IPA:"
                        : "Đang nạp từ vào Sổ:"}{" "}
                      {bulkAddProgress.completed.toLocaleString("vi-VN")} /{" "}
                      {bulkAddProgress.total.toLocaleString("vi-VN")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bulkAddProgressTrack,
                      { backgroundColor: c.muted },
                    ]}
                  >
                    <View
                      testID={`${activeCourse.testIdPrefix}-bulk-add-progress-fill`}
                      style={[
                        styles.bulkAddProgressFill,
                        {
                          backgroundColor: c.primary,
                          width: `${
                            (bulkAddProgress.completed / bulkAddProgress.total) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.bulkAddActions}>
                <Button
                  testID={`${activeCourse.testIdPrefix}-bulk-add-cancel`}
                  label="Hủy"
                  variant="ghost"
                  onPress={cancelBulkAdd}
                  disabled={saving}
                  style={styles.bulkAddActionButton}
                />
                <Button
                  testID={`${activeCourse.testIdPrefix}-bulk-add-confirm`}
                  label={
                    saving
                      ? "Đang nạp từ..."
                      : `Nạp ${addableAllCourseWords.length.toLocaleString("vi-VN")} từ`
                  }
                  onPress={() => void addAllCourseWords()}
                  disabled={saving || addableAllCourseWords.length === 0}
                  loading={saving}
                  style={styles.bulkAddActionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function QuestionView({
  testIdPrefix,
  isIdiomCourse,
  isBasicVocabularyCourse,
  isSentenceStructureCourse,
  lesson,
  question,
  choices,
  entriesByTerm,
  distractorExplanations,
  questionIndex,
  isRetryingMistakes,
  retryQuestionPosition,
  retryQuestionCount,
  wrongQuestionCount,
  selectedAnswer,
  correctCount,
  saving,
  onSelect,
  onAdvance,
}: {
  testIdPrefix: string;
  isIdiomCourse: boolean;
  isBasicVocabularyCourse: boolean;
  isSentenceStructureCourse: boolean;
  lesson: CourseLesson;
  question: CourseQuestion;
  choices: readonly string[];
  entriesByTerm: ReadonlyMap<string, CourseAnswer>;
  distractorExplanations?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  questionIndex: number;
  isRetryingMistakes: boolean;
  retryQuestionPosition: number;
  retryQuestionCount: number;
  wrongQuestionCount: number;
  selectedAnswer: string | null;
  correctCount: number;
  saving: boolean;
  onSelect: (answer: string) => void;
  onAdvance: () => void;
}) {
  const c = useColors();
  const { height: windowHeight } = useWindowDimensions();
  const answer = entriesByTerm.get(question.term);
  const isCorrect = selectedAnswer === question.term;
  const distractorExplanation =
    selectedAnswer && !isCorrect
      ? distractorExplanations?.[question.term]?.[selectedAnswer]
      : undefined;
  const progress = isRetryingMistakes
    ? ((retryQuestionPosition + 1) / Math.max(1, retryQuestionCount)) * 100
    : ((questionIndex + 1) / lesson.questions.length) * 100;
  const nextLabel = isRetryingMistakes
    ? retryQuestionPosition === retryQuestionCount - 1
      ? "Hoàn thành bài"
      : "Câu sai tiếp theo"
    : questionIndex === lesson.questions.length - 1
      ? wrongQuestionCount > 0 || (selectedAnswer !== null && !isCorrect)
        ? "Làm lại câu sai"
        : "Hoàn thành bài"
      : "Câu tiếp theo";
  const displayedCorrectCount =
    correctCount + (selectedAnswer === question.term ? 1 : 0);

  return (
    <View style={styles.quiz}>
      <View style={styles.quizProgressRow}>
        <Text style={[styles.quizStep, { color: c.mutedForeground }]}>
          {isRetryingMistakes
            ? `LÀM LẠI CÂU SAI ${retryQuestionPosition + 1}/${retryQuestionCount}`
            : `CÂU ${questionIndex + 1} / ${lesson.questions.length}`}
        </Text>
        <Text style={[styles.quizScore, { color: c.primary }]}>
          {displayedCorrectCount} đúng
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.muted }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%`, backgroundColor: c.accent },
          ]}
        />
      </View>
      <Text style={[styles.lessonFocus, { color: c.mutedForeground }]}>
        {lesson.title}
      </Text>
      {!isSentenceStructureCourse ? (
        <Text
          testID={
            isBasicVocabularyCourse
              ? `${testIdPrefix}-question-instruction`
              : undefined
          }
          style={[styles.questionTitle, { color: c.foreground }]}
        >
          {isBasicVocabularyCourse
            ? "Chọn từ tiếng Anh tương ứng với nghĩa tiếng Việt"
            : "Chọn từ hoặc cụm phù hợp nhất để hoàn thành câu"}
        </Text>
      ) : null}
      {isIdiomCourse ? (
        <View testID="idioms-dialogue" style={styles.idiomDialogue}>
          <View style={styles.idiomDialogueMessage}>
            <Image
              testID="idioms-dialogue-corvi-avatar"
              source={require("../../assets/images/corvi-dialogue-avatar.png")}
              accessibilityLabel="Corvi"
              resizeMode="cover"
              resizeMethod="scale"
              style={[styles.idiomDialogueAvatar, { borderColor: c.accent }]}
            />
            <View
              style={[
                styles.idiomDialogueBubble,
                styles.idiomCorviBubble,
                { backgroundColor: c.secondary, borderColor: c.border },
              ]}
            >
              <Text style={[styles.idiomDialogueSpeaker, { color: c.primary }]}>
                Corvi
              </Text>
              <Text style={[styles.idiomDialogueText, { color: c.secondaryForeground }]}>
                {question.dialoguePrompt}
              </Text>
            </View>
          </View>
          <View style={styles.idiomReplyRow}>
            <View
              testID="idioms-dialogue-reply"
              style={[
                styles.idiomDialogueBubble,
                styles.idiomReplyBubble,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <Text style={[styles.idiomDialogueSpeaker, { color: c.primary }]}>
                Pan
              </Text>
              <Text
                testID={`${testIdPrefix}-question-prompt`}
                style={[styles.promptText, { color: c.foreground }]}
              >
                {question.prompt}
              </Text>
            </View>
            <Image
              testID="idioms-dialogue-pan-avatar"
              source={require("../../assets/images/pan-dialogue-avatar.png")}
              accessibilityLabel="Cừu Pan"
              resizeMode="cover"
              resizeMethod="scale"
              style={[styles.idiomDialogueAvatar, { borderColor: c.accent }]}
            />
          </View>
        </View>
      ) : isSentenceStructureCourse ? (
        <View testID="sentence-structure-dialogue" style={styles.idiomDialogue}>
          <View style={styles.idiomDialogueMessage}>
            <Image
              testID="sentence-structure-dialogue-corvi-avatar"
              source={require("../../assets/images/corvi-dialogue-avatar.png")}
              accessibilityLabel="Corvi"
              resizeMode="cover"
              resizeMethod="scale"
              style={[styles.idiomDialogueAvatar, { borderColor: c.accent }]}
            />
            <View
              style={[
                styles.idiomDialogueBubble,
                styles.idiomCorviBubble,
                { backgroundColor: c.secondary, borderColor: c.border },
              ]}
            >
              <Text style={[styles.idiomDialogueSpeaker, { color: c.primary }]}>
                Corvi
              </Text>
              <Text style={[styles.idiomDialogueText, { color: c.secondaryForeground }]}>
                Chọn từ hoặc cụm phù hợp nhất để hoàn thành câu
              </Text>
            </View>
          </View>
          <View style={styles.idiomReplyRow}>
            <View
              testID="sentence-structure-dialogue-reply"
              style={[
                styles.idiomDialogueBubble,
                styles.idiomReplyBubble,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <Text style={[styles.idiomDialogueSpeaker, { color: c.primary }]}>
                Baron
              </Text>
              <Text
                testID={`${testIdPrefix}-question-prompt`}
                style={[styles.promptText, { color: c.foreground }]}
              >
                {question.prompt}
              </Text>
            </View>
            <Image
              testID="sentence-structure-dialogue-baron-avatar"
              source={require("../../assets/images/baron-dialogue-avatar.png")}
              accessibilityLabel="Baron"
              resizeMode="cover"
              resizeMethod="scale"
              style={[styles.idiomDialogueAvatar, { borderColor: c.accent }]}
            />
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.promptCard,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <Text
            testID={`${testIdPrefix}-question-prompt`}
            style={[styles.promptText, { color: c.foreground }]}
          >
            {question.prompt}
          </Text>
        </View>
      )}
      <View style={styles.choices}>
        {choices.map((choice) => {
          const selected = selectedAnswer === choice;
          const showCorrect = selectedAnswer !== null && choice === question.term;
          return (
            <Pressable
              key={choice}
              testID={`${testIdPrefix}-choice-${choice}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: selectedAnswer !== null }}
              disabled={selectedAnswer !== null}
              onPress={() => onSelect(choice)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: showCorrect
                    ? c.successSoft
                    : selected
                      ? c.destructiveSoft
                      : c.card,
                  borderColor: showCorrect
                    ? c.success
                    : selected
                      ? c.destructive
                      : c.border,
                  opacity: pressed ? 0.84 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  {
                    color: showCorrect
                      ? c.successText
                      : selected
                        ? c.destructiveText
                        : c.foreground,
                  },
                ]}
              >
                {choice}
              </Text>
              {showCorrect ? (
                <Feather name="check-circle" size={19} color={c.success} />
              ) : selected ? (
                <Feather name="x-circle" size={19} color={c.destructive} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {selectedAnswer !== null && isCorrect ? (
        <Modal
          testID={`${testIdPrefix}-correct-popup`}
          transparent
          visible
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View
            style={[
              styles.correctPopupBackdrop,
              { backgroundColor: c.overlay },
            ]}
          >
            <View
              testID={`${testIdPrefix}-answer-feedback`}
              accessibilityLiveRegion="polite"
              style={[
                styles.correctPopupCard,
                {
                  backgroundColor: c.successSoft,
                  borderColor: c.success,
                  borderRadius: c.radius,
                  maxHeight: Math.min(windowHeight * 0.78, 680),
                },
              ]}
            >
              <MaterialSheen radius={c.radius} />
              <View style={styles.correctPopupHeading}>
                <Feather name="check-circle" size={22} color={c.success} />
                <Text
                  style={[styles.feedbackTitle, { color: c.successText }]}
                >
                  Chính xác!
                </Text>
              </View>
              <ScrollView
                style={styles.correctPopupScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.correctPopupDetails}
              >
                <Text style={[styles.correctPopupLabel, { color: c.mutedForeground }]}>
                  Đáp án
                </Text>
                <Text
                  testID={`${testIdPrefix}-answer-correct`}
                  style={[styles.correctPopupAnswer, { color: c.foreground }]}
                >
                  {question.term}
                </Text>
                {answer?.partOfSpeech ? (
                  <Text
                    testID={`${testIdPrefix}-part-of-speech`}
                    style={[
                      styles.feedbackTranslation,
                      { color: c.primary },
                    ]}
                  >
                    {`Từ loại: ${answer.partOfSpeech}`}
                  </Text>
                ) : null}
                {answer?.definition ? (
                  <>
                    {isSentenceStructureCourse ? (
                      <Text
                        testID={`${testIdPrefix}-grammar-explanation-label`}
                        style={[
                          styles.feedbackTranslation,
                          { color: c.primary },
                        ]}
                      >
                        Vì sao cấu trúc này phù hợp
                      </Text>
                    ) : null}
                    <Text
                      testID={
                        isSentenceStructureCourse
                          ? `${testIdPrefix}-grammar-explanation`
                          : undefined
                      }
                      style={[styles.feedbackMeaning, { color: c.foreground }]}
                    >
                      {answer.definition}
                    </Text>
                  </>
                ) : null}
                {answer?.example ? (
                  <Text
                    style={[
                      styles.feedbackExample,
                      { color: c.foreground, fontStyle: "italic" },
                    ]}
                  >
                    {answer.example}
                  </Text>
                ) : null}
                {answer?.spellingNote ? (
                  <Text style={[styles.feedbackTranslation, { color: c.mutedForeground }]}>
                    {answer.spellingNote}
                  </Text>
                ) : null}
                {answer?.exampleTranslation?.trim() ? (
                  <Text style={[styles.feedbackTranslation, { color: c.mutedForeground }]}>
                    {answer.exampleTranslation}
                  </Text>
                ) : null}
              </ScrollView>
              <Button
                testID={`${testIdPrefix}-next`}
                onPress={onAdvance}
                disabled={saving}
                style={styles.nextButton}
                label={saving ? "Đang lưu…" : nextLabel}
              />
            </View>
          </View>
        </Modal>
      ) : null}
      {selectedAnswer !== null && !isCorrect && answer ? (
        <View
          testID={`${testIdPrefix}-answer-feedback`}
          style={[
            styles.feedback,
            {
              backgroundColor: isCorrect ? c.successSoft : c.destructiveSoft,
              borderColor: isCorrect ? c.success : c.destructive,
            },
          ]}
        >
          <Text
            style={[
              styles.feedbackTitle,
              { color: isCorrect ? c.successText : c.destructiveText },
            ]}
          >
            {isCorrect ? "Chính xác!" : `Đáp án: ${question.term}`}
          </Text>
          {answer.partOfSpeech ? (
            <Text
              testID={`${testIdPrefix}-part-of-speech`}
              style={[styles.feedbackTranslation, { color: c.primary }]}
            >
              {`Từ loại: ${answer.partOfSpeech}`}
            </Text>
          ) : null}
          {isSentenceStructureCourse ? (
            <Text
              testID={`${testIdPrefix}-grammar-explanation-label`}
              style={[styles.feedbackTranslation, { color: c.primary }]}
            >
              Vì sao cấu trúc này phù hợp
            </Text>
          ) : null}
          <Text
            testID={
              isSentenceStructureCourse
                ? `${testIdPrefix}-grammar-explanation`
                : undefined
            }
            style={[styles.feedbackMeaning, { color: c.foreground }]}
          >
            {answer.definition}
          </Text>
          {isSentenceStructureCourse && distractorExplanation ? (
            <>
              <Text
                testID={`${testIdPrefix}-distractor-explanation-label`}
                style={[styles.feedbackTranslation, { color: c.primary }]}
              >
                Vì sao lựa chọn của bạn chưa phù hợp
              </Text>
              <Text
                testID={`${testIdPrefix}-distractor-explanation`}
                style={[styles.feedbackMeaning, { color: c.foreground }]}
              >
                {distractorExplanation}
              </Text>
            </>
          ) : null}
          {answer.example ? (
            <Text style={[styles.feedbackExample, { color: c.foreground }]}>
              {answer.example}
            </Text>
          ) : null}
          {answer.spellingNote ? (
            <Text
              testID={`${testIdPrefix}-spelling-note`}
              style={[
                styles.feedbackTranslation,
                { color: c.mutedForeground },
              ]}
            >
              {answer.spellingNote}
            </Text>
          ) : null}
          {answer.exampleTranslation?.trim() ? (
            <Text
              style={[
                styles.feedbackTranslation,
                { color: c.mutedForeground },
              ]}
            >
              {answer.exampleTranslation}
            </Text>
          ) : null}
        </View>
      ) : null}
      {selectedAnswer !== null && !isCorrect ? (
        <Button
          testID={`${testIdPrefix}-next`}
          onPress={onAdvance}
          disabled={saving}
          style={styles.nextButton}
          label={saving ? "Đang lưu…" : nextLabel}
        />
      ) : null}
    </View>
  );
}

function LessonComplete({
  testIdPrefix,
  lesson,
  correctCount,
  words,
  selectedWordKeys,
  savedMessage,
  autoSaveOnCompletion,
  autoSaved,
  saving,
  onToggleWord,
  onSelectAll,
  onClearSelection,
  onAddSelected,
  onReturn,
  onRetry,
}: {
  testIdPrefix: string;
  lesson: CourseLesson;
  correctCount: number;
  words: readonly CourseWordCandidate[];
  selectedWordKeys: readonly string[];
  savedMessage: string | null;
  autoSaveOnCompletion: boolean;
  autoSaved: boolean;
  saving: boolean;
  onToggleWord: (candidate: CourseWordCandidate) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onAddSelected: () => void;
  onReturn: () => void;
  onRetry: () => void;
}) {
  const c = useColors();
  const selectedCount = words.filter(
    (word) => !word.alreadySaved && selectedWordKeys.includes(word.key),
  ).length;
  const addableCount = words.filter((word) => !word.alreadySaved).length;
  return (
    <View
      testID={`${testIdPrefix}-lesson-complete`}
      style={[
        styles.completeCard,
        { backgroundColor: c.successSoft, borderColor: c.success },
      ]}
    >
      <View style={[styles.completeIcon, { backgroundColor: c.success }]}>
        <Feather name="check" size={30} color={c.destructiveForeground} />
      </View>
      <Text style={[styles.completeTitle, { color: c.successText }]}>
        Hoàn thành bài học
      </Text>
      <Text style={[styles.completeLesson, { color: c.foreground }]}>
        {lesson.title}
      </Text>
      <Text style={[styles.completeScore, { color: c.mutedForeground }]}>
        Đúng {correctCount}/{lesson.questions.length} câu
      </Text>
      {autoSaved ? (
        <Text
          testID={`${testIdPrefix}-words-added-message`}
          style={[styles.courseWordSavedMessage, { color: c.successText }]}
        >
          {savedMessage ?? "Các idiom trong bài đã được lưu vào Sổ từ."}
        </Text>
      ) : (
      <View
        testID={`${testIdPrefix}-word-selection`}
        style={[
          styles.courseWordSelection,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <Text style={[styles.courseWordSelectionTitle, { color: c.foreground }]}>
          Chọn từ muốn thêm vào Sổ từ
        </Text>
        <Text
          style={[
            styles.courseWordSelectionHint,
            { color: c.mutedForeground },
          ]}
        >
          {autoSaveOnCompletion
            ? "Nếu tự lưu chưa thành công, chọn idiom rồi thử thêm lại."
            : "Bài học không tự thêm từ. Từ đã có trong Sổ sẽ được đánh dấu."}
        </Text>
        <View style={styles.courseWordSelectionActions}>
          <Pressable
            testID={`${testIdPrefix}-select-all-words`}
            accessibilityRole="button"
            onPress={onSelectAll}
            disabled={saving || addableCount === 0}
            style={styles.courseWordSelectionAction}
          >
            <Text style={[styles.courseWordSelectionActionText, { color: c.primary }]}>
              Chọn tất cả
            </Text>
          </Pressable>
          <Pressable
            testID={`${testIdPrefix}-clear-word-selection`}
            accessibilityRole="button"
            onPress={onClearSelection}
            disabled={saving || selectedCount === 0}
            style={styles.courseWordSelectionAction}
          >
            <Text style={[styles.courseWordSelectionActionText, { color: c.primary }]}>
              Bỏ chọn
            </Text>
          </Pressable>
        </View>
        <View style={styles.courseWordList}>
          {words.map((word, index) => {
            const selected =
              !word.alreadySaved && selectedWordKeys.includes(word.key);
            return (
              <Pressable
                key={word.key}
                testID={`${testIdPrefix}-course-word-${index}`}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: word.alreadySaved || selected,
                  disabled: word.alreadySaved || saving,
                }}
                disabled={word.alreadySaved || saving}
                onPress={() => onToggleWord(word)}
                style={[
                  styles.courseWordRow,
                  {
                    borderColor: c.border,
                    opacity: word.alreadySaved ? 0.68 : 1,
                  },
                ]}
              >
                <Feather
                  name={
                    word.alreadySaved
                      ? "check-circle"
                      : selected
                        ? "check-square"
                        : "square"
                  }
                  size={20}
                  color={word.alreadySaved ? c.success : c.primary}
                />
                <View style={styles.courseWordCopy}>
                  <Text style={[styles.courseWordTerm, { color: c.foreground }]}>
                    {word.term}
                  </Text>
                  <Text
                    style={[
                      styles.courseWordMeaning,
                      { color: c.mutedForeground },
                    ]}
                  >
                    {word.meaning}
                  </Text>
                  {word.alreadySaved ? (
                    <Text style={[styles.courseWordSaved, { color: c.successText }]}>
                      Đã có trong Sổ từ
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {savedMessage ? (
          <Text
            testID={`${testIdPrefix}-words-added-message`}
            style={[styles.courseWordSavedMessage, { color: c.successText }]}
          >
            {savedMessage}
          </Text>
        ) : null}
        <Button
          testID={`${testIdPrefix}-add-selected-words`}
          onPress={onAddSelected}
          disabled={saving || selectedCount === 0}
          style={styles.courseWordAddButton}
          label={
            saving
              ? "Đang thêm từ…"
              : `Thêm ${selectedCount} từ đã chọn`
          }
        />
      </View>
      )}
      <Button
        testID={`${testIdPrefix}-return`}
        onPress={onReturn}
        style={styles.completeButton}
        label="Về danh sách bài"
      />
      <Pressable
        testID={`${testIdPrefix}-retry`}
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.retryLesson}
      >
        <Text style={[styles.retryLessonText, { color: c.primary }]}>
          Học lại bài này
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  pageHeader: {
    position: "relative",
    minHeight: 102,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  pageHeaderCopy: { flex: 1, gap: 3 },
  pageKicker: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.2 },
  pageTitle: { fontFamily: F.b, fontSize: 24, letterSpacing: -0.4 },
  headerButton: { padding: 6, marginBottom: 4 },
  courseIntro: { gap: 14 },
  catalogCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: 145,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
  },
  catalogIcon: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  courseHero: {
    position: "relative",
    overflow: "hidden",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  courseDataNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  courseDataNoticeCopy: { flex: 1, gap: 8 },
  courseDataSettingsButton: { alignSelf: "flex-start", marginTop: 2 },
  heroDescription: { fontFamily: F.r, fontSize: 14, lineHeight: 21 },
  courseStats: { flexDirection: "row", alignItems: "center", gap: 7 },
  courseStatsText: { fontFamily: F.s, fontSize: 12 },
  lessonHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 3,
  },
  sectionTitle: { fontFamily: F.b, fontSize: 20 },
  sectionHint: { fontFamily: F.r, fontSize: 12 },
  chapterGroupHeading: {
    marginTop: 16,
    marginBottom: 4,
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chapterNumberBadge: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
    minHeight: 38,
    borderRadius: 11,
    paddingHorizontal: 7,
  },
  chapterNumberText: {
    fontFamily: F.b,
    fontSize: 9,
    letterSpacing: 0.35,
  },
  chapterGroupCopy: { flex: 1, minWidth: 0, gap: 3 },
  chapterGroupTitle: { fontFamily: F.b, fontSize: 15, lineHeight: 19 },
  chapterGroupHint: { fontFamily: F.r, fontSize: 11 },
  chapterProgress: { fontFamily: F.s, fontSize: 12 },
  topicGroupHeading: {
    marginTop: 9,
    marginBottom: 1,
    gap: 3,
  },
  topicGroupTitle: { fontFamily: F.b, fontSize: 17, lineHeight: 22 },
  topicGroupHint: { fontFamily: F.r, fontSize: 11 },
  loading: { alignItems: "center", gap: 9, padding: 22 },
  loadingText: { fontFamily: F.r, fontSize: 13 },
  lessonCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  lessonMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lessonNumber: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNumberText: { fontFamily: F.b, fontSize: 17 },
  lessonCopy: { flex: 1, gap: 4 },
  lessonResumeAction: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 58,
    paddingVertical: 8,
  },
  lessonResumeText: { fontFamily: F.s, fontSize: 10 },
  lessonTitle: { fontFamily: F.b, fontSize: 16, lineHeight: 21 },
  lessonFocus: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  lessonCount: { fontFamily: F.s, fontSize: 11 },
  courseProgress: { gap: 5, marginTop: 3 },
  courseProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseProgressText: { fontFamily: F.s, fontSize: 10 },
  courseProgressPercent: { fontFamily: F.b, fontSize: 10 },
  courseProgressTrack: { height: 6, borderRadius: 6, overflow: "hidden" },
  courseProgressFill: { height: "100%", borderRadius: 6 },
  quiz: { gap: 16 },
  quizProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quizStep: { fontFamily: F.s, fontSize: 11, letterSpacing: 1 },
  quizScore: { fontFamily: F.b, fontSize: 13 },
  progressTrack: { height: 8, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6 },
  questionTitle: { fontFamily: F.b, fontSize: 20, lineHeight: 27 },
  promptCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    minHeight: 102,
    justifyContent: "center",
  },
  promptText: { fontFamily: F.s, fontSize: 17, lineHeight: 25 },
  idiomDialogue: { width: "100%", gap: 12 },
  idiomDialogueMessage: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },
  idiomDialogueAvatar: {
    width: 44,
    height: 44,
    borderRadius: 9,
    borderWidth: 2,
  },
  idiomReplyRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 9,
  },
  idiomDialogueBubble: {
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  idiomCorviBubble: { flex: 1, borderBottomLeftRadius: 5 },
  idiomReplyBubble: {
    maxWidth: "82%",
    flexShrink: 1,
    borderBottomRightRadius: 5,
    gap: 3,
  },
  idiomDialogueSpeaker: { fontFamily: F.b, fontSize: 12 },
  idiomDialogueText: { fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  choices: { gap: 10 },
  choice: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  choiceText: { flex: 1, fontFamily: F.b, fontSize: 15 },
  feedback: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    gap: 7,
  },
  feedbackTitle: { fontFamily: F.b, fontSize: 17 },
  feedbackMeaning: { fontFamily: F.s, fontSize: 13, lineHeight: 19 },
  feedbackExample: { fontFamily: F.b, fontSize: 13, lineHeight: 19 },
  feedbackTranslation: { fontFamily: F.r, fontSize: 12, lineHeight: 18 },
  correctPopupBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  correctPopupCard: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    overflow: "hidden",
  },
  correctPopupHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  correctPopupScroll: { flexShrink: 1 },
  correctPopupLabel: { fontFamily: F.r, fontSize: 13 },
  correctPopupAnswer: { fontFamily: F.b, fontSize: 29, lineHeight: 36 },
  correctPopupDetails: { gap: 9, paddingBottom: 2 },
  nextButton: { minHeight: 54 },
  completeCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    gap: 12,
  },
  completeIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  completeTitle: { fontFamily: F.b, fontSize: 23, textAlign: "center" },
  completeLesson: { fontFamily: F.s, fontSize: 15, textAlign: "center" },
  completeScore: { fontFamily: F.r, fontSize: 13 },
  completeButton: { width: "100%", marginTop: 6 },
  retryLesson: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  retryLessonText: { fontFamily: F.b, fontSize: 13 },
  courseWordSelection: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    gap: 10,
    alignItems: "stretch",
  },
  courseWordSelectionTitle: {
    fontFamily: F.b,
    fontSize: 16,
    textAlign: "left",
  },
  courseWordSelectionHint: {
    fontFamily: F.r,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "left",
  },
  courseWordSelectionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  courseWordSelectionAction: { minHeight: 36, justifyContent: "center", paddingHorizontal: 4 },
  courseWordSelectionActionText: { fontFamily: F.b, fontSize: 13 },
  courseWordList: { gap: 5 },
  courseWordRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  courseWordCopy: { flex: 1, gap: 2 },
  courseWordTerm: { fontFamily: F.b, fontSize: 14 },
  courseWordMeaning: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  courseWordSaved: { fontFamily: F.s, fontSize: 11 },
  courseWordSavedMessage: { fontFamily: F.s, fontSize: 12 },
  courseWordAddButton: { minHeight: 48 },
  bulkAddSection: { gap: 7 },
  bulkAddHint: { fontFamily: F.r, fontSize: 12, lineHeight: 18 },
  bulkAddBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  bulkAddDialog: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    borderWidth: 1,
    padding: 18,
    gap: 14,
    overflow: "hidden",
  },
  relatedLessonDialog: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    borderWidth: 1,
    padding: 18,
    gap: 12,
    overflow: "hidden",
  },
  relatedLessonList: { flexShrink: 1 },
  relatedLessonOption: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  relatedLessonCopy: { flex: 1, gap: 3 },
  relatedLessonCourse: { fontFamily: F.s, fontSize: 11 },
  relatedLessonTitle: { fontFamily: F.b, fontSize: 15 },
  relatedLessonFocus: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  relatedLessonCancel: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  relatedLessonCancelText: { fontFamily: F.s, fontSize: 13 },
  bulkAddDialogHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  bulkAddInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkAddDialogTitleCopy: { flex: 1, gap: 3 },
  bulkAddDialogTitle: { fontFamily: F.b, fontSize: 18 },
  bulkAddDialogSubtitle: { fontFamily: F.r, fontSize: 13 },
  bulkAddDialogScroll: { flexShrink: 1 },
  bulkAddDialogContent: { gap: 12, paddingBottom: 2 },
  bulkAddSummary: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    gap: 9,
  },
  bulkAddSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  bulkAddSummaryLabel: { flex: 1, fontFamily: F.r, fontSize: 13 },
  bulkAddSummaryValue: { fontFamily: F.b, fontSize: 15 },
  bulkAddError: { borderWidth: 1, borderRadius: 12, padding: 11 },
  bulkAddProgress: { gap: 8, paddingVertical: 2 },
  bulkAddProgressCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  bulkAddProgressText: { flex: 1, fontFamily: F.s, fontSize: 13 },
  bulkAddProgressTrack: { height: 7, borderRadius: 5, overflow: "hidden" },
  bulkAddProgressFill: { height: "100%", borderRadius: 5 },
  bulkAddActions: { flexDirection: "row", gap: 9, marginTop: 1 },
  bulkAddActionButton: { flex: 1, minHeight: 48 },
  errorBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  errorText: { fontFamily: F.s, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 5 },
  retryText: { fontFamily: F.b, fontSize: 13 },
});
