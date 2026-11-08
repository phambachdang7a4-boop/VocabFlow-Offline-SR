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

type Session = { token: number; queue: number[]; processed: number[]; index: number; formatOffset: number; word: VocabularyWord; exercise: ReviewExercise };

export default function ReviewScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const speech = useSpeechPreferences();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottom = useBottomPad();
  const now = useReviewClock();
  const day = localDay(new Date(now));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const sequence = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const overview = useMemo(() => reviewOverview(words, day), [words, day]);
  const card = overview.dueWords[0];
  const inSession = !!session;

  useEffect(() => {
    navigation.setOptions({ tabBarStyle: inSession ? { display: 'none' } : undefined });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [navigation, inSession]);

  useFocusEffect(useCallback(() => {
    setSession(null);
    busyRef.current = false; setBusy(false);
    void reload();
    return () => { void speech.stopSpeaking(); setSession(null); busyRef.current = false; setBusy(false); };
  }, [reload, speech.stopSpeaking]));

  useEffect(() => {
    if (session && speech.ready && speech.autoRead) void speech.speakWord(session.word.term);
    return () => { void speech.stopSpeaking(); };
  }, [session?.token, session?.index, session?.word.id, speech.ready, speech.autoRead, speech.speakWord, speech.stopSpeaking]);

  const start = () => {
    const first = overview.dueWords[0];
    if (!first || error || loading) return;
    setFeedback(null);
    setSession({ token: ++sequence.current, queue: overview.dueWords.map(w => w.id), processed: [], index: 0, formatOffset: first.reviewCount,
      word: first, exercise: createReviewExercise(first, 0, first.reviewCount, words) });
  };
  const committed = (token: number, id: number) => setSession(s =>
    s && s.token === token && s.word.id === id && !s.processed.includes(id) ? { ...s, processed: [...s.processed, id] } : s);
  const changeBusy = (token: number, index: number, value: boolean) => {
    if (sessionRef.current?.token !== token || sessionRef.current.index !== index) return;
    busyRef.current = value;
    setBusy(value);
  };
  const next = (token: number) => {
    const s = sessionRef.current;
    if (!s || s.token !== token || error || busyRef.current || !s.processed.includes(s.word.id)) return;
    const due = new Map(overview.dueWords.map(w => [w.id, w]));
    const id = s.queue.find(q => !s.processed.includes(q) && due.has(q));
    if (id === undefined) {
      setSession(null);
      setFeedback(`Hoàn tất phiên: đã xử lý ${s.processed.length} / ${s.queue.length} từ.`);
      return;
    }
    const w = due.get(id)!;
    setSession({ ...s, index: s.index + 1, word: w, exercise: createReviewExercise(w, s.index + 1, s.formatOffset, words) });
  };

  const feedbackView = feedback ? (
    <View accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: c.secondary, borderRadius: c.radius }]}>
      <Feather name="check-circle" size={18} color={c.primary} />
      <Text style={[styles.noteText, { color: c.secondaryForeground }]}>{feedback}</Text>
    </View>
  ) : null;

  let action: React.ReactNode;
  if (card) {
    action = (
      <View style={{ gap: 14, alignItems: 'stretch' }}>
        <Text testID="due-count" style={[styles.due, { color: c.foreground }]}>
          Đến giờ ôn tập: <Text style={{ color: c.primary }}>{overview.dueWords.length.toLocaleString('vi-VN')} từ</Text>
        </Text>
        <Button testID="review-start" label="Ôn tập ngay" icon="play"
          onPress={start} />
      </View>
    );
  } else if (overview.nextReviewOn) {
    const secs = secondsUntilReview(overview.nextReviewOn, now);
    action = <ReviewStatusBar testID="review-countdown" icon="clock"
      title={formatReviewCountdown(secs)} body={`Lượt ôn tiếp theo: ${calendarLabel(overview.nextReviewOn)}`} />;
  } else {
    action = (
      <View style={{ gap: 12 }}>
        <ReviewStatusBar testID="review-no-schedule" icon="calendar" title="Chưa có lịch ôn"
          body={overview.total ? 'Mọi từ đã hoàn tất hoặc đang đóng băng.' : 'Sổ từ đang trống. Thêm từ để bắt đầu ở cấp 1.'} />
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
        <View style={[styles.sessionHeader, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 10, backgroundColor: c.background }]}>
          <View style={styles.sessionProgressRow}>
            <Pressable testID="review-back-overview" accessibilityRole="button" accessibilityLabel="Thoát phiên ôn tập"
              onPress={() => { if (!busyRef.current) setSession(null); }} disabled={busy} hitSlop={10}
              style={({ pressed }) => [styles.sessionClose, { opacity: busy ? 0.35 : pressed ? 0.55 : 1 }]}>
              <Feather name="x" size={24} color={c.mutedForeground} />
            </Pressable>
            <View style={[styles.sessionMark, { backgroundColor: c.accent }]}>
              <Feather name="book-open" size={15} color={c.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <View accessibilityLabel={`Tiến độ ${session.processed.length} trên ${session.queue.length} từ`}
                style={[styles.track, { backgroundColor: c.reviewTrack }]}>
                <View style={[styles.fill, { backgroundColor: c.primary, width: `${(session.processed.length / session.queue.length) * 100}%` }]} />
              </View>
            </View>
            <Text testID="review-session-count" style={[styles.sessionCount, { color: c.mutedForeground }]}>
              {session.processed.length}/{session.queue.length}
            </Text>
          </View>
          <Text style={[styles.sessionTitle, { color: c.foreground }]}>
            {session.exercise.kind === 'multiple-choice' ? 'Chọn từ đúng' : 'Điền từ'}
          </Text>
        </View>
      ) : (
        <ScreenHeader kicker="Học ngắt quãng" title="Ôn tập" right={
          <Pressable testID="review-open-settings" accessibilityRole="button" accessibilityLabel="Mở cài đặt"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.cog, { backgroundColor: c.headerButton, borderColor: c.headerButton, opacity: pressed ? 0.6 : 1 }]}>
            <Feather name="settings" size={20} color={c.headerForeground} />
          </Pressable>
        } />
      )}
      <KeyboardAwareScrollViewCompat bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: session ? Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 16) + 8 : bottom,
        flexGrow: 1,
        gap: session ? 10 : 18,
      }}>
        {error ? <ErrorBanner message={inSession ? `${error} Kết quả đã lưu vẫn được giữ; hãy thử tải lại.` : error} onRetry={reload} /> : null}
        {session ? (
          <ReviewCard key={`${session.token}:${session.index}:${session.word.id}`} word={session.word} exercise={session.exercise}
            blocked={!!error} isLast={!session.queue.some(q => q !== session.word.id && !session.processed.includes(q) && overview.dueWords.some(w => w.id === q))}
            onBusyChange={value => changeBusy(session.token, session.index, value)}
            onCommitted={id => committed(session.token, id)} onNext={() => next(session.token)} />
        ) : loading ? (
          <>
            <Skeleton h={64} /><Skeleton h={260} /><Skeleton h={56} />
          </>
        ) : error ? null : (
          <>
            <SavedTotal total={overview.total} frozen={overview.frozen} completed={overview.completed} />
            {feedbackView}
            <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 8 }]}>
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
  note: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  due: { fontFamily: F.b, fontSize: 18, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  chartCard: { padding: 16, paddingTop: 20, borderWidth: 1 },
  sessionHeader: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  sessionProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionClose: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  sessionMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sessionCount: { fontFamily: F.s, fontSize: 12, minWidth: 28, textAlign: 'right' },
  sessionTitle: { fontFamily: F.b, fontSize: 20, textAlign: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  cog: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
