import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { createReviewExercise, type ReviewExercise } from '@/domain/review-exercises';
import type { VocabularyWord } from '@/data/types';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import { useReviewClock } from '@/hooks/useReviewClock';
import { localDay } from '@/domain/srs';
import { formatReviewCountdown, reviewOverview, secondsUntilReview } from '@/domain/review-overview';
import { Button, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { ReviewCard, calendarLabel } from '@/components/ReviewCard';
import { LevelDistributionChart, ReviewStatusBar, SavedTotal } from '@/components/ReviewOverview';
import { useSpeechPreferences } from '@/contexts/SpeechPreferencesContext';
import { createReviewSessionSummary, formatReviewDuration, getReviewGrade, type ReviewSessionSummary } from '@/domain/review-session';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { soundCueFor } from '@/domain/sound-cues';
import { recordReviewSessionStart } from '@/data/vocabulary';

type Session = {
  token: number;
  queue: number[];
  processed: number[];
  answered: number[];
  correct: number[];
  startedAt: number;
  index: number;
  formatOffset: number;
  word: VocabularyWord;
  exercise: ReviewExercise;
};

export default function ReviewScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const speech = useSpeechPreferences();
  const sound = useSoundEffects();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottom = useBottomPad();
  const now = useReviewClock();
  const day = localDay(new Date(now));
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<ReviewSessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const startingRef = useRef(false);
  const sequence = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const overview = useMemo(() => reviewOverview(words, day), [words, day]);
  const card = overview.dueWords[0];
  const inSession = !!session;

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: inSession ? { display: 'none' } : undefined,
    });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [navigation, inSession]);

  useFocusEffect(
    useCallback(() => {
      setSession(null);
      busyRef.current = false;
      setBusy(false);
      void reload();
      return () => {
        void speech.stopSpeaking();
        setSession(null);
        busyRef.current = false;
        setBusy(false);
      };
    }, [reload, speech.stopSpeaking]),
  );

  useEffect(() => {
    if (session && session.exercise.kind !== 'multiple-choice' && speech.ready && speech.autoRead) {
      void speech.speakWord(session.word.term);
    }
    return () => {
      void speech.stopSpeaking();
    };
  }, [session?.token, session?.index, session?.word.id, session?.exercise.kind, speech.ready, speech.autoRead, speech.speakWord, speech.stopSpeaking]);

  const start = async () => {
    const first = overview.dueWords[0];
    if (!first || error || loading || startingRef.current) return;
    startingRef.current = true;
    sound.unlockFromGesture();
    setStarting(true);
    setStartError(null);
    try {
      await recordReviewSessionStart();
      sound.play(soundCueFor('reviewStarted'));
      setSummary(null);
      setSession({
        token: ++sequence.current,
        queue: overview.dueWords.map((w) => w.id),
        processed: [],
        answered: [],
        correct: [],
        startedAt: Date.now(),
        index: 0,
        formatOffset: first.reviewCount,
        word: first,
        exercise: createReviewExercise(first, 0, first.reviewCount, words),
      });
    } catch {
      setStartError('Không thể ghi nhận lượt ôn. Hãy thử lại; dữ liệu học vẫn được giữ.');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };
  const finishSession = (current: Session, completed: boolean) => {
    if (completed) sound.play(soundCueFor('reviewCompleted'));
    setSummary(createReviewSessionSummary(current, Date.now(), completed));
    sessionRef.current = null;
    setSession(null);
  };
  const exitSession = () => {
    const current = sessionRef.current;
    if (!current || busyRef.current) return;
    finishSession(current, false);
  };
  const committed = (token: number, id: number, correct: boolean | null = null) =>
    setSession((s) => {
      if (!s || s.token !== token || s.word.id !== id || s.processed.includes(id)) return s;
      return {
        ...s,
        processed: [...s.processed, id],
        answered: correct === null ? s.answered : [...s.answered, id],
        correct: correct === true ? [...s.correct, id] : s.correct,
      };
    });
  const changeBusy = (token: number, index: number, value: boolean) => {
    if (sessionRef.current?.token !== token || sessionRef.current.index !== index) return;
    busyRef.current = value;
    setBusy(value);
  };
  const next = (token: number) => {
    const s = sessionRef.current;
    if (!s || s.token !== token || error || busyRef.current || !s.processed.includes(s.word.id)) return;
    const due = new Map(overview.dueWords.map((w) => [w.id, w]));
    const id = s.queue.find((q) => !s.processed.includes(q) && due.has(q));
    if (id === undefined) {
      finishSession(s, true);
      return;
    }
    const w = due.get(id)!;
    setSession({
      ...s,
      index: s.index + 1,
      word: w,
      exercise: createReviewExercise(w, s.index + 1, s.formatOffset, words),
    });
  };

  let action: React.ReactNode;
  if (card) {
    action = (
      <View style={{ gap: 14, alignItems: 'stretch' }}>
        <Text testID="due-count" style={[styles.due, { color: c.foreground }]}>
          Đến giờ ôn tập: <Text style={{ color: c.primary }}>{overview.dueWords.length.toLocaleString('vi-VN')} từ</Text>
        </Text>
        <Button
          testID="review-start"
          label="Ôn tập ngay"
          icon="play"
          onPress={() => {
            void start();
          }}
          loading={starting}
          disabled={starting}
        />
        {startError ? <ErrorBanner message={startError} /> : null}
      </View>
    );
  } else if (overview.nextReviewOn) {
    const secs = secondsUntilReview(overview.nextReviewOn, now);
    action = <ReviewStatusBar testID="review-countdown" icon="clock" title={formatReviewCountdown(secs)} body={`Lượt ôn tiếp theo: ${calendarLabel(overview.nextReviewOn)}`} />;
  } else {
    action = (
      <View style={{ gap: 12 }}>
        <ReviewStatusBar
          testID="review-no-schedule"
          icon="calendar"
          title="Chưa có lịch ôn"
          body={overview.total ? 'Mọi từ đã hoàn tất hoặc đang đóng băng.' : 'Sổ từ đang trống. Thêm từ để bắt đầu ở cấp 1.'}
        />
        <View style={styles.row}>
          <Button testID="review-add-word" label="Thêm từ" icon="plus" onPress={() => router.push('/word')} style={{ flex: 1 }} />
          {overview.frozen ? <Button testID="review-open-frozen" label="Từ đóng băng" icon="pause-circle" variant="ghost" onPress={() => router.push('/frozen')} style={{ flex: 1 }} /> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {session ? (
        <View
          style={[
            styles.sessionHeader,
            {
              paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 10,
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
              style={({ pressed }) => [styles.sessionClose, { opacity: busy ? 0.35 : pressed ? 0.55 : 1 }]}
            >
              <Feather name="x" size={24} color={c.mutedForeground} />
            </Pressable>
            <View style={[styles.sessionMark, { backgroundColor: c.accent }]}>
              <Feather name="book-open" size={15} color={c.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <View accessibilityLabel={`Tiến độ ${session.processed.length} trên ${session.queue.length} từ`} style={[styles.track, { backgroundColor: c.reviewTrack }]}>
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
            <Text testID="review-session-count" style={[styles.sessionCount, { color: c.mutedForeground }]}>
              {session.processed.length}/{session.queue.length}
            </Text>
          </View>
          <Text style={[styles.sessionTitle, { color: c.foreground }]}>{session.exercise.kind === 'multiple-choice' ? 'Chọn từ đúng' : 'Điền từ'}</Text>
        </View>
      ) : (
        <ScreenHeader
          kicker="Học ngắt quãng"
          title="Ôn tập"
          right={
            <Pressable
              testID="review-open-settings"
              accessibilityRole="button"
              accessibilityLabel="Mở cài đặt"
              onPress={() => router.push('/settings')}
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
          }
        />
      )}
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: session ? Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 16) + 8 : bottom,
          flexGrow: 1,
          gap: session ? 10 : 18,
        }}
      >
        {error ? <ErrorBanner message={inSession ? `${error} Kết quả đã lưu vẫn được giữ; hãy thử tải lại.` : error} onRetry={reload} /> : null}
        {session ? (
          <ReviewCard
            key={`${session.token}:${session.index}:${session.word.id}`}
            word={session.word}
            exercise={session.exercise}
            blocked={!!error}
            isLast={!session.queue.some((q) => q !== session.word.id && !session.processed.includes(q) && overview.dueWords.some((w) => w.id === q))}
            onBusyChange={(value) => changeBusy(session.token, session.index, value)}
            onCommitted={(id, correct) => committed(session.token, id, correct)}
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
              },
            ]}
          >
            <Text testID="review-summary-title" style={[styles.summaryTitle, { color: c.foreground }]}>
              Bạn đã ôn được {summary.reviewedCount.toLocaleString('vi-VN')} từ!
            </Text>
            <Text testID="review-summary-status" style={[styles.summarySubtitle, { color: c.mutedForeground }]}>
              {summary.completed ? 'Hoàn thành lượt ôn' : summary.reviewedCount ? 'Kết quả tính đến lúc bạn thoát' : 'Chưa có câu trả lời để tính tỉ lệ'}
            </Text>
            <View style={styles.summaryGradeArea}>
              <Text
                testID="review-summary-grade"
                accessibilityLabel={`Hạng ${getReviewGrade(summary.correctCount, summary.reviewedCount, summary.completed)}`}
                style={[styles.summaryGrade, { color: c.primary }]}
              >
                {getReviewGrade(summary.correctCount, summary.reviewedCount, summary.completed)}
              </Text>
            </View>
            <View style={[styles.summaryMetrics, { borderColor: c.border }]}>
              <View style={styles.summaryMetric}>
                <Text testID="review-summary-reviewed" style={[styles.summaryValue, { color: c.foreground }]}>
                  {summary.reviewedCount}/{summary.plannedCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Đã ôn / tổng số từ</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: c.border }]} />
              <View style={styles.summaryMetric}>
                <Text testID="review-summary-correct" style={[styles.summaryValue, { color: c.successText }]}>
                  {summary.correctCount}/{summary.reviewedCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Đúng / đã ôn</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: c.border }]} />
              <View style={styles.summaryMetric}>
                <Text testID="review-summary-accuracy" style={[styles.summaryValue, { color: c.primary }]}>
                  {summary.reviewedCount ? `${Math.round((summary.correctCount / summary.reviewedCount) * 100)}%` : '—'}
                </Text>
                <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Tỉ lệ chính xác</Text>
              </View>
            </View>
            <View style={[styles.durationRow, { backgroundColor: c.secondary, borderRadius: c.radius }]}>
              <Feather name="clock" size={18} color={c.primary} />
              <Text style={[styles.durationLabel, { color: c.secondaryForeground }]}>Thời gian ôn</Text>
              <Text testID="review-summary-duration" style={[styles.durationValue, { color: c.secondaryForeground }]}>
                {formatReviewDuration(summary.elapsedMs)}
              </Text>
            </View>
            <Button testID="review-summary-close" label="Về Ôn tập" icon="arrow-right" onPress={() => setSummary(null)} />
          </View>
        ) : loading ? (
          <>
            <Skeleton h={64} />
            <Skeleton h={260} />
            <Skeleton h={56} />
          </>
        ) : error ? null : (
          <>
            <SavedTotal total={overview.total} frozen={overview.frozen} completed={overview.completed} />
            <View
              style={[
                styles.chartCard,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  borderRadius: c.radius + 8,
                },
              ]}
            >
              <LevelDistributionChart levels={overview.levels} />
            </View>
            {action}
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  due: { fontFamily: F.b, fontSize: 18, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  chartCard: { padding: 16, paddingTop: 20, borderWidth: 1 },
  summaryCard: {
    flex: 1,
    minHeight: 520,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  summaryTitle: { fontFamily: F.b, fontSize: 24, textAlign: 'center' },
  summarySubtitle: { fontFamily: F.r, fontSize: 14, textAlign: 'center' },
  summaryGradeArea: {
    flexGrow: 1,
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGrade: {
    fontFamily: F.b,
    fontSize: 100,
    lineHeight: 112,
    textAlign: 'center',
  },
  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    marginTop: 8,
  },
  summaryMetric: { flex: 1, alignItems: 'center', gap: 5 },
  summaryValue: {
    fontFamily: F.b,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: { fontFamily: F.m, fontSize: 10, textAlign: 'center' },
  metricDivider: { width: 1, height: 36 },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  durationLabel: { flex: 1, fontFamily: F.m, fontSize: 14 },
  durationValue: {
    fontFamily: F.b,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  sessionHeader: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  sessionProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionClose: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCount: {
    fontFamily: F.s,
    fontSize: 12,
    minWidth: 28,
    textAlign: 'right',
  },
  sessionTitle: { fontFamily: F.b, fontSize: 20, textAlign: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  cog: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
