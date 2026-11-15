import React, { useCallback, useMemo, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useBottomPad } from "@/components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, F, MaterialSheen } from "@/components/ui";
import {
  CONJUNCTION_COURSE_ENTRY_BY_TERM,
  CONJUNCTION_COURSE_ID,
  CONJUNCTION_COURSE_LESSONS,
  CONJUNCTION_COURSE_TITLE,
} from "@/domain/conjunction-course";
import {
  LINKING_ADVERB_COURSE_ENTRIES,
  LINKING_ADVERB_COURSE_ID,
  LINKING_ADVERB_COURSE_LESSONS,
  LINKING_ADVERB_COURSE_TITLE,
} from "@/domain/linking-adverb-course";
import {
  IELTS_TOPIC_COURSE_ENTRIES,
  IELTS_TOPIC_COURSE_ID,
  IELTS_TOPIC_COURSE_LESSONS,
  IELTS_TOPIC_COURSE_SPELLING_CONVENTION,
  IELTS_TOPIC_COURSE_TITLE,
  IELTS_TOPIC_COURSE_WORD_COUNT,
  IELTS_TOPIC_WORD_LIST,
} from "@/domain/ielts-topic-course";
import {
  TOEIC_TOPIC_COURSE_ENTRIES,
  TOEIC_TOPIC_COURSE_ID,
  TOEIC_TOPIC_COURSE_LESSONS,
  TOEIC_TOPIC_COURSE_SPELLING_CONVENTION,
  TOEIC_TOPIC_COURSE_TITLE,
  TOEIC_TOPIC_COURSE_WORD_COUNT,
  TOEIC_TOPIC_WORD_LIST,
} from "@/domain/toeic-topic-course";
import {
  OFFICE_APPS_COURSE_ENTRIES,
  OFFICE_APPS_COURSE_ID,
  OFFICE_APPS_COURSE_LESSONS,
  OFFICE_APPS_COURSE_TITLE,
  OFFICE_APPS_COURSE_TOPIC_COUNT,
  OFFICE_APPS_COURSE_WORD_COUNT,
} from "@/domain/office-apps-course";
import {
  IDIOM_COURSE_ENTRIES,
  IDIOM_COURSE_ID,
  IDIOM_COURSE_LESSONS,
  IDIOM_COURSE_TITLE,
  IDIOM_COURSE_WORD_COUNT,
} from "@/domain/idiom-course";
import {
  PHRASAL_VERB_COURSE_ENTRIES,
  PHRASAL_VERB_COURSE_ID,
  PHRASAL_VERB_COURSE_LESSONS,
  PHRASAL_VERB_COURSE_TOPIC_COUNT,
  PHRASAL_VERB_COURSE_TITLE,
  PHRASAL_VERB_COURSE_WORD_COUNT,
} from "@/domain/phrasal-verb-course";
import {
  getCourseLessonCompletions,
  markCourseLessonCompleted,
  recordStoneInvestmentStudyDay,
} from "@/data/vocabulary";
import { useVocabulary } from "@/contexts/VocabularyContext";
import {
  buildCourseWordCandidates,
  type CourseWordCandidate,
} from "@/domain/course-word-selection";
import { useColors } from "@/hooks/useColors";

type CourseQuestion = {
  term: string;
  dialoguePrompt?: string;
  prompt: string;
  choices: readonly string[];
};

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

type CourseLesson = {
  id: string;
  title: string;
  focus: string;
  topicId?: string;
  topicTitle?: string;
  questions: readonly CourseQuestion[];
};

type CourseAnswer = {
  definition: string;
  example: string;
  exampleTranslation?: string;
  spellingNote?: string;
  partOfSpeech?: string;
};

type CourseCatalogItem = {
  id: string;
  title: string;
  description: string;
  lessons: readonly CourseLesson[];
  entriesByTerm: ReadonlyMap<string, CourseAnswer>;
  icon: React.ComponentProps<typeof Feather>["name"];
  testIdPrefix: string;
  wordCount?: number;
  topicCount?: number;
};

