import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import type { VocabularyWord } from '@/data/types';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { fold } from '@/utils/text';

export default function VocabularyScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const [q, setQ] = useState('');
  const bottom = useBottomPad();

  const filtered = useMemo(() => {
    const sorted = [...words].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const f = fold(q);
    if (!f) return sorted;
    return sorted.filter((w) =>
      [w.term, w.meaning, w.example, w.note].some((t) => fold(t ?? '').includes(f)),
    );
  }, [words, q]);

  const addBtn = (
    <Pressable
      testID="add-word"
      accessibilityLabel="Thêm từ mới"
      onPress={() => router.push('/word')}
      style={({ pressed }) => [styles.fab, { backgroundColor: c.accent, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <Feather name="plus" size={24} color={c.accentForeground} />
    </Pressable>
  );

  const renderItem = ({ item }: { item: VocabularyWord }) => (
    <Pressable
      testID={`word-${item.id}`}
      onPress={() => router.push({ pathname: '/word', params: { id: String(item.id) } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? c.secondary : c.card, borderColor: c.border, borderRadius: c.radius },
      ]}
    >
      <View style={[styles.spine, { backgroundColor: c.primary }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.termRow}>
          <Text style={[styles.term, { color: c.foreground }]} numberOfLines={1}>{item.term}</Text>
          {item.ipa ? <Text style={[styles.ipa, { color: c.accent }]} numberOfLines={1}>{item.ipa}</Text> : null}
        </View>
        <Text style={[styles.meaning, { color: c.mutedForeground }]} numberOfLines={2}>{item.meaning}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker={`${words.length} từ trong sổ`} title="Sổ từ của bạn" right={words.length > 0 ? addBtn : undefined} />
      {words.length > 0 ? (
        <View style={[styles.search, { backgroundColor: c.input, borderColor: c.border, borderRadius: c.radius }]}>
          <Feather name="search" size={18} color={c.mutedForeground} />
          <TextInput
            testID="search"
            value={q}
            onChangeText={setQ}
            placeholder="Tìm tiếng Anh hoặc tiếng Việt"
            placeholderTextColor={c.mutedForeground}
            style={[styles.searchInput, { color: c.foreground }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Xoá tìm kiếm">
              <Feather name="x-circle" size={18} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <View style={styles.pad}><ErrorBanner message={error} onRetry={reload} /></View> : null}
      {loading && words.length === 0 ? (
        <View style={styles.pad}>
          <Skeleton /><Skeleton /><Skeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(w) => String(w.id)}
          renderItem={renderItem}
          scrollEnabled={filtered.length > 0}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: bottom, gap: 10 }}
          ListEmptyComponent={
            error ? undefined : words.length === 0 ? (
              <EmptyState
                icon="feather"
                title="Trang đầu tiên đang chờ"
                body="Mỗi từ bạn ghi lại là một từ bạn đã chọn để nhớ. Bắt đầu với từ bạn gặp hôm nay."
              >
                <Button label="Ghi từ đầu tiên" icon="plus" variant="accent" onPress={() => router.push('/word')} testID="add-first" />
              </EmptyState>
            ) : (
              <EmptyState icon="search" title="Không tìm thấy" body={`Không có từ nào khớp với “${q.trim()}”. Thử bỏ dấu hoặc viết ngắn hơn.`} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 8 },
  fab: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 20, marginBottom: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontFamily: F.r, fontSize: 16, height: '100%' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingLeft: 0, borderWidth: 1, overflow: 'hidden' },
  spine: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  termRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  term: { fontFamily: F.b, fontSize: 18, flexShrink: 1 },
  ipa: { fontFamily: F.r, fontSize: 14, flexShrink: 1 },
  meaning: { fontFamily: F.r, fontSize: 15, lineHeight: 21 },
});
