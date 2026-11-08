import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import type { VocabularyWord } from '@/data/types';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { filterNotebookWords } from '@/domain/notebook-filter';
import { getReviewStatistics } from '@/data/vocabulary';
import type { ReviewStatistics } from '@/domain/review-statistics';
import { localDay } from '@/domain/srs';
import { NotebookStatistics } from '@/components/NotebookStatistics';

const REVIEW_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export default function VocabularyScreen() {
  const c = useColors();
  const { words, loading, error, reload } = useVocabulary();
  const [q, setQ] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [statisticsMonth, setStatisticsMonth] = useState(() => `${localDay(new Date()).slice(0, 7)}-01`);
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const bottom = useBottomPad();

  const filtered = useMemo(() => {
    const sorted = [...words].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filterNotebookWords(sorted, q, selectedLevel);
  }, [words, q, selectedLevel]);

  const loadStatistics = useCallback(
    async (month = statisticsMonth) => {
      setStatisticsLoading(true);
      try {
        setStatistics(await getReviewStatistics(localDay(new Date()), month));
        setStatisticsError(null);
      } catch {
        setStatisticsError('Không thể tải thống kê ôn tập. Dữ liệu từ vựng vẫn được giữ nguyên.');
      } finally {
        setStatisticsLoading(false);
      }
    },
    [statisticsMonth],
  );

  useFocusEffect(
    useCallback(() => {
      void loadStatistics(statisticsMonth);
    }, [loadStatistics, statisticsMonth]),
  );

  const addBtn = (
    <Pressable
      testID="add-word"
      accessibilityLabel="Thêm từ mới"
      onPress={() => router.push('/word')}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: c.button,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <Feather name="plus" size={24} color={c.buttonForeground} />
    </Pressable>
  );

  const searchBar = (
    <View
      style={[
        styles.search,
        {
          backgroundColor: c.input,
          borderColor: c.border,
          borderRadius: c.radius,
        },
      ]}
    >
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
  );

  const levelFilters = (
    <View testID="notebook-level-filters" style={styles.levelFilters}>
      {REVIEW_LEVELS.map((level) => {
        const selected = selectedLevel === level;
        return (
          <Pressable
            key={level}
            testID={`level-filter-${level}`}
            accessibilityRole="button"
            accessibilityLabel={`Lọc từ cấp ${level}`}
            accessibilityHint="Chạm lại cấp đang chọn để bỏ lọc."
            accessibilityState={{ selected }}
            onPress={() => setSelectedLevel((current) => (current === level ? null : level))}
            style={({ pressed }) => [
              styles.levelFilter,
              {
                backgroundColor: selected ? c.primary : c.secondary,
                borderColor: selected ? c.primary : c.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.levelFilterText, { color: selected ? c.primaryForeground : c.foreground }]}>Cấp {level}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const listHeader = (
    <View style={styles.listHeader}>
      {statistics ? (
        <NotebookStatistics statistics={statistics} canGoForward={statisticsMonth < `${localDay(new Date()).slice(0, 7)}-01`} onMonthChange={setStatisticsMonth} />
      ) : statisticsError ? (
        <ErrorBanner message={statisticsError} onRetry={() => void loadStatistics()} />
      ) : statisticsLoading ? (
        <View style={{ gap: 8 }}>
          <Skeleton h={76} />
          <Skeleton h={150} />
        </View>
      ) : null}
      {words.length > 0 ? searchBar : null}
      {words.length > 0 ? levelFilters : null}
    </View>
  );

  const renderItem = ({ item }: { item: VocabularyWord }) => (
    <Pressable
      testID={`word-${item.id}`}
      onPress={() => router.push({ pathname: '/word', params: { id: String(item.id) } })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? c.vocabCardPressed : c.vocabCard,
          borderColor: c.navigationBorder,
          borderRadius: c.radius,
        },
      ]}
    >
      <View style={[styles.spine, { backgroundColor: c.vocabCardAccent }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.termRow}>
          <Text style={[styles.term, { color: c.vocabCardForeground }]} numberOfLines={1}>
            {item.term}
          </Text>
          {item.ipa ? (
            <Text style={[styles.ipa, { color: c.vocabCardAccent }]} numberOfLines={1}>
              {item.ipa}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.meaning, { color: c.vocabCardMuted }]} numberOfLines={2}>
          {item.meaning}
        </Text>
        {item.frozen ? <Text style={[styles.ipa, styles.frozenTag, { color: c.frozenForeground, backgroundColor: c.frozen }]}>Đã đóng băng</Text> : null}
      </View>
      <Feather name="chevron-right" size={18} color={c.vocabCardMuted} />
    </Pressable>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker={`${words.length} từ trong sổ`} title="Sổ từ của bạn" right={words.length > 0 ? addBtn : undefined} />
      {error ? (
        <View style={styles.pad}>
          <ErrorBanner message={error} onRetry={reload} />
        </View>
      ) : null}
      {loading && words.length === 0 ? (
        <View style={styles.pad}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(w) => String(w.id)}
          renderItem={renderItem}
          scrollEnabled={filtered.length > 0}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={listHeader}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: bottom,
            gap: 10,
          }}
          ListEmptyComponent={
            error ? undefined : words.length === 0 ? (
              <EmptyState icon="feather" title="Trang đầu tiên đang chờ" body="Mỗi từ bạn ghi lại là một từ bạn đã chọn để nhớ. Bắt đầu với từ bạn gặp hôm nay.">
                <Button label="Ghi từ đầu tiên" icon="plus" onPress={() => router.push('/word')} testID="add-first" />
              </EmptyState>
            ) : (
              <EmptyState
                icon="search"
                title={selectedLevel === null ? 'Không tìm thấy' : 'Không có từ ở cấp này'}
                body={
                  selectedLevel === null
                    ? `Không có từ nào khớp với “${q.trim()}”. Thử bỏ dấu hoặc viết ngắn hơn.`
                    : q.trim()
                      ? `Không có từ ở Cấp ${selectedLevel} khớp với “${q.trim()}”.`
                      : `Sổ từ chưa có từ ở Cấp ${selectedLevel}.`
                }
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frozenTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 8 },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: { gap: 10 },
  search: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontFamily: F.r, fontSize: 16, height: '100%' },
  levelFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 1,
  },
  levelFilter: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelFilterText: { fontFamily: F.s, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    paddingLeft: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  spine: {
    width: 4,
    alignSelf: 'stretch',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  termRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  term: { fontFamily: F.b, fontSize: 18, flexShrink: 1 },
  ipa: { fontFamily: F.r, fontSize: 14, flexShrink: 1 },
  meaning: { fontFamily: F.r, fontSize: 15, lineHeight: 21 },
});
