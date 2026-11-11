import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import { getCourseLessonCompletions, markCourseLessonCompleted } from "@/data/vocabulary";
import { useColors } from "@/hooks/useColors";

type CourseQuestion = {
  term: string;
  prompt: string;
  choices: readonly string[];
};

type CourseLesson = {
  id: string;
  title: string;
  focus: string;
  questions: readonly CourseQuestion[];
};

type CourseAnswer = {
  definition: string;
  example: string;
  exampleTranslation: string;
};

type CourseCatalogItem = {
  id: string;
  title: string;
  description: string;
  lessons: readonly CourseLesson[];
  entriesByTerm: ReadonlyMap<string, CourseAnswer>;
  icon: React.ComponentProps<typeof Feather>["name"];
  testIdPrefix: string;
};

const COURSE_CATALOG: readonly CourseCatalogItem[] = [
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
      "Luyện 9 trạng từ liên kết qua ví dụ ngắn, dễ nhận ra cách bổ sung ý, thể hiện đối lập, thời gian và kết quả.",
    lessons: LINKING_ADVERB_COURSE_LESSONS,
    entriesByTerm: new Map(Object.entries(LINKING_ADVERB_COURSE_ENTRIES)),
    icon: "align-left",
    testIdPrefix: "linking-adverb",
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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finishedLessonId, setFinishedLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCourse =
    COURSE_CATALOG.find((course) => course.id === activeCourseId) ?? null;

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
    setSelectedAnswer(null);
    setCorrectCount(0);
    setFinishedLessonId(null);
    setError(null);
  };

  const leaveLesson = () => {
    setActiveLesson(null);
    setFinishedLessonId(null);
    setSelectedAnswer(null);
    setError(null);
  };

  const returnToCourseList = () => {
    setActiveCourseId(null);
    setActiveLesson(null);
    setFinishedLessonId(null);
    setSelectedAnswer(null);
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
              onReturn={leaveLesson}
              onRetry={() => startLesson(activeLesson)}
            />
          ) : (
            <QuestionView
              testIdPrefix={activeCourse?.testIdPrefix ?? "course"}
              lesson={activeLesson}
              question={currentQuestion}
              entriesByTerm={activeCourse?.entriesByTerm ?? new Map()}
              questionIndex={questionIndex}
              selectedAnswer={selectedAnswer}
              correctCount={correctCount}
              saving={saving}
              onSelect={(answer) => {
                if (selectedAnswer !== null) return;
                setSelectedAnswer(answer);
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
                  câu · học ngoại tuyến
                </Text>
              </View>
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
                return (
                  <Pressable
                    key={lesson.id}
                    testID={`${activeCourse.testIdPrefix}-lesson-${index + 1}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${lesson.title}, ${lesson.questions.length} câu${completed ? ", đã hoàn thành" : ""}`}
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
                    <MaterialSheen tone={completed ? "surface" : "navy"} radius={18} />
                    <View
                      style={[
                        styles.lessonNumber,
                        {
                          backgroundColor: completed ? c.success : c.secondary,
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
                        {lesson.questions.length} câu ·{" "}
                        {completed ? "Đã hoàn thành" : "Chưa học"}
                      </Text>
                    </View>
                    <Feather
                      name={completed ? "check-circle" : "chevron-right"}
                      size={22}
                      color={completed ? c.success : c.primary}
                    />
                  </Pressable>
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
    </View>
  );
}

function QuestionView({
  testIdPrefix,
  lesson,
  question,
  entriesByTerm,
  questionIndex,
  selectedAnswer,
  correctCount,
  saving,
  onSelect,
  onAdvance,
}: {
  testIdPrefix: string;
  lesson: CourseLesson;
  question: CourseQuestion;
  entriesByTerm: ReadonlyMap<string, CourseAnswer>;
  questionIndex: number;
  selectedAnswer: string | null;
  correctCount: number;
  saving: boolean;
  onSelect: (answer: string) => void;
  onAdvance: () => void;
}) {
  const c = useColors();
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
      <View style={styles.choices}>
        {question.choices.map((choice) => {
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
      {selectedAnswer !== null && answer ? (
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
          <Text style={[styles.feedbackMeaning, { color: c.foreground }]}>
            {answer.definition}
          </Text>
          <Text style={[styles.feedbackExample, { color: c.foreground }]}>
            {answer.example}
          </Text>
          <Text style={[styles.feedbackTranslation, { color: c.mutedForeground }]}>
            {answer.exampleTranslation}
          </Text>
        </View>
      ) : null}
      {selectedAnswer !== null ? (
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
  onReturn,
  onRetry,
}: {
  testIdPrefix: string;
  lesson: CourseLesson;
  correctCount: number;
  onReturn: () => void;
  onRetry: () => void;
}) {
  const c = useColors();
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
  errorBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  errorText: { fontFamily: F.s, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 5 },
  retryText: { fontFamily: F.b, fontSize: 13 },
});
