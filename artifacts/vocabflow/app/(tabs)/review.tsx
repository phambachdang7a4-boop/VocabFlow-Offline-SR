import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  createReviewExercise,
  createIdiomReviewExercise,
  isIdiomVocabularyWord,
  isEligibleForReviewMistakeMatch,
  type ReviewExercise,
} from "@/domain/review-exercises";
import type { VocabularyWord } from "@/data/types";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { useColors } from "@/hooks/useColors";
import { useReviewClock } from "@/hooks/useReviewClock";
import { localDay } from "@/domain/srs";
import {
  formatReviewCountdown,
  reviewOverview,
  secondsUntilReview,
} from "@/domain/review-overview";
import {
  Button,
  ErrorBanner,
  F,
  MaterialSheen,
  Skeleton,
} from "@/components/ui";
import { useBottomPad } from "@/components/ScreenHeader";
import { ReviewCard, calendarLabel } from "@/components/ReviewCard";
import {
  LevelDistributionChart,
  ReviewStatusBar,
  SavedTotal,
} from "@/components/ReviewOverview";
import { useSpeechPreferences } from "@/contexts/SpeechPreferencesContext";
import { useReviewPreferences } from "@/contexts/ReviewPreferencesContext";
import {
  createReviewSessionSummary,
  advanceReviewCombo,
  activeReviewDuration,
  formatReviewDuration,
  getReviewGrade,
  isReviewComboMilestone,
  pauseActiveReviewClock,
  resumeActiveReviewClock,
  startActiveReviewClock,
  type ActiveReviewClock,
  type ReviewSessionSummary,
} from "@/domain/review-session";
import { useSoundEffects } from "@/contexts/SoundEffectsContext";
import { TabBackgroundMusic } from "@/components/TabBackgroundMusic";
import { soundCueFor } from "@/domain/sound-cues";
import {
  recordReviewSessionResult,
  recordReviewSessionStart,
  recordReviewComboReward,
  getReviewSessionSummaryMetrics,
} from "@/data/vocabulary";
import { ReviewMistakeMatchGame } from "@/components/ReviewMistakeMatchGame";
import * as Crypto from "expo-crypto";
import {
  formatReviewCountdown as formatTimeboundReviewCountdown,
  limitReviewQueue,
  remainingTimeboundReviewMs,
  REVIEW_MODE_OPTIONS,
  timeboundReviewDurationMs,
  type ReviewMode,
  type ReviewTimeboundMinutes,
} from "@/domain/review-modes";

type Session = {
  token: number;
  sessionId: string;
  mode: "standard" | "idiom";
  reviewMode: ReviewMode;
  timeboundDurationMinutes: ReviewTimeboundMinutes | null;
  queue: number[];
  processed: number[];
  answered: number[];
  correct: number[];
  currentCombo: number;
  maxCombo: number;
  comboRewardCount: number;
  mistakes: VocabularyWord[];
  startedAt: number;
  index: number;
  formatOffset: number;
  word: VocabularyWord;
  exercise: ReviewExercise;
};

type SessionActiveClock = {
  sessionId: string;
  clock: ActiveReviewClock;
};

type ReviewSummaryDetails = ReviewSessionSummary & {
  stoneEarned: number;
  longestCombo: number;
  personalComboRecord: number;
};

type ComboNotice = {
  kind: "milestone" | "reward";
  count: number;
  sequence: number;
};

