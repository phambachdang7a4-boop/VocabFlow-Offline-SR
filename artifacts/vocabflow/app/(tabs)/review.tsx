import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import type { VocabularyWord } from '@/data/types';
import { REVIEW_DAY_OFFSETS } from '@/domain/srs';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';

function calendarLabel(day: string) {
  return day.split('-').reverse().join('/');
}

function ReviewCard({ word, disabled, onSaved }: {
  word: VocabularyWord;
  disabled: boolean;
  onSaved: (message: string) => void;
}) {
  const c = useColors();
  const { recordReview, setWordFrozen } = useVocabulary();
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState<'correct' | 'wrong' | 'freeze' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const answer = async (correct: boolean) => {
    if (!revealed || disabled || busy.current) return;
    busy.current = true;
    setSaving(correct ? 'correct' : 'wrong');
    setError(null);
    try {
      await recordReview(word.id, correct, word.reviewCount);
      onSaved(correct
        ? word.level === 6 ? 'Đã lưu: hoàn tất 6 cấp ôn.' : `Đã lưu: chuyển lên cấp ${word.level + 1}.`
        : `Đã lưu: ${word.level === 1 ? 'giữ cấp 1' : `lùi về cấp ${word.level - 1}`}, ôn lại từ ngày mai.`);
      // Keep locked until the refreshed progress unmounts this card.
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể lưu câu trả lời. Hãy thử lại.');
      busy.current = false;
      setSaving(null);
    }
  };

  const freeze = async () => {
    if (disabled || busy.current) return;
    busy.current = true;
    setSaving('freeze');
    setError(null);
    try {
      await setWordFrozen(word.id, true);
      onSaved('Đã đóng băng từ. Từ vẫn trong sổ và không xuất hiện khi ôn cho đến khi bạn bỏ đóng băng.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể đóng băng từ. Hãy thử lại.');
      busy.current = false;
      setSaving(null);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={[styles.counter, { color: c.mutedForeground }]}>CẤP {word.level} / 6 · HẠN {calendarLabel(word.nextReviewOn!)}</Text>
      <Pressable
        testID="flashcard"
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Đã hiện nghĩa' : 'Lật thẻ để xem nghĩa'}
        disabled={!!saving || disabled}
        onPress={() => setRevealed(value => !value)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: revealed ? c.flashBack : c.flashFront,
            borderColor: revealed ? c.border : c.flashFront,
            borderRadius: c.radius + 10,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {!revealed ? (
          <>
            <Text style={[styles.side, { color: c.accentSoft }]}>TIẾNG ANH</Text>
            <Text style={[styles.front, { color: c.primaryForeground }]} adjustsFontSizeToFit numberOfLines={3}>{word.term}</Text>
            {word.ipa ? <Text style={[styles.ipa, { color: c.accentSoft }]}>{word.ipa}</Text> : null}
            <View style={styles.hint}>
              <Feather name="rotate-cw" size={14} color={c.primaryForeground} />
              <Text style={[styles.hintText, { color: c.primaryForeground }]}>Chạm để xem nghĩa</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.side, { color: c.accent }]}>NGHĨA</Text>
            <Text style={[styles.back, { color: c.foreground }]}>{word.meaning}</Text>
            <Text style={[styles.smallTerm, { color: c.primary }]}>{word.term}</Text>
            {word.example ? <Text style={[styles.example, { color: c.mutedForeground, borderLeftColor: c.accent }]}>{word.example}</Text> : null}
            {word.note ? <Text style={[styles.noteBody, { color: c.mutedForeground }]}>{word.note}</Text> : null}
          </>
        )}
      </Pressable>
      {error ? <ErrorBanner message={error} /> : null}
      {revealed ? (
        <>
          <Text style={[styles.explain, { color: c.mutedForeground }]}>Bạn có nhớ đúng nghĩa trước khi lật thẻ?</Text>
          <View style={styles.row}>
            <Button testID="review-wrong" label="Trả lời sai" icon="x" variant="ghost"
              onPress={() => { void answer(false); }} loading={saving === 'wrong'} disabled={!!saving || disabled} style={{ flex: 1 }} />
            <Button testID="review-correct" label="Trả lời đúng" icon="check"
              onPress={() => { void answer(true); }} loading={saving === 'correct'} disabled={!!saving || disabled} style={{ flex: 1 }} />
          </View>
          <Text style={[styles.explain, { color: c.mutedForeground }]}>
            {word.level === 6 ? 'Đúng: hoàn tất chu kỳ.' : `Đúng: lên cấp ${word.level + 1}.`} Sai: {word.level === 1 ? 'giữ cấp 1' : `lùi về cấp ${word.level - 1}`}, ôn lại ngày mai.
          </Text>
        </>
      ) : (
        <Button testID="reveal-answer" label="Xem nghĩa" icon="rotate-cw" onPress={() => setRevealed(true)} disabled={disabled} />
      )}
      <Button testID="review-freeze" label="Đóng băng" icon="pause-circle" variant="ghost"
        onPress={() => { void freeze(); }} loading={saving === 'freeze'} disabled={!!saving || disabled} />
      <Text style={[styles.explain, { color: c.mutedForeground }]}>Dừng ôn từ này, vẫn giữ trong sổ và tính vào tổng số từ. Có thể bỏ đóng băng trong Cài đặt.</Text>
    </View>
  );
}

