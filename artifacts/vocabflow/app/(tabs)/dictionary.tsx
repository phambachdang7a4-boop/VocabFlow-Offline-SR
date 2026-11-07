import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { normalizeTerm } from '@/data/vocabulary';
import { searchDictionary } from '@/data/dictionary';
import { type DictionaryMatch } from '@/domain/dictionary';
import { DictionaryGate } from '@/components/DictionaryGate';
import { useDictionary } from '@/hooks/useDictionary';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';

export default function DictionaryScreen() {
  const c = useColors();
  const bottom = useBottomPad();
  const dict = useDictionary();
  const { words } = useVocabulary();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<DictionaryMatch[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const reqRef = useRef(0);

  const saved = useMemo(() => new Set(words.map((w) => normalizeTerm(w.term))), [words]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const id = ++reqRef.current;
    setError(null);
    setLoadingMore(false);
    if (!dict.ready || !debounced) { setItems([]); setHasMore(false); setLoading(false); return; }
    setLoading(true);
    searchDictionary(debounced, 0).then(
      (r) => { if (reqRef.current === id) { setItems(r.items); setHasMore(r.hasMore); } },
      (e) => { if (reqRef.current === id) { setItems([]); setHasMore(false); setError(e instanceof Error ? e.message : 'Không thể tra cứu.'); } },
    ).finally(() => { if (reqRef.current === id) setLoading(false); });
  }, [debounced, dict.ready, retryTick]);

  const loadMore = () => {
    if (!hasMore || loading || loadingMore || !debounced) return;
    const id = reqRef.current;
    setError(null);
    setLoadingMore(true);
    searchDictionary(debounced, items.length).then(
      (r) => {
        if (reqRef.current !== id) return;
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...r.items.filter((x) => !seen.has(x.id))];
        });
        setHasMore(r.hasMore);
      },
      (e) => { if (reqRef.current === id) setError(e instanceof Error ? e.message : 'Không thể tải thêm.'); },
    ).finally(() => { if (reqRef.current === id) setLoadingMore(false); });
  };

  const sourcesBtn = (
    <Pressable testID="dictionary-open-sources" accessibilityLabel="Nguồn từ điển" onPress={() => router.push('/dictionary-sources')}
      hitSlop={8} style={({ pressed }) => [styles.iconBtn, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
      <Feather name="info" size={20} color={c.primary} />
    </Pressable>
  );

  const renderItem = ({ item }: { item: DictionaryMatch }) => {
    const inBook = saved.has(normalizeTerm(item.term));
    return (
      <Pressable testID={`dictionary-result-${item.id}`}
        onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/dictionary-entry', params: { id: String(item.id) } }); }}
        style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.secondary : c.card, borderColor: c.border, borderRadius: c.radius }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.row}>
            <Text style={[styles.term, { color: c.foreground }]} numberOfLines={1}>{item.term}</Text>
            {inBook ? (
              <View style={[styles.pill, { backgroundColor: c.secondary }]}>
                <Text style={[styles.pillText, { color: c.primary }]}>Đã có trong sổ</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.meaning, { color: c.mutedForeground }]} numberOfLines={2}>{item.meaning}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={c.mutedForeground} />
      </Pressable>
    );
  };

  let body: React.ReactNode;
  if (!dict.ready) body = <DictionaryGate stage={dict.stage} error={dict.error} retry={dict.retry} approveDownload={dict.approveDownload} />;
  else if (!debounced) body = (
    <EmptyState icon="search" title="Tra một từ tiếng Anh" body="Gõ vài chữ cái đầu. Chỉ những nghĩa bạn chọn mới được ghi vào sổ và trở thành thẻ ôn." />
  );
  else if (loading && items.length === 0) body = <View style={{ padding: 20 }}><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /></View>;
  else if (error && items.length === 0) body = (
    <View style={{ padding: 20 }}><ErrorBanner message={error} onRetry={() => setRetryTick((n) => n + 1)} /></View>
  );
  else if (items.length === 0) body = (
    <EmptyState icon="feather" title="Không có mục từ phù hợp" body={`Không tìm thấy từ bắt đầu bằng “${debounced}”. Bạn vẫn có thể tự ghi từ này vào sổ.`}>
      <Button testID="dictionary-add-manual" label="Tự ghi từ mới" icon="edit-3" variant="ghost" onPress={() => router.push('/word')} />
    </EmptyState>
  );
  else body = (
    <FlatList
      testID="dictionary-results"
      data={items}
      keyExtractor={(i) => String(i.id)}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      windowSize={7}
      removeClippedSubviews
      onEndReachedThreshold={0.4}
      onEndReached={loadMore}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom, gap: 10 }}
      ListFooterComponent={
        error ? <ErrorBanner message={error} onRetry={loadMore} />
          : hasMore ? <Button testID="dictionary-load-more" label="Tải thêm kết quả" variant="ghost" loading={loadingMore} onPress={loadMore} />
          : undefined
      }
    />
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader kicker="Từ điển Anh – Việt, ngoại tuyến" title="Tra Từ" right={sourcesBtn} />
      <View style={[styles.search, { backgroundColor: c.input, borderColor: c.border, borderRadius: c.radius, opacity: dict.ready ? 1 : 0.6 }]}>
        <Feather name="search" size={18} color={c.mutedForeground} />
        <TextInput
          testID="dictionary-search"
          value={q}
          onChangeText={setQ}
          editable={dict.ready}
          placeholder="Nhập từ tiếng Anh"
          placeholderTextColor={c.mutedForeground}
          style={[styles.searchInput, { color: c.foreground }]}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={200}
          returnKeyType="search"
        />
        {loading && items.length > 0 ? <ActivityIndicator size="small" color={c.primary} /> : null}
        {q ? (
          <Pressable testID="dictionary-clear" onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Xoá tìm kiếm">
            <Feather name="x-circle" size={18} color={c.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>{body}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gate: { padding: 16, gap: 10, borderWidth: 1 },
  gateTitle: { flex: 1, fontFamily: F.s, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: F.r, fontSize: 16, paddingVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  term: { fontFamily: F.b, fontSize: 17, flexShrink: 1 },
  meaning: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontFamily: F.s, fontSize: 11 },
});