export default function ReviewScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const speech = useSpeechPreferences();
  const reviewPreferences = useReviewPreferences();
  const sound = useSoundEffects();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottom = useBottomPad();
  const now = useReviewClock();
  const day = localDay(new Date(now));
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<ReviewSummaryDetails | null>(null);
  const [pendingSummary, setPendingSummary] =
    useState<ReviewSummaryDetails | null>(null);
  const [gameWords, setGameWords] = useState<VocabularyWord[] | null>(null);
  const [sessionFinalizing, setSessionFinalizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);
  const [comboNotice, setComboNotice] = useState<ComboNotice | null>(null);
  const [reviewTabFocused, setReviewTabFocused] = useState(false);
  const [selectedReviewMode, setSelectedReviewMode] =
    useState<ReviewMode>("basic");
  const [reviewModeDropdownOpen, setReviewModeDropdownOpen] = useState(false);
  const busyRef = useRef(false);
  const startingRef = useRef(false);
  const finalizingRef = useRef(false);
  const sequence = useRef(0);
  const comboNoticeSequence = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const activeClockRef = useRef<SessionActiveClock | null>(null);
  sessionRef.current = session;
  const overview = useMemo(() => reviewOverview(words, day), [words, day]);
  const standardDueWords = useMemo(
    () => overview.dueWords.filter((word) => !isIdiomVocabularyWord(word)),
    [overview.dueWords],
  );
  const dueIdioms = useMemo(
    () => overview.dueWords.filter(isIdiomVocabularyWord),
    [overview.dueWords],
  );
  const inSession = !!session || !!gameWords || sessionFinalizing;
  const timeboundRemainingMs =
    session?.reviewMode === "timebound" &&
    activeClockRef.current?.sessionId === session.sessionId
      ? remainingTimeboundReviewMs(
          activeReviewDuration(activeClockRef.current.clock, now),
          timeboundReviewDurationMs(
            session.timeboundDurationMinutes ??
              reviewPreferences.timeboundMinutes,
          ),
        )
      : null;

  useFocusEffect(
    useCallback(() => {
      setReviewTabFocused(true);
      return () => setReviewTabFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!inSession) return;
    navigation.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [navigation, inSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const activeSession = activeClockRef.current;
      if (!activeSession) return;
      const now = Date.now();
      activeClockRef.current = {
        ...activeSession,
        clock:
          state === "active"
            ? resumeActiveReviewClock(activeSession.clock, now)
            : pauseActiveReviewClock(activeSession.clock, now),
      };
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (isReviewComboMilestone(session.currentCombo)) {
      setComboNotice({
        kind: "milestone",
        count: session.currentCombo,
        sequence: ++comboNoticeSequence.current,
      });
    }
  }, [session?.sessionId, session?.currentCombo]);

  useEffect(() => {
    if (!comboNotice) return;
    const timeout = setTimeout(() => setComboNotice(null), 2_000);
    return () => clearTimeout(timeout);
  }, [comboNotice]);

  useFocusEffect(
    useCallback(() => {
      setSession(null);
      setGameWords(null);
      setPendingSummary(null);
      busyRef.current = false;
      setBusy(false);
      void reload();
      return () => {
        void speech.stopSpeaking();
        activeClockRef.current = null;
        setSession(null);
        busyRef.current = false;
        setBusy(false);
      };
    }, [reload, speech.stopSpeaking]),
  );

  useEffect(() => {
    if (
      session &&
      session.exercise.kind !== "multiple-choice" &&
      speech.ready &&
      speech.autoRead
    ) {
      void speech.speakWord(session.word.term, session.word.dictionaryEntryId);
    }
    return () => {
      void speech.stopSpeaking();
    };
  }, [
    session?.token,
    session?.index,
    session?.word.id,
    session?.exercise.kind,
    speech.ready,
    speech.autoRead,
    speech.speakWord,
    speech.stopSpeaking,
  ]);

  const start = async (
    mode: Session["mode"] = "standard",
    reviewMode: ReviewMode = selectedReviewMode,
  ) => {
    const availableWords = mode === "idiom" ? dueIdioms : standardDueWords;
    const queueWords = limitReviewQueue(
      availableWords,
      reviewPreferences.wordLimit,
    );
    const first = queueWords[0];
    if (
      !first ||
      error ||
      loading ||
      !reviewPreferences.ready ||
      reviewPreferences.error ||
      startingRef.current
    )
      return;
    startingRef.current = true;
    sound.unlockFromGesture();
    setStarting(true);
    setStartError(null);
    setComboNotice(null);
    try {
      await recordReviewSessionStart();
      sound.play(soundCueFor("reviewStarted"));
      setSummary(null);
      setPendingSummary(null);
      setGameWords(null);
      setSessionSaveError(null);
      const startedAt = Date.now();
      const sessionId = Crypto.randomUUID();
      activeClockRef.current = {
        sessionId,
        clock: startActiveReviewClock(startedAt),
      };
      setSession({
        token: ++sequence.current,
        sessionId,
        mode,
        reviewMode,
        timeboundDurationMinutes:
          reviewMode === "timebound"
            ? reviewPreferences.timeboundMinutes
            : null,
        queue: queueWords.map((w) => w.id),
        processed: [],
        answered: [],
        correct: [],
        currentCombo: 0,
        maxCombo: 0,
        comboRewardCount: 0,
        mistakes: [],
        startedAt,
        index: 0,
        formatOffset: first.reviewCount,
        word: first,
        exercise:
          mode === "idiom"
            ? createIdiomReviewExercise(first)
            : createReviewExercise(first, 0, first.reviewCount, words),
      });
    } catch {
      setStartError(
        "Không thể ghi nhận lượt ôn. Hãy thử lại; dữ liệu học vẫn được giữ.",
      );
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };
  const finishSession = (
    current: Session,
    completed: boolean,
    skipMistakeReview = false,
  ) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    if (completed) sound.play(soundCueFor("reviewCompleted"));
    const endedAt = Date.now();
    const activeSessionClock = activeClockRef.current;
    const activeDurationMs =
      activeSessionClock?.sessionId === current.sessionId
        ? activeReviewDuration(activeSessionClock.clock, endedAt)
        : 0;
    const baseResult = createReviewSessionSummary(
      current,
      endedAt,
      completed,
      activeDurationMs,
    );
    activeClockRef.current = null;
    sessionRef.current = null;
    setSession(null);
    setSummary(null);
    setPendingSummary(null);
    setGameWords(null);
    setSessionFinalizing(true);
    setSessionSaveError(null);
    const finalize = async () => {
      let stoneEarned = 0;
      let personalComboRecord = current.maxCombo;
      if (current.currentCombo > 0) {
        await saveComboReward(
          current.sessionId,
          current.startedAt,
          current.comboRewardCount + 1,
          current.currentCombo,
        );
      }
      try {
        await recordReviewSessionResult({
          sessionId: current.sessionId,
          startedAt: current.startedAt,
          activeDurationMs,
          maxCombo: current.maxCombo,
          reviewedCount: baseResult.reviewedCount,
          correctCount: baseResult.correctCount,
          grade: getReviewGrade(
            baseResult.correctCount,
            baseResult.reviewedCount,
            baseResult.completed,
          ),
          completed: baseResult.completed,
        });
      } catch {
        setSessionSaveError(
          "Chưa lưu được kết quả phiên ôn vào Nhiệm Vụ. Hãy đồng bộ lại khi có thể.",
        );
      }
      try {
        const metrics = await getReviewSessionSummaryMetrics(current.sessionId);
        stoneEarned = metrics.stoneEarned;
        personalComboRecord = Math.max(
          personalComboRecord,
          metrics.personalComboRecord,
        );
      } catch {
        setSessionSaveError(
          "Chưa đọc được Stone và kỷ lục Combo của phiên này.",
        );
      }
      const result: ReviewSummaryDetails = {
        ...baseResult,
        stoneEarned,
        longestCombo: current.maxCombo,
        personalComboRecord,
      };
      if (current.mistakes.length && !skipMistakeReview) {
        setPendingSummary(result);
        setGameWords(current.mistakes);
      } else {
        setSummary(result);
      }
    };
    void finalize().finally(() => {
      finalizingRef.current = false;
      setSessionFinalizing(false);
    });
  };
  const saveComboReward = (
    sessionId: string,
    startedAt: number,
    comboIndex: number,
    comboLength: number,
  ): Promise<boolean> => {
    return recordReviewComboReward({
      sessionId,
      startedAt,
      comboIndex,
      comboLength,
    })
      .then((inserted) => {
        if (inserted) {
          setComboNotice({
            kind: "reward",
            count: comboLength,
            sequence: ++comboNoticeSequence.current,
          });
        }
        return inserted;
      })
      .catch(() => {
        setSessionSaveError(
          "Không thể lưu Stone của chuỗi Combo. Dữ liệu ôn vẫn được giữ.",
        );
        return false;
      });
  };
  const exitSession = () => {
    const current = sessionRef.current;
    if (!current || busyRef.current) return;
    finishSession(current, false);
  };
  const committed = (
    token: number,
    id: number,
    correct: boolean | null = null,
  ) => {
    const current = sessionRef.current;
    if (
      !current ||
      current.token !== token ||
      current.word.id !== id ||
      current.processed.includes(id)
    )
      return;
    if (correct === true) sound.playReviewNote(current.currentCombo);
    const endedCombo = correct !== true ? current.currentCombo : 0;
    const comboIndex = current.comboRewardCount + (endedCombo > 0 ? 1 : 0);
    const mistakes =
      correct === false &&
      current.mode !== "idiom" &&
      isEligibleForReviewMistakeMatch(current.word) &&
      !current.mistakes.some((word) => word.id === id)
        ? [...current.mistakes, current.word]
        : current.mistakes;
    const combo = advanceReviewCombo(
      { current: current.currentCombo, max: current.maxCombo },
      correct === true,
    );
    const nextSession = {
      ...current,
      processed: [...current.processed, id],
      answered: correct === null ? current.answered : [...current.answered, id],
      correct: correct === true ? [...current.correct, id] : current.correct,
      currentCombo: combo.current,
      maxCombo: combo.max,
      comboRewardCount: comboIndex,
      mistakes,
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    if (endedCombo > 0) {
      saveComboReward(
        current.sessionId,
        current.startedAt,
        comboIndex,
        endedCombo,
      );
    }
  };
  const changeBusy = (token: number, index: number, value: boolean) => {
    if (
      sessionRef.current?.token !== token ||
      sessionRef.current.index !== index
    )
      return;
    busyRef.current = value;
    setBusy(value);
  };
  const next = (token: number) => {
    const s = sessionRef.current;
    if (
      !s ||
      s.token !== token ||
      error ||
      busyRef.current ||
      !s.processed.includes(s.word.id)
    )
      return;
    const availableWords =
      s.mode === "idiom" ? dueIdioms : standardDueWords;
    const due = new Map(availableWords.map((w) => [w.id, w]));
    const id = s.queue.find((q) => !s.processed.includes(q) && due.has(q));
    if (id === undefined) {
      finishSession(s, true, s.reviewMode === "speed");
      return;
    }
    const w = due.get(id)!;
    setSession({
      ...s,
      index: s.index + 1,
      word: w,
      exercise:
        s.mode === "idiom"
          ? createIdiomReviewExercise(w)
          : createReviewExercise(w, s.index + 1, s.formatOffset, words),
    });
  };
  useEffect(() => {
    if (
      session?.reviewMode !== "timebound" ||
      timeboundRemainingMs !== 0 ||
      busy
    ) {
      return;
    }
    const current = sessionRef.current;
    if (
      !current ||
      current.token !== session.token ||
      current.reviewMode !== "timebound" ||
      busyRef.current
    ) {
      return;
    }
    finishSession(current, true, true);
  }, [session?.token, session?.reviewMode, timeboundRemainingMs, busy]);

  const selectedReviewModeOption =
    REVIEW_MODE_OPTIONS.find((option) => option.id === selectedReviewMode) ??
    REVIEW_MODE_OPTIONS[0];
  const selectedReviewModeLabel =
    selectedReviewModeOption.id === "timebound"
      ? `Timebound · ${reviewPreferences.timeboundMinutes} phút`
      : selectedReviewModeOption.label;
  const selectedReviewModeDescription =
    selectedReviewModeOption.id === "timebound"
      ? `Tự tổng kết khi hết ${reviewPreferences.timeboundMinutes} phút.`
      : selectedReviewModeOption.description;
  const standardSessionCount = Math.min(
    standardDueWords.length,
    reviewPreferences.wordLimit,
  );
  const idiomSessionCount = Math.min(
    dueIdioms.length,
    reviewPreferences.wordLimit,
  );
  const canStartReview =
    reviewPreferences.ready && !reviewPreferences.error && !starting;

  let action: React.ReactNode;
  if (standardDueWords.length > 0 || dueIdioms.length > 0) {
    action = (
      <View style={{ gap: 14, alignItems: "stretch" }}>
        <Text testID="due-count" style={[styles.due, { color: c.foreground }]}>
          Đến giờ ôn tập:{" "}
          <Text style={{ color: c.primary }}>
            {(standardDueWords.length + dueIdioms.length).toLocaleString("vi-VN")} từ
          </Text>
        </Text>
        {reviewPreferences.error ? (
          <ErrorBanner
            message={reviewPreferences.error}
            onRetry={() => {
              void reviewPreferences.retryLoad();
            }}
          />
        ) : null}
        <View style={styles.reviewModePicker}>
          <Pressable
            testID="review-mode-dropdown"
            accessibilityRole="button"
            accessibilityLabel={`Chế độ ôn tập: ${selectedReviewModeLabel}`}
            accessibilityState={{ expanded: reviewModeDropdownOpen }}
            onPress={() => setReviewModeDropdownOpen((isOpen) => !isOpen)}
            disabled={!reviewPreferences.ready || starting}
            style={({ pressed }) => [
              styles.reviewModeTrigger,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                opacity:
                  !reviewPreferences.ready || starting
                    ? 0.5
                    : pressed
                      ? 0.78
                      : 1,
              },
            ]}
          >
            <View style={styles.reviewModeCopy}>
              <Text
                style={[styles.reviewModeCaption, { color: c.mutedForeground }]}
              >
                CHẾ ĐỘ ÔN TẬP
              </Text>
              <Text style={[styles.reviewModeLabel, { color: c.foreground }]}>
                {selectedReviewModeLabel}
              </Text>
              <Text
                style={[
                  styles.reviewModeDescription,
                  { color: c.mutedForeground },
                ]}
              >
                {selectedReviewModeDescription}
              </Text>
            </View>
            <Feather
              name={reviewModeDropdownOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={c.primary}
            />
          </Pressable>
          {reviewModeDropdownOpen ? (
            <View
              testID="review-mode-options"
              style={[
                styles.reviewModeOptions,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              {REVIEW_MODE_OPTIONS.map((option) => {
                const selected = option.id === selectedReviewMode;
                const optionLabel =
                  option.id === "timebound"
                    ? `Timebound · ${reviewPreferences.timeboundMinutes} phút`
                    : option.label;
                const optionDescription =
                  option.id === "timebound"
                    ? `Tự tổng kết khi hết ${reviewPreferences.timeboundMinutes} phút.`
                    : option.description;
                return (
                  <Pressable
                    key={option.id}
                    testID={`review-mode-${option.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSelectedReviewMode(option.id);
                      setReviewModeDropdownOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.reviewModeOption,
                      {
                        backgroundColor: selected
                          ? c.accentSoft
                          : "transparent",
                        borderColor: c.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <View style={styles.reviewModeCopy}>
                      <Text
                        style={[
                          styles.reviewModeLabel,
                          { color: selected ? c.primary : c.foreground },
                        ]}
                      >
                        {optionLabel}
                      </Text>
                      <Text
                        style={[
                          styles.reviewModeDescription,
                          { color: c.mutedForeground },
                        ]}
                      >
                        {optionDescription}
                      </Text>
                    </View>
                    {selected ? (
                      <Feather name="check" size={18} color={c.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        {standardDueWords.length > 0 ? (
          <Button
            testID="review-start"
            label={`Ôn tập từ thường · ${standardSessionCount} từ`}
            icon="play"
            onPress={() => {
              void start("standard", selectedReviewMode);
            }}
            loading={starting}
            disabled={!canStartReview}
          />
        ) : null}
        {dueIdioms.length ? (
          <Button
            testID="review-idiom-start"
            label={`Ôn idiom · hội thoại và nghe · ${idiomSessionCount} từ`}
            icon="message-circle"
            variant="ghost"
            onPress={() => {
              void start("idiom", selectedReviewMode);
            }}
            loading={starting}
            disabled={!canStartReview}
          />
        ) : null}
        {startError ? <ErrorBanner message={startError} /> : null}
      </View>
    );
  } else if (overview.nextReviewOn) {
    const secs = secondsUntilReview(overview.nextReviewOn, now);
    action = (
      <ReviewStatusBar
        testID="review-countdown"
        icon="clock"
        title={formatReviewCountdown(secs)}
        body={`Lượt ôn tiếp theo: ${calendarLabel(overview.nextReviewOn)}`}
      />
    );
  } else {
    action = (
      <View style={{ gap: 12 }}>
        <ReviewStatusBar
          testID="review-no-schedule"
          icon="calendar"
          title="Chưa có lịch ôn"
          body={
            overview.total
              ? "Mọi từ đã hoàn tất hoặc đang đóng băng."
              : "Sổ từ đang trống. Thêm từ để bắt đầu ở cấp 1."
          }
        />
        <View style={styles.row}>
          <Button
            testID="review-add-word"
            label="Thêm từ"
            icon="plus"
            onPress={() => router.push("/word")}
            style={{ flex: 1 }}
          />
          {overview.frozen ? (
            <Button
              testID="review-open-frozen"
              label="Từ đóng băng"
              icon="pause-circle"
              variant="ghost"
              onPress={() => router.push("/frozen")}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TabBackgroundMusic
        activeTab={reviewTabFocused && !inSession ? "review" : null}
        transitionVisible={false}
      />
      {session ? (
        <View
          style={[
            styles.sessionHeader,
            {
              paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 10,
              backgroundColor: c.background,
            },
          ]}
        >
          <View style={styles.sessionProgressRow}>
            <Pressable
              testID="review-back-overview"
              accessibilityRole="button"
              accessibilityLabel="Thoát phiên ôn tập"
              onPress={exitSession}
              disabled={busy}
              hitSlop={10}
              style={({ pressed }) => [
                styles.sessionClose,
                { opacity: busy ? 0.35 : pressed ? 0.55 : 1 },
              ]}
            >
              <Feather name="x" size={24} color={c.mutedForeground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View
                accessibilityLabel={`Tiến độ ${session.processed.length} trên ${session.queue.length} từ`}
                style={[styles.track, { backgroundColor: c.reviewTrack }]}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: c.primary,
                      width: `${(session.processed.length / session.queue.length) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.sessionStats}>
              <View
                testID="review-combo-counter"
                accessibilityLabel={`Combo ${session.currentCombo} câu đúng liên tiếp`}
                style={[
                  styles.comboCounter,
                  {
                    backgroundColor:
                      session.currentCombo > 0 ? c.primary : c.card,
                    borderColor:
                      session.currentCombo > 0 ? c.primary : c.border,
                  },
                ]}
              >
                <Feather
                  name="zap"
                  size={13}
                  color={
                    session.currentCombo > 0
                      ? c.primaryForeground
                      : c.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.comboCount,
                    {
                      color:
                        session.currentCombo > 0
                          ? c.primaryForeground
                          : c.mutedForeground,
                    },
                  ]}
                >
                  {session.currentCombo}
                </Text>
              </View>
              <Text
                testID="review-session-count"
                style={[styles.sessionCount, { color: c.mutedForeground }]}
              >
                {session.processed.length}/{session.queue.length}
              </Text>
              {timeboundRemainingMs !== null ? (
                <View
                  testID="review-timebound-countdown"
                  accessibilityLabel={`Còn ${formatTimeboundReviewCountdown(timeboundRemainingMs)}`}
                  style={[
                    styles.timeboundCounter,
                    { backgroundColor: c.accentSoft, borderColor: c.border },
                  ]}
                >
                  <Feather name="clock" size={12} color={c.primary} />
                  <Text style={[styles.timeboundCounterText, { color: c.primary }]}>
                    {formatTimeboundReviewCountdown(timeboundRemainingMs)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={[styles.sessionTitle, { color: c.foreground }]}>
            {session.exercise.kind === "multiple-choice"
              ? "Chọn từ đúng"
              : session.exercise.kind === "idiom-dialogue"
                ? "Hoàn thành hội thoại"
                : "Điền từ"}
          </Text>
        </View>
      ) : null}
      {comboNotice && (session || summary || gameWords) ? (
        <View
          testID={
            comboNotice.kind === "reward"
              ? "review-combo-reward"
              : "review-combo-notice"
          }
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          accessibilityLabel={
            comboNotice.kind === "reward"
              ? `Chuỗi ${comboNotice.count} câu được thưởng ${comboNotice.count} Stone`
              : `Combo ${comboNotice.count} câu đúng liên tiếp!`
          }
          style={[
            styles.comboNotice,
            {
              top: (Platform.OS === "web" ? 67 : insets.top) + 102,
              backgroundColor: c.primary,
              borderColor: c.border,
            },
          ]}
        >
          <Feather
            name={comboNotice.kind === "reward" ? "award" : "zap"}
            size={20}
            color={c.primaryForeground}
          />
          <View style={styles.comboNoticeCopy}>
            <Text
              style={[styles.comboNoticeTitle, { color: c.primaryForeground }]}
            >
              {comboNotice.kind === "reward"
                ? `+${comboNotice.count} Stone`
                : `Combo ${comboNotice.count}!`}
            </Text>
            <Text
              style={[styles.comboNoticeText, { color: c.primaryForeground }]}
            >
              {comboNotice.kind === "reward"
                ? `${comboNotice.count} câu đúng liên tiếp đã được cộng vào số dư.`
                : "Đúng liên tiếp rất tốt!"}
            </Text>
          </View>
        </View>
      ) : null}
      {gameWords ? (
        <ReviewMistakeMatchGame
          words={gameWords}
          onReturnToReview={() => {
            setGameWords(null);
            setSummary(pendingSummary);
            setPendingSummary(null);
          }}
        />
      ) : (
        <KeyboardAwareScrollViewCompat
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: session
              ? 8
              : (Platform.OS === "web" ? 67 : insets.top) + 12,
            paddingBottom: session
              ? Math.max(insets.bottom, Platform.OS === "web" ? 34 : 16) + 8
              : bottom,
            flexGrow: 1,
            gap: session ? 10 : 18,
          }}
        >
          {!session ? (
            <View style={styles.reviewToolbar}>
              <Pressable
                testID="review-open-settings"
                accessibilityRole="button"
                accessibilityLabel="Mở cài đặt"
                onPress={() => router.push("/settings")}
                style={({ pressed }) => [
                  styles.cog,
                  {
                    backgroundColor: c.headerButton,
                    borderColor: c.headerButton,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Feather name="settings" size={20} color={c.headerForeground} />
              </Pressable>
            </View>
          ) : null}
          {error ? (
            <ErrorBanner
              message={
                inSession
                  ? `${error} Kết quả đã lưu vẫn được giữ; hãy thử tải lại.`
                  : error
              }
              onRetry={reload}
            />
          ) : null}
          {session ? (
            <ReviewCard
              key={`${session.token}:${session.index}:${session.word.id}`}
              word={session.word}
              exercise={session.exercise}
              blocked={!!error}
              speedMode={session.reviewMode === "speed"}
              isLast={
                !session.queue.some(
                  (q) =>
                    q !== session.word.id &&
                    !session.processed.includes(q) &&
                    overview.dueWords.some((w) => w.id === q),
                )
              }
              onBusyChange={(value) =>
                changeBusy(session.token, session.index, value)
              }
              onCommitted={(id, correct) =>
                committed(session.token, id, correct)
              }
              onNext={() => next(session.token)}
            />
          ) : summary ? (
            <View
              testID="review-session-summary"
              accessibilityLiveRegion="polite"
              style={[
                styles.summaryCard,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  borderRadius: c.radius + 8,
                  position: "relative",
                  shadowColor: c.shade,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.16,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
            >
              <MaterialSheen radius={c.radius + 8} />
              <Text
                testID="review-summary-title"
                style={[styles.summaryTitle, { color: c.foreground }]}
              >
                Bạn đã ôn được {summary.reviewedCount.toLocaleString("vi-VN")}{" "}
                từ!
              </Text>
              <Text
                testID="review-summary-status"
                style={[styles.summarySubtitle, { color: c.mutedForeground }]}
              >
                {summary.completed
                  ? "Hoàn thành lượt ôn"
                  : summary.reviewedCount
                    ? "Kết quả tính đến lúc bạn thoát"
                    : "Chưa có câu trả lời để tính tỉ lệ"}
              </Text>
              {sessionSaveError ? (
                <ErrorBanner message={sessionSaveError} />
              ) : null}
              <View style={styles.summaryGradeArea}>
                <Text
                  testID="review-summary-grade"
                  accessibilityLabel={`Hạng ${getReviewGrade(summary.correctCount, summary.reviewedCount, summary.completed)}`}
                  style={[styles.summaryGrade, { color: c.primary }]}
                >
                  {getReviewGrade(
                    summary.correctCount,
                    summary.reviewedCount,
                    summary.completed,
                  )}
                </Text>
              </View>
              <View style={[styles.summaryMetrics, { borderColor: c.border }]}>
                <View style={styles.summaryMetric}>
                  <Text
                    testID="review-summary-reviewed"
                    style={[styles.summaryValue, { color: c.foreground }]}
                  >
                    {summary.reviewedCount}/{summary.plannedCount}
                  </Text>
                  <Text
                    style={[styles.summaryLabel, { color: c.mutedForeground }]}
                  >
                    Đã ôn / tổng số từ
                  </Text>
                </View>
                <View
                  style={[styles.metricDivider, { backgroundColor: c.border }]}
                />
                <View style={styles.summaryMetric}>
                  <Text
                    testID="review-summary-correct"
                    style={[styles.summaryValue, { color: c.successText }]}
                  >
                    {summary.correctCount}/{summary.reviewedCount}
                  </Text>
                  <Text
                    style={[styles.summaryLabel, { color: c.mutedForeground }]}
                  >
                    Đúng / đã ôn
                  </Text>
                </View>
                <View
                  style={[styles.metricDivider, { backgroundColor: c.border }]}
                />
                <View style={styles.summaryMetric}>
                  <Text
                    testID="review-summary-accuracy"
                    style={[styles.summaryValue, { color: c.primary }]}
                  >
                    {summary.reviewedCount
                      ? `${Math.round((summary.correctCount / summary.reviewedCount) * 100)}%`
                      : "—"}
                  </Text>
                  <Text
                    style={[styles.summaryLabel, { color: c.mutedForeground }]}
                  >
                    Tỉ lệ chính xác
                  </Text>
                </View>
              </View>
              <View style={styles.summaryHighlights}>
                <View
                  style={[
                    styles.summaryHighlight,
                    {
                      backgroundColor: c.secondary,
                      borderColor: c.border,
                      borderRadius: c.radius,
                    },
                  ]}
                >
                  <View style={styles.summaryHighlightHeading}>
                    <Feather name="award" size={16} color={c.primary} />
                    <Text
                      style={[
                        styles.summaryHighlightLabel,
                        { color: c.mutedForeground },
                      ]}
                      numberOfLines={2}
                    >
                      Stone được thưởng
                    </Text>
                  </View>
                  <Text
                    testID="review-summary-stone"
                    style={[
                      styles.summaryHighlightValue,
                      { color: c.primary },
                    ]}
                  >
                    {summary.stoneEarned.toLocaleString("vi-VN")} Stone
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryHighlight,
                    {
                      backgroundColor: c.secondary,
                      borderColor: c.border,
                      borderRadius: c.radius,
                    },
                  ]}
                >
                  <View style={styles.summaryHighlightHeading}>
                    <Feather name="zap" size={16} color={c.primary} />
                    <Text
                      style={[
                        styles.summaryHighlightLabel,
                        { color: c.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      Combo dài nhất
                    </Text>
                  </View>
                  <View style={styles.summaryComboValues}>
                    <View style={styles.summaryComboSlot}>
                      <Text
                        testID="review-summary-combo"
                        style={[
                          styles.summaryHighlightValue,
                          { color: c.foreground },
                        ]}
                      >
                        {summary.longestCombo}
                      </Text>
                      <Text
                        style={[
                          styles.summaryComboLabel,
                          { color: c.mutedForeground },
                        ]}
                      >
                        Phiên này
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.summaryComboSeparator,
                        { color: c.mutedForeground },
                      ]}
                    >
                      /
                    </Text>
                    <View style={styles.summaryComboSlot}>
                      <Text
                        testID="review-summary-personal-record"
                        style={[
                          styles.summaryHighlightValue,
                          { color: c.primary },
                        ]}
                      >
                        {summary.personalComboRecord}
                      </Text>
                      <Text
                        style={[
                          styles.summaryComboLabel,
                          { color: c.mutedForeground },
                        ]}
                        numberOfLines={2}
                      >
                        Kỷ lục của bạn
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.durationRow,
                  { backgroundColor: c.secondary, borderRadius: c.radius },
                ]}
              >
                <Feather name="clock" size={18} color={c.primary} />
                <Text
                  style={[
                    styles.durationLabel,
                    { color: c.secondaryForeground },
                  ]}
                >
                  Thời gian học lượt này
                </Text>
                <Text
                  testID="review-summary-duration"
                  style={[
                    styles.durationValue,
                    { color: c.secondaryForeground },
                  ]}
                >
                  {formatReviewDuration(summary.elapsedMs)}
                </Text>
              </View>
              <Button
                testID="review-summary-close"
                label="Về Ôn tập"
                icon="arrow-right"
                onPress={() => setSummary(null)}
              />
            </View>
          ) : sessionFinalizing ? (
            <View testID="review-summary-loading" style={styles.summaryFinalizing}>
              <Feather name="loader" size={22} color={c.primary} />
              <Text style={[styles.summarySubtitle, { color: c.mutedForeground }]}>
                Đang tổng kết phiên ôn...
              </Text>
            </View>
          ) : loading ? (
            <>
              <Skeleton h={64} />
              <Skeleton h={260} />
              <Skeleton h={56} />
            </>
          ) : error ? null : (
            <>
              <SavedTotal
                total={overview.total}
                frozen={overview.frozen}
                completed={overview.completed}
              />
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: c.card,
                    borderColor: c.border,
                    borderRadius: c.radius + 8,
                    position: "relative",
                    shadowColor: c.shade,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.14,
                    shadowRadius: 7,
                    elevation: 3,
                  },
                ]}
              >
                <MaterialSheen radius={c.radius + 8} />
                <LevelDistributionChart levels={overview.levels} />
              </View>
              {action}
            </>
          )}
        </KeyboardAwareScrollViewCompat>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  due: { fontFamily: F.b, fontSize: 18, textAlign: "center" },
  row: { flexDirection: "row", gap: 10 },
  reviewModePicker: { gap: 8 },
  reviewModeTrigger: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewModeOptions: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  reviewModeOption: {
    minHeight: 62,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewModeCopy: { flex: 1, gap: 3 },
  reviewModeCaption: { fontFamily: F.b, fontSize: 10, letterSpacing: 1.1 },
  reviewModeLabel: { fontFamily: F.b, fontSize: 15 },
  reviewModeDescription: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  chartCard: { padding: 16, paddingTop: 20, borderWidth: 1 },
  summaryCard: {
    position: "relative",
    flex: 1,
    minHeight: 520,
    justifyContent: "center",
    alignItems: "stretch",
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  summaryTitle: { fontFamily: F.b, fontSize: 24, textAlign: "center" },
  summarySubtitle: { fontFamily: F.r, fontSize: 14, textAlign: "center" },
  summaryGradeArea: {
    flexGrow: 1,
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryGrade: {
    fontFamily: F.b,
    fontSize: 100,
    lineHeight: 112,
    textAlign: "center",
  },
  summaryMetrics: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    marginTop: 8,
  },
  summaryMetric: { flex: 1, alignItems: "center", gap: 5 },
  summaryValue: {
    fontFamily: F.b,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: { fontFamily: F.m, fontSize: 10, textAlign: "center" },
  metricDivider: { width: 1, height: 36 },
  summaryHighlights: { flexDirection: "row", gap: 10 },
  summaryHighlight: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  summaryHighlightHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryHighlightLabel: {
    flexShrink: 1,
    fontFamily: F.m,
    fontSize: 12,
  },
  summaryHighlightValue: {
    fontFamily: F.b,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  summaryComboValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryComboSlot: { flex: 1, alignItems: "center", gap: 2 },
  summaryComboLabel: { fontFamily: F.m, fontSize: 9, textAlign: "center" },
  summaryComboSeparator: { fontFamily: F.r, fontSize: 16 },
  summaryFinalizing: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  durationLabel: { flex: 1, fontFamily: F.m, fontSize: 14 },
  durationValue: {
    fontFamily: F.b,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  sessionHeader: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  sessionProgressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sessionStats: { alignItems: "flex-end", gap: 4 },
  timeboundCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 999,
  },
  timeboundCounterText: {
    fontFamily: F.b,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  comboCounter: {
    minWidth: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 999,
  },
  comboCount: { fontFamily: F.b, fontSize: 13, fontVariant: ["tabular-nums"] },
  comboNotice: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 10,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  comboNoticeCopy: { flex: 1, gap: 2 },
  comboNoticeTitle: { fontFamily: F.b, fontSize: 16 },
  comboNoticeText: { fontFamily: F.m, fontSize: 13 },
  sessionClose: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCount: {
    fontFamily: F.s,
    fontSize: 12,
    minWidth: 28,
    textAlign: "right",
  },
  sessionTitle: { fontFamily: F.b, fontSize: 20, textAlign: "center" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  cog: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewToolbar: { alignItems: "flex-end", minHeight: 44 },
});