export default function ReviewScreen() {
  const c = useColors();
  const { words, dueWords, today, loading, error, reload } = useVocabulary();
  const bottom = useBottomPad();
  const [feedback, setFeedback] = useState<string | null>(null);
  const card = dueWords[0];
  const upcoming = words.filter(word => !word.frozen && !word.completed && word.nextReviewOn && word.nextReviewOn > today)
    .map(word => word.nextReviewOn!).sort()[0];
  const completed = words.filter(word => word.completed).length;

  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="Học ngắt quãng" title="Ôn tập hôm nay" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom, flexGrow: 1, gap: 16 }}>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        {feedback ? (
          <View accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: c.secondary, borderRadius: c.radius }]}>
            <Feather name="check-circle" size={18} color={c.primary} />
            <Text style={[styles.noteText, { color: c.secondaryForeground }]}>{feedback}</Text>
          </View>
        ) : null}
        {loading ? <Skeleton h={320} /> : error ? null : card ? (
          <>
            <Text style={[styles.explain, { color: c.mutedForeground }]} testID="due-count">
              Còn {dueWords.length} từ đến hạn · Bao gồm từ quá hạn
            </Text>
            <ReviewCard key={`${card.id}:${card.reviewCount}:${today}`} word={card} disabled={!!error} onSaved={setFeedback} />
          </>
        ) : (
          <EmptyState icon={words.length ? 'check-circle' : 'layers'}
            title={words.length ? 'Không có từ đến hạn' : 'Chưa có từ để ôn'}
            body={words.length
              ? upcoming
                ? `Lần ôn tiếp theo từ ${calendarLabel(upcoming)}. ${completed ? `${completed} từ đã hoàn tất 6 cấp.` : 'Bạn có thể nghỉ hoặc thêm từ mới.'}`
                : words.some(word => word.frozen)
                  ? 'Các từ còn lại đã hoàn tất hoặc đang đóng băng. Xem từ đóng băng trong Cài đặt.'
                  : 'Bạn đã hoàn tất 6 cấp cho tất cả từ hiện có. Từ vẫn được giữ trong sổ.'
              : 'Thêm từ vào sổ và bắt đầu học ngay ở cấp 1.'}>
            <Button testID="review-add-word" label="Thêm từ" icon="plus" variant="accent" onPress={() => router.push('/word')} />
          </EmptyState>
        )}
        {!loading && !error ? (
          <View style={[styles.schedule, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius }]}>
            <Text style={[styles.smallTerm, { color: c.primary }]}>Lịch ôn 6 cấp</Text>
            <Text style={[styles.noteBody, { color: c.mutedForeground }]}>
              {REVIEW_DAY_OFFSETS.map(day => day === 0 ? 'Học ngay' : `Sau ${day} ngày`).join(' · ')}
            </Text>
            <Text style={[styles.noteBody, { color: c.mutedForeground }]}>
              Các mốc tính từ lần học đầu. Sai chỉ lùi 1 cấp (thấp nhất cấp 1), không đặt lại ngày học. Nếu mốc kế tiếp đã qua, ôn tiếp từ ngày mai.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  counter: { fontFamily: F.s, fontSize: 12, letterSpacing: 0.5, textAlign: 'center' },
  card: { minHeight: 320, padding: 26, justifyContent: 'center', alignItems: 'center', gap: 12, borderWidth: 1 },
  side: { fontFamily: F.b, fontSize: 11, letterSpacing: 2 },
  front: { fontFamily: F.b, fontSize: 40, textAlign: 'center', letterSpacing: -0.8 },
  ipa: { fontFamily: F.r, fontSize: 17 },
  hint: { position: 'absolute', bottom: 18, flexDirection: 'row', gap: 6, alignItems: 'center', opacity: 0.7 },
  hintText: { fontFamily: F.m, fontSize: 13 },
  back: { fontFamily: F.b, fontSize: 26, textAlign: 'center', lineHeight: 34 },
  smallTerm: { fontFamily: F.s, fontSize: 15 },
  example: { fontFamily: F.r, fontSize: 15, lineHeight: 22, fontStyle: 'italic', borderLeftWidth: 3, paddingLeft: 12, alignSelf: 'stretch', marginTop: 6 },
  noteBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10 },
  explain: { fontFamily: F.m, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  schedule: { padding: 16, borderWidth: 1, gap: 8 },
});