const COURSE_CATALOG: readonly CourseCatalogItem[] = [
  {
    id: IDIOM_COURSE_ID,
    title: IDIOM_COURSE_TITLE,
    description:
      `Học ${IDIOM_COURSE_WORD_COUNT.toLocaleString("vi-VN")} thành ngữ có nghĩa tiếng Việt từ từ điển offline, qua câu ví dụ và bài chọn cụm phù hợp.`,
    lessons: IDIOM_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(IDIOM_COURSE_ENTRIES)),
    icon: "book-open",
    testIdPrefix: "idioms",
    wordCount: IDIOM_COURSE_WORD_COUNT,
  },
  {
    id: PHRASAL_VERB_COURSE_ID,
    title: PHRASAL_VERB_COURSE_TITLE,
    description:
      `Học ${PHRASAL_VERB_COURSE_WORD_COUNT.toLocaleString("vi-VN")} cụm động từ đã lọc từ từ điển offline, có nghĩa và câu ví dụ; sắp xếp theo ${PHRASAL_VERB_COURSE_TOPIC_COUNT} nhóm chủ đề và động từ gốc.`,
    lessons: PHRASAL_VERB_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(PHRASAL_VERB_COURSE_ENTRIES)),
    icon: "message-circle",
    testIdPrefix: "phrasal-verbs",
    wordCount: PHRASAL_VERB_COURSE_WORD_COUNT,
    topicCount: PHRASAL_VERB_COURSE_TOPIC_COUNT,
  },
  {
    id: CONJUNCTION_COURSE_ID,
    title: CONJUNCTION_COURSE_TITLE,
    description:
      "Học 18 cụm liên từ phụ thuộc qua câu ví dụ có ngữ cảnh rõ ràng. Mỗi bài giúp bạn phân biệt thời gian, điều kiện và mục đích.",
    lessons: CONJUNCTION_COURSE_LESSONS,
    entriesByTerm: CONJUNCTION_COURSE_ENTRY_BY_TERM,
    icon: "git-merge",
    testIdPrefix: "conjunction",
  },
  {
    id: LINKING_ADVERB_COURSE_ID,
    title: LINKING_ADVERB_COURSE_TITLE,
    description:
      "Luyện 17 trạng từ liên kết qua ví dụ ngắn, dễ nhận ra cách bổ sung ý, thể hiện đối lập, thời gian và kết quả.",
    lessons: LINKING_ADVERB_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(LINKING_ADVERB_COURSE_ENTRIES)),
    icon: "align-left",
    testIdPrefix: "linking-adverb",
  },
  {
    id: IELTS_TOPIC_COURSE_ID,
    title: IELTS_TOPIC_COURSE_TITLE,
    description:
      `Học ${IELTS_TOPIC_COURSE_WORD_COUNT.toLocaleString("vi-VN")} từ qua ${IELTS_TOPIC_WORD_LIST.length} chủ đề IELTS, chia thành những bài học vừa sức. ${IELTS_TOPIC_COURSE_SPELLING_CONVENTION}`,
    lessons: IELTS_TOPIC_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(IELTS_TOPIC_COURSE_ENTRIES)),
    icon: "globe",
    testIdPrefix: "ielts",
    wordCount: IELTS_TOPIC_COURSE_WORD_COUNT,
    topicCount: IELTS_TOPIC_WORD_LIST.length,
  },
  {
    id: TOEIC_TOPIC_COURSE_ID,
    title: TOEIC_TOPIC_COURSE_TITLE,
    description:
      `Học ${TOEIC_TOPIC_COURSE_WORD_COUNT.toLocaleString("vi-VN")} từ qua ${TOEIC_TOPIC_WORD_LIST.length} chủ đề TOEIC, từ văn phòng đến công tác. ${TOEIC_TOPIC_COURSE_SPELLING_CONVENTION}`,
    lessons: TOEIC_TOPIC_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(TOEIC_TOPIC_COURSE_ENTRIES)),
    icon: "briefcase",
    testIdPrefix: "toeic",
    wordCount: TOEIC_TOPIC_COURSE_WORD_COUNT,
    topicCount: TOEIC_TOPIC_WORD_LIST.length,
  },
  {
    id: OFFICE_APPS_COURSE_ID,
    title: OFFICE_APPS_COURSE_TITLE,
    description:
      `Học ${OFFICE_APPS_COURSE_WORD_COUNT.toLocaleString("vi-VN")} từ và cụm từ thường gặp trong Excel, Word và PowerPoint, chia theo 3 ứng dụng.`,
    lessons: OFFICE_APPS_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(OFFICE_APPS_COURSE_ENTRIES)),
    icon: "monitor",
    testIdPrefix: "office-apps",
    wordCount: OFFICE_APPS_COURSE_WORD_COUNT,
    topicCount: OFFICE_APPS_COURSE_TOPIC_COUNT,
  },
];

