import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import { useReviewClock } from '@/hooks/useReviewClock';
import { localDay } from '@/domain/srs';
import { formatReviewCountdown, reviewOverview, secondsUntilReview } from '@/domain/review-overview';
import { Button, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { ReviewCard, calendarLabel } from '@/components/ReviewCard';
import { LevelDistributionChart, ReviewStatusBar, SavedTotal } from '@/components/ReviewOverview';

export default function ReviewScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const bottom = useBottomPad();
  const now = useReviewClock();
  const day = localDay(new Date(now));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [session, setSession] = useState(false);
  const overview = useMemo(() => reviewOverview(words, day), [words, day]);
  const card = overview.dueWords[0];
  const inSession = session && !!card;
  useEffect(() => {
    if (overview.dueWords.length === 0) setSession(false);
  }, [overview.dueWords.length]);

  useFocusEffect(useCallback(() => {
    setSession(false);
    void reload();
  }, [reload]));

  const onSaved = (message: string) => setFeedback(message);
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
          onPress={() => { setFeedback(null); setSession(true); }} />
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
          <Button testID="review-add-word" label="Thêm từ" icon="plus" variant="accent" onPress={() => router.push('/word')} style={{ flex: 1 }} />
          {overview.frozen ? <Button testID="review-open-frozen" label="Từ đóng băng" icon="pause-circle" variant="ghost" onPress={() => router.push('/frozen')} style={{ flex: 1 }} /> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="Học ngắt quãng" title={inSession ? 'Phiên ôn tập' : 'Ôn tập'} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom, flexGrow: 1, gap: 18 }}>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        {loading ? (
          <>
            <Skeleton h={64} /><Skeleton h={260} /><Skeleton h={56} />
          </>
        ) : error ? null : inSession ? (
          <>
            <View style={styles.sessionTop}>
              <Pressable testID="review-back-overview" accessibilityRole="button" accessibilityLabel="Về tổng quan"
                onPress={() => setSession(false)} hitSlop={10}
                style={[styles.back, { backgroundColor: c.card, borderColor: c.border }]}>
                <Feather name="arrow-left" size={18} color={c.foreground} />
              </Pressable>
              <Text testID="due-count" style={[styles.noteText, { color: c.mutedForeground }]}>
                Còn {overview.dueWords.length} từ đến hạn · Bao gồm từ quá hạn
              </Text>
            </View>
            {feedbackView}
            <ReviewCard key={`${card.id}:${card.reviewCount}:${day}`} word={card} disabled={!!error} onSaved={onSaved} />
          </>
        ) : (
          <>
            <SavedTotal total={overview.total} frozen={overview.frozen} completed={overview.completed} />
            {feedbackView}
            <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 8 }]}>
              <LevelDistributionChart levels={overview.levels} />
            </View>
            {action}
          </>
        )}
      </ScrollView>
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
  sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
