import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const bottom = useBottomPad();
  const [order, setOrder] = useState<number[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const deck = useMemo(() => {
    const byId = new Map(words.map((w) => [w.id, w]));
    const ids = order ?? [...words].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((w) => w.id);
    const fromOrder = ids.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => !!w);
    const missing = words.filter((w) => !ids.includes(w.id));
    return [...fromOrder, ...missing];
  }, [words, order]);

  const safeIdx = deck.length ? Math.min(idx, deck.length - 1) : 0;
  const card = deck[safeIdx];

  const go = (d: number) => {
    if (!deck.length) return;
    setIdx((safeIdx + d + deck.length) % deck.length);
    setRevealed(false);
  };
  const doShuffle = () => {
    setOrder(shuffle(words.map((w) => w.id)));
    setIdx(0);
    setRevealed(false);
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="Luyện tập tự do" title="Thẻ ghi nhớ" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom, flexGrow: 1 }}>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        {loading && words.length === 0 ? (
          <Skeleton h={320} />
        ) : !card ? (
          error ? null : (
            <EmptyState icon="layers" title="Chưa có thẻ nào" body="Thẻ ghi nhớ được tạo từ chính sổ từ của bạn. Thêm một từ để bắt đầu luyện.">
              <Button label="Thêm từ" icon="plus" variant="accent" onPress={() => router.push('/word')} />
            </EmptyState>
          )
        ) : (
          <View style={{ gap: 16 }}>
            <View style={[styles.note, { backgroundColor: c.secondary, borderRadius: c.radius }]}>
              <Feather name="info" size={16} color={c.secondaryForeground} />
              <Text style={[styles.noteText, { color: c.secondaryForeground }]}>
                Chế độ luyện tập thủ công: lật thẻ để tự kiểm tra. Chưa có lịch ôn hay chấm điểm.
              </Text>
            </View>
            <Text style={[styles.counter, { color: c.mutedForeground }]}>
              Thẻ {safeIdx + 1} / {deck.length}
            </Text>
            <Pressable
              testID="flashcard"
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Úp thẻ' : 'Lật thẻ để xem nghĩa'}
              onPress={() => setRevealed((r) => !r)}
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
                  <Text style={[styles.front, { color: c.primaryForeground }]} adjustsFontSizeToFit numberOfLines={3}>{card.term}</Text>
                  {card.ipa ? <Text style={[styles.ipa, { color: c.accentSoft }]}>{card.ipa}</Text> : null}
                  <View style={styles.hint}>
                    <Feather name="rotate-cw" size={14} color={c.primaryForeground} />
                    <Text style={[styles.hintText, { color: c.primaryForeground }]}>Chạm để lật</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.side, { color: c.accent }]}>NGHĨA</Text>
                  <Text style={[styles.back, { color: c.foreground }]}>{card.meaning}</Text>
                  <Text style={[styles.smallTerm, { color: c.primary }]}>{card.term}</Text>
                  {card.example ? (
                    <Text style={[styles.example, { color: c.mutedForeground, borderLeftColor: c.accent }]}>{card.example}</Text>
                  ) : null}
                  {card.note ? <Text style={[styles.noteBody, { color: c.mutedForeground }]}>{card.note}</Text> : null}
                </>
              )}
            </Pressable>
            <View style={styles.row}>
              <Button label="Trước" icon="arrow-left" variant="ghost" onPress={() => go(-1)} disabled={deck.length < 2} style={{ flex: 1 }} testID="prev" />
              <Button label="Tiếp" icon="arrow-right" onPress={() => go(1)} disabled={deck.length < 2} style={{ flex: 1 }} testID="next" />
            </View>
            <Button label="Xáo trộn thứ tự" icon="shuffle" variant="ghost" onPress={doShuffle} disabled={deck.length < 2} testID="shuffle" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  counter: { fontFamily: F.s, fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  card: { minHeight: 320, padding: 26, justifyContent: 'center', alignItems: 'center', gap: 12, borderWidth: 1 },
  side: { fontFamily: F.b, fontSize: 11, letterSpacing: 2 },
  front: { fontFamily: F.b, fontSize: 40, textAlign: 'center', letterSpacing: -0.8 },
  ipa: { fontFamily: F.r, fontSize: 17 },
  hint: { position: 'absolute', bottom: 18, flexDirection: 'row', gap: 6, alignItems: 'center', opacity: 0.7 },
  hintText: { fontFamily: F.m, fontSize: 13 },
  back: { fontFamily: F.b, fontSize: 26, textAlign: 'center', lineHeight: 34 },
  smallTerm: { fontFamily: F.s, fontSize: 15 },
  example: { fontFamily: F.r, fontSize: 15, lineHeight: 22, fontStyle: 'italic', borderLeftWidth: 3, paddingLeft: 12, alignSelf: 'stretch', marginTop: 6 },
  noteBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20, alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: 10 },
});