export default function CoursesScreen() {
  const c = useColors();
  const bottom = useBottomPad();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 67 : insets.top;
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [lessonChoices, setLessonChoices] = useState<readonly string[][]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finishedLessonId, setFinishedLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseWordKeys, setSelectedCourseWordKeys] = useState<
    string[]
  >([]);
  const [courseWordsSavedMessage, setCourseWordsSavedMessage] = useState<
    string | null
  >(null);
  const [bulkAddConfirmationOpen, setBulkAddConfirmationOpen] = useState(false);
  const [bulkAddAcknowledged, setBulkAddAcknowledged] = useState(false);
  const [bulkAddProgress, setBulkAddProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [bulkCourseWordsSavedMessage, setBulkCourseWordsSavedMessage] =
    useState<string | null>(null);
  const { words: savedWords, saveWords } = useVocabulary();

  const activeCourse =
    COURSE_CATALOG.find((course) => course.id === activeCourseId) ?? null;
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
      const progress = await Promise.all(
        COURSE_CATALOG.map((course) =>
          getCourseLessonCompletions(course.id),
        ),
      );
      setCompletedLessons(progress.flat());
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const startLesson = (lesson: CourseLesson) => {
    setActiveLesson(lesson);
    setQuestionIndex(0);
    setLessonChoices(shuffleLessonChoices(lesson.questions));
    setSelectedAnswer(null);
    setCorrectCount(0);
    setFinishedLessonId(null);
    setSelectedCourseWordKeys([]);
    setCourseWordsSavedMessage(null);
    setError(null);
  };

  const leaveLesson = () => {
    setActiveLesson(null);
    setFinishedLessonId(null);
    setLessonChoices([]);
    setSelectedAnswer(null);
    setSelectedCourseWordKeys([]);
    setCourseWordsSavedMessage(null);
    setError(null);
  };

  const returnToCourseList = () => {
    setActiveCourseId(null);
    setActiveLesson(null);
    setFinishedLessonId(null);
    setLessonChoices([]);
    setSelectedAnswer(null);
    setBulkAddConfirmationOpen(false);
    setBulkAddAcknowledged(false);
    setBulkAddProgress(null);
    setBulkCourseWordsSavedMessage(null);
    setError(null);
  };

  const finishLesson = async () => {
    if (!activeLesson || saving) return;
    setSaving(true);
    try {
      await markCourseLessonCompleted(activeLesson.id);
      setCompletedLessons((previous) =>
        previous.includes(activeLesson.id)
          ? previous
          : [...previous, activeLesson.id],
      );
      setFinishedLessonId(activeLesson.id);
      setSelectedCourseWordKeys(
        buildCourseWordCandidates(
          activeLesson.questions.map((question) => question.term),
          activeCourse?.entriesByTerm ?? new Map(),
          savedWords,
        )
          .filter((candidate) => !candidate.alreadySaved)
          .map((candidate) => candidate.key),
      );
      setCourseWordsSavedMessage(null);
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
  };

  const advance = () => {
    if (!activeLesson || !selectedAnswer || saving) return;
    if (questionIndex === activeLesson.questions.length - 1) {
      void finishLesson();
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedAnswer(null);
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
        selected.map((candidate) => ({
          term: candidate.term,
          meaning: candidate.meaning,
          ipa: candidate.ipa,
          example: candidate.example,
          note: candidate.partOfSpeech
            ? `Từ loại: ${candidate.partOfSpeech}`
            : "",
        })),
      );
      setSelectedCourseWordKeys([]);
      setCourseWordsSavedMessage(
        `Đã thêm ${selected.length} từ vào Sổ từ. Các từ mới bắt đầu ở Cấp 1.`,
      );
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
    setBulkAddAcknowledged(false);
    setBulkAddProgress(null);
    setBulkCourseWordsSavedMessage(null);
    setError(null);
    setBulkAddConfirmationOpen(true);
  };

  const cancelBulkAdd = () => {
    if (saving) return;
    setBulkAddConfirmationOpen(false);
    setBulkAddAcknowledged(false);
  };

  const addAllCourseWords = async () => {
    if (
      !activeCourse ||
      saving ||
      !bulkAddAcknowledged ||
      addableAllCourseWords.length === 0
    ) {
      return;
    }

    const selected = addableAllCourseWords;
    setSaving(true);
    setBulkAddProgress({ completed: 0, total: selected.length });
    setError(null);
    setBulkCourseWordsSavedMessage(null);
    try {
      await saveWords(
        selected.map((candidate) => ({
          term: candidate.term,
          meaning: candidate.meaning,
          ipa: candidate.ipa,
          example: candidate.example,
          note: candidate.partOfSpeech
            ? `Từ loại: ${candidate.partOfSpeech}`
            : "",
        })),
        (completed, total) => setBulkAddProgress({ completed, total }),
      );
      setBulkCourseWordsSavedMessage(
        `Đã nạp ${selected.length.toLocaleString("vi-VN")} từ mới vào Sổ từ; bỏ qua ${alreadySavedCourseWords.toLocaleString("vi-VN")} từ đã có cùng nghĩa.`,
      );
      setBulkAddConfirmationOpen(false);
      setBulkAddAcknowledged(false);
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
          { paddingTop: top + 12, backgroundColor: c.header },
        ]}
      >
        <MaterialSheen tone="navy" radius={0} />
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

        {activeLesson && currentQuestion ? (
          isLessonFinished ? (
            <LessonComplete
              testIdPrefix={activeCourse?.testIdPrefix ?? "course"}
              lesson={activeLesson}
              correctCount={correctCount}
              words={lessonWordCandidates}
              selectedWordKeys={selectedCourseWordKeys}
              savedMessage={courseWordsSavedMessage}
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
              lesson={activeLesson}
              question={currentQuestion}
                choices={lessonChoices[questionIndex] ?? currentQuestion.choices}
              entriesByTerm={activeCourse?.entriesByTerm ?? new Map()}
              questionIndex={questionIndex}
              selectedAnswer={selectedAnswer}
              correctCount={correctCount}
              saving={saving}
              onSelect={(answer) => {
                if (selectedAnswer !== null) return;
                setSelectedAnswer(answer);
                void recordStoneInvestmentStudyDay("course").catch((failure) =>
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Không thể ghi nhận hoạt động học hôm nay.",
                  ),
                );
                if (answer === currentQuestion.term)
                  setCorrectCount((count) => count + 1);
              }}
              onAdvance={advance}
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
                    ? ` · ${activeCourse.wordCount.toLocaleString("vi-VN")} từ`
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
                    <Pressable
                      testID={`${activeCourse.testIdPrefix}-lesson-${index + 1}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${lesson.topicTitle ? `${lesson.topicTitle}, ` : ""}${lesson.title}, ${lesson.questions.length} câu${completed ? ", đã hoàn thành" : ""}`}
                      onPress={() => startLesson(lesson)}
                      style={({ pressed }) => [
                        styles.lessonCard,
                        {
                          backgroundColor: completed ? c.successSoft : c.card,
                          borderColor: completed ? c.success : c.border,
                          opacity: pressed ? 0.86 : 1,
                        },
                      ]}
                    >
                      <MaterialSheen
                        tone={completed ? "surface" : "navy"}
                        radius={18}
                      />
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
                          {completed ? "Đã hoàn thành" : "Chưa học"}
                        </Text>
                      </View>
                      <Feather
                        name={completed ? "check-circle" : "chevron-right"}
                        size={22}
                        color={completed ? c.success : c.primary}
                      />
                    </Pressable>
                  </React.Fragment>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.courseIntro}>
            <Text style={[styles.catalogDescription, { color: c.mutedForeground }]}>
              Chọn một khóa học để xem bài và tiến độ của bạn.
            </Text>
            {COURSE_CATALOG.map((course) => {
              const completedCount = completedLessons.filter((lessonId) =>
                course.lessons.some((lesson) => lesson.id === lessonId),
              ).length;
              const questionCount = course.lessons.reduce(
                (count, lesson) => count + lesson.questions.length,
                0,
              );
              return (
                <Pressable
                  key={course.id}
                  testID={`${course.testIdPrefix}-course-card`}
                  accessibilityRole="button"
                  accessibilityLabel={`${course.title}, ${course.lessons.length} bài học, ${questionCount} câu`}
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
                  <View style={[styles.catalogIcon, { backgroundColor: c.accent }]}>
                    <Feather
                      name={course.icon}
                      size={23}
                      color={c.accentForeground}
                    />
                  </View>
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
                      {course.lessons.length} bài · {questionCount} câu ·{" "}
                      {completedCount}/{course.lessons.length} hoàn thành
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={22} color={c.primary} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
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
                    styles.bulkAddWarningIcon,
                    { backgroundColor: c.destructiveSoft },
                  ]}
                >
                  <Feather
                    name="alert-triangle"
                    size={21}
                    color={c.destructive}
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
                </View>

                <View
                  style={[
                    styles.bulkAddRiskBox,
                    {
                      backgroundColor: c.destructiveSoft,
                      borderColor: c.destructive,
                    },
                  ]}
                >
                  <Text style={[styles.bulkAddRiskTitle, { color: c.destructiveText }]}>
                    Rủi ro cần đọc trước
                  </Text>
                  <Text style={[styles.bulkAddRiskText, { color: c.destructiveText }]}>
                    • Quá tải ôn tập: {addableAllCourseWords.length.toLocaleString("vi-VN")} từ mới đều bắt đầu ở Cấp 1, làm tăng đáng kể số lượt ôn.
                  </Text>
                  <Text style={[styles.bulkAddRiskText, { color: c.destructiveText }]}>
                    • Dễ sai: nghĩa và câu ví dụ trong khóa có thể chưa chính xác hoặc chưa hợp ngữ cảnh. Hãy kiểm tra lại trước khi học.
                  </Text>
                  <Text style={[styles.bulkAddRiskText, { color: c.destructiveText }]}>
                    • Khóa học không cung cấp IPA cho thao tác này nên phiên âm sẽ để trống. Không có hoàn tác cả lô; sau đó chỉ có thể xóa từng từ.
                  </Text>
                </View>

                <Pressable
                  testID={`${activeCourse.testIdPrefix}-bulk-add-acknowledgement`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: bulkAddAcknowledged, disabled: saving }}
                  accessibilityLabel="Tôi đã đọc rủi ro và muốn nạp toàn bộ từ mới vào Sổ từ"
                  onPress={() => {
                    if (!saving)
                      setBulkAddAcknowledged((acknowledged) => !acknowledged);
                  }}
                  style={styles.bulkAddAcknowledgement}
                >
                  <View
                    style={[
                      styles.bulkAddCheckbox,
                      {
                        backgroundColor: bulkAddAcknowledged
                          ? c.primary
                          : "transparent",
                        borderColor: bulkAddAcknowledged ? c.primary : c.border,
                      },
                    ]}
                  >
                    {bulkAddAcknowledged ? (
                      <Feather name="check" size={15} color={c.accentForeground} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.bulkAddAcknowledgementText,
                      { color: c.foreground },
                    ]}
                  >
                    Tôi đã đọc các rủi ro và muốn tiếp tục.
                  </Text>
                </Pressable>

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
                      Đang nạp từ vào Sổ:{" "}
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
                      : `Tôi hiểu, nạp ${addableAllCourseWords.length.toLocaleString("vi-VN")} từ`
                  }
                  onPress={() => void addAllCourseWords()}
                  disabled={
                    saving ||
                    !bulkAddAcknowledged ||
                    addableAllCourseWords.length === 0
                  }
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
  lesson,
  question,
  choices,
  entriesByTerm,
  questionIndex,
  selectedAnswer,
  correctCount,
  saving,
  onSelect,
  onAdvance,
}: {
  testIdPrefix: string;
  isIdiomCourse: boolean;
  lesson: CourseLesson;
  question: CourseQuestion;
  choices: readonly string[];
  entriesByTerm: ReadonlyMap<string, CourseAnswer>;
  questionIndex: number;
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
  const progress = ((questionIndex + 1) / lesson.questions.length) * 100;

  return (
    <View style={styles.quiz}>
      <View style={styles.quizProgressRow}>
        <Text style={[styles.quizStep, { color: c.mutedForeground }]}>
          CÂU {questionIndex + 1} / {lesson.questions.length}
        </Text>
        <Text style={[styles.quizScore, { color: c.primary }]}>
          {correctCount} đúng
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
      <Text style={[styles.questionTitle, { color: c.foreground }]}>
        Chọn từ hoặc cụm phù hợp nhất để hoàn thành câu
      </Text>
      {isIdiomCourse ? (
        <View testID="idioms-dialogue" style={styles.idiomDialogue}>
          <View style={styles.idiomDialogueMessage}>
            <Image
              testID="idioms-dialogue-corvi-avatar"
              source={require("../../assets/images/corvi-app-icon.png")}
              accessibilityLabel="Corvi"
              resizeMode="cover"
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
              source={require("../../assets/images/pan-avatar.png")}
              accessibilityLabel="Cừu Pan"
              resizeMode="cover"
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
                  <Text style={[styles.feedbackMeaning, { color: c.foreground }]}>
                    {answer.definition}
                  </Text>
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
                {answer?.exampleTranslation ? (
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
                label={saving
                  ? "Đang lưu…"
                  : questionIndex === lesson.questions.length - 1
                    ? "Hoàn thành bài"
                    : "Câu tiếp theo"}
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
          <Text style={[styles.feedbackMeaning, { color: c.foreground }]}>
            {answer.definition}
          </Text>
          <Text style={[styles.feedbackExample, { color: c.foreground }]}>
            {answer.example}
          </Text>
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
          {answer.exampleTranslation ? (
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
          label={saving
            ? "Đang lưu…"
            : questionIndex === lesson.questions.length - 1
              ? "Hoàn thành bài"
              : "Câu tiếp theo"}
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
          Bài học không tự thêm từ. Từ đã có trong Sổ sẽ được đánh dấu.
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
  catalogDescription: {
    fontFamily: F.r,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 2,
  },
  catalogCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: 126,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
  },
  catalogIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
  topicGroupHeading: {
    marginTop: 8,
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
  lessonNumber: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNumberText: { fontFamily: F.b, fontSize: 17 },
  lessonCopy: { flex: 1, gap: 4 },
  lessonTitle: { fontFamily: F.b, fontSize: 15, lineHeight: 20 },
  lessonFocus: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  lessonCount: { fontFamily: F.s, fontSize: 11 },
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  bulkAddDialogHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  bulkAddWarningIcon: {
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
  bulkAddRiskBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    gap: 8,
  },
  bulkAddRiskTitle: { fontFamily: F.b, fontSize: 14 },
  bulkAddRiskText: { fontFamily: F.r, fontSize: 13, lineHeight: 19 },
  bulkAddAcknowledgement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  bulkAddCheckbox: {
    width: 23,
    height: 23,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkAddAcknowledgementText: {
    flex: 1,
    fontFamily: F.s,
    fontSize: 13,
    lineHeight: 19,
  },
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
