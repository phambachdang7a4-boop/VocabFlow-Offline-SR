import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useVocabulary } from '@/contexts/VocabularyContext';
import type { VocabularyWord } from '@/data/types';
import { Button, EmptyState, ErrorBanner, F, MaterialSheen, Skeleton } from '@/components/ui';

function FrozenItem({ word, disabled, onSaved }: { word: VocabularyWord; disabled: boolean; onSaved: () => void }) {
  const c = useColors();
  const { setWordFrozen } = useVocabulary();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const unfreeze = async () => {
    if (busy.current || disabled) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await setWordFrozen(word.id, false);
      onSaved();
    } catch (failure) {
      busy.current = false;
      setSaving(false);
      setError(failure instanceof Error ? failure.message : 'Không thể bỏ đóng băng. Hãy thử lại.');
    }
  };
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius,
        shadowColor: c.shade, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 7, elevation: 3,
      },
    ]}>
      <MaterialSheen radius={c.radius} />
      <Pressable testID={`frozen-word-${word.id}`} disabled={saving}
        accessibilityRole="button" accessibilityLabel={`Xem từ ${word.term}`}
        onPress={() => router.push({ pathname: '/word', params: { id: String(word.id) } })}
        style={({ pressed }) => ({ gap: 6, opacity: pressed ? 0.7 : 1 })}>
        <Text style={[styles.term, { color: c.foreground }]}>{word.term}</Text>
        <Text style={[styles.body, { color: c.mutedForeground }]}>{word.meaning}</Text>
         <Text style={[styles.label, { color: c.primary }]}>Đã đóng băng · Xem từ</Text>
      </Pressable>
      {error ? <ErrorBanner message={error} /> : null}
      <Button testID={`unfreeze-${word.id}`} label="Bỏ đóng băng" icon="play-circle" variant="ghost"
        onPress={() => { void unfreeze(); }} loading={saving} disabled={disabled} />
    </View>
  );
}

export default function FrozenScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { frozenWords, words, error, loading, reload } = useVocabulary();
  const [saved, setSaved] = useState(false);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList data={frozenWords} keyExtractor={word => String(word.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 34, gap: 14, flexGrow: 1 }}
        renderItem={({ item }) => <FrozenItem word={item} disabled={!!error} onSaved={() => setSaved(true)} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Text style={[styles.term, { color: c.foreground }]}>{frozenWords.length} từ đã đóng băng</Text>
            <Text style={[styles.body, { color: c.mutedForeground }]}>
              Các từ này không xuất hiện khi ôn, vẫn tra cứu được và vẫn tính trong tổng {words.length} từ đã lưu.
            </Text>
            <Text style={[styles.body, { color: c.mutedForeground }]}>
              Bỏ đóng băng sẽ đưa từ về cấp 6. Hạn ôn theo mốc 30 ngày từ lần học đầu; nếu đã quá hạn thì ôn ngay. Từ đã trả lời hôm nay sẽ ôn từ ngày mai.
            </Text>
            {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
            {saved ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.primary }]}>Đã bỏ đóng băng và đưa từ về cấp 6.</Text> : null}
          </View>
        }
        ListEmptyComponent={loading ? <Skeleton h={120} /> : error ? undefined : (
          <EmptyState icon="pause-circle" title="Chưa có từ đóng băng" body="Bạn có thể đóng băng một từ trong màn Ôn tập hoặc khi xem từ trong sổ.">
            <Button testID="frozen-back-to-words" label="Về sổ từ" icon="book-open" onPress={() => router.replace('/')} />
          </EmptyState>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'relative', padding: 16, borderWidth: 1, gap: 14 },
  term: { fontFamily: F.b, fontSize: 20 },
  body: { fontFamily: F.r, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: F.m, fontSize: 12 },
});
