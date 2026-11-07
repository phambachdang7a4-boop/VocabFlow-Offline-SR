import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { normalizeTerm } from '@/data/vocabulary';
import { searchDictionary } from '@/data/dictionary';
import { type DictionaryMatch } from '@/domain/dictionary';
import { DictionaryGate } from '@/components/DictionaryGate';
import { DictionaryEntryView } from '@/components/DictionaryEntryView';
import { useDictionary } from '@/hooks/useDictionary';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { useBottomPad } from '@/components/ScreenHeader';

export default function DictionaryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  const bottom = useBottomPad();
  const dict = useDictionary();
  const { words } = useVocabulary();
  const [q, setQ] = useState('');
  const [lookup, setLookup] = useState({ term: '', openExact: false });
  const debounced = lookup.term;
  const [items, setItems] = useState<DictionaryMatch[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const reqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const saved = useMemo(() => new Set(words.map((w) => normalizeTerm(w.term))), [words]);

  useEffect(() => () => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    reqRef.current += 1;
  }, []);

  useEffect(() => {
    const id = ++reqRef.current;
    setError(null);
    setLoadingMore(false);
    if (!dict.ready || !debounced) { setItems([]); setHasMore(false); setLoading(false); return; }
    setLoading(true);
    searchDictionary(debounced, 0).then(
      (r) => {
        if (reqRef.current !== id) return;
        setItems(r.items); setHasMore(r.hasMore);
        if (lookup.openExact) {
          const exact = r.items.find((item) => normalizeTerm(item.term) === normalizeTerm(debounced));
          if (exact) setOpenId(exact.id);
        }
      },
      (e) => { if (reqRef.current === id) { setItems([]); setHasMore(false); setError(e instanceof Error ? e.message : 'Không thể tra cứu.'); } },
    ).finally(() => { if (reqRef.current === id) setLoading(false); });
  }, [lookup, dict.ready, retryTick]);

  const onChange = (v: string) => {
    // Invalidate immediately, not 250 ms later: an older exact-match response
    // must not reopen a word after the user has started typing something else.
    reqRef.current += 1;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    setQ(v); setOpenId(null); setItems([]); setHasMore(false);
    setError(null); setLoadingMore(false); setLoading(!!v.trim());
    if (!v.trim()) {
      setLookup({ term: '', openExact: false });
    } else {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        setLookup({ term: v.trim(), openExact: false });
      }, 250);
    }
  };

  // Magnifier / keyboard submit: search now (skip debounce); open the exact headword if present.
  const submit = () => {
    const term = q.trim();
    if (!dict.ready || !term) return;
    Keyboard.dismiss();
    reqRef.current += 1;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setOpenId(null); setItems([]); setLoading(true);
    // One effect owns both typed and submitted searches, so submit cannot race
    // a second debounce-triggered request and lose its exact-match action.
    setLookup({ term, openExact: true });
  };

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

  const renderItem = ({ item }: { item: DictionaryMatch }) => {
    const inBook = saved.has(normalizeTerm(item.term));
    return (
      <Pressable testID={`dictionary-result-${item.id}`} accessibilityRole="button"
        onPress={() => {
          Keyboard.dismiss(); reqRef.current += 1;
          setLoading(false); setLoadingMore(false); setOpenId(item.id);
        }}
        style={({ pressed }) => [styles.row, { borderBottomColor: c.dictLine, backgroundColor: pressed ? c.dictChip : c.dictPage }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.term, { color: c.dictHead }]} numberOfLines={1}>{item.term}</Text>
            {inBook ? (
              <View style={[styles.pill, { backgroundColor: c.dictChip }]}>
                <Text style={[styles.pillText, { color: c.dictHead }]}>Đã có trong sổ</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.meaning, { color: c.dictMuted }]} numberOfLines={2}>{item.meaning}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={c.dictMuted} />
      </Pressable>
    );
  };

  let body: React.ReactNode;
  if (!dict.ready) body = <DictionaryGate stage={dict.stage} error={dict.error} retry={dict.retry} approveDownload={dict.approveDownload} />;
  else if (openId !== null) body = (
    <DictionaryEntryView key={openId} id={openId} bottomPad={bottom} backLabel="Kết quả tra cứu"
      onBack={() => setOpenId(null)} />
  );
  else if (!debounced) body = (
    <EmptyState icon="search" title="Tra một từ tiếng Anh" body="Gõ vài chữ cái đầu. Chỉ những nghĩa bạn chọn mới được ghi vào sổ và trở thành thẻ ôn." />
  );
  else if (loading && items.length === 0) body = <View style={{ padding: 20 }}><Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} /></View>;
  else if (error && items.length === 0) body = (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} onRetry={() => setRetryTick((n) => n + 1)} />
    </ScrollView>
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
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom }}
      ListFooterComponent={
        <View style={{ paddingTop: 14 }}>
          {error ? <ErrorBanner message={error} onRetry={loadMore} />
            : hasMore ? <Button testID="dictionary-load-more" label="Tải thêm kết quả" variant="ghost" loading={loadingMore} onPress={loadMore} />
            : null}
        </View>
      }
    />
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.dictPage }}>
      <View style={[styles.band, { backgroundColor: c.dictBand, paddingTop: top + 10 }]}>
        <View style={styles.bandHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: c.dictBandMuted }]}>VocabFlow · Anh – Việt ngoại tuyến</Text>
            <Text style={[styles.title, { color: c.dictBandInk }]}>Tra Từ</Text>
          </View>
          <Pressable testID="dictionary-open-sources" accessibilityLabel="Nguồn từ điển" onPress={() => router.push('/dictionary-sources')}
            hitSlop={8} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Feather name="info" size={20} color={c.dictBandInk} />
          </Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: c.dictField, borderRadius: c.radius, opacity: dict.ready ? 1 : 0.6 }]}>
          <TextInput
            ref={inputRef}
            testID="dictionary-search"
            accessibilityLabel="Nhập từ tiếng Anh"
            value={q}
            onChangeText={onChange}
            onSubmitEditing={submit}
            editable={dict.ready}
            placeholder="Nhập từ tiếng Anh"
            placeholderTextColor={c.dictMuted}
            style={[styles.searchInput, { color: c.dictInk }]}
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={200}
            returnKeyType="search"
          />
          {loading && (items.length > 0 || openId !== null) ? <ActivityIndicator size="small" color={c.dictHead} /> : null}
          {q ? (
            <Pressable testID="dictionary-clear" onPress={() => { onChange(''); inputRef.current?.focus(); }} hitSlop={10} accessibilityLabel="Xoá tìm kiếm">
              <Feather name="x-circle" size={20} color={c.dictMuted} />
            </Pressable>
          ) : null}
          <View style={[styles.divider, { backgroundColor: c.dictLine }]} />
          <Pressable testID="dictionary-submit" accessibilityRole="button" accessibilityLabel="Tra ngay" onPress={submit}
            disabled={!dict.ready || !q.trim()} hitSlop={6}
            style={({ pressed }) => [styles.go, { opacity: pressed ? 0.6 : (!dict.ready || !q.trim()) ? 0.4 : 1 }]}>
            <Feather name="search" size={22} color={c.dictHead} />
          </Pressable>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: c.dictPage }}>{body}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  band: { paddingHorizontal: 16, paddingBottom: 18, gap: 14 },
  bandHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 4 },
  kicker: { fontFamily: F.s, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontFamily: F.b, fontSize: 26, letterSpacing: -0.5 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, minHeight: 54 },
  searchInput: { flex: 1, minWidth: 0, width: 0, fontFamily: F.m, fontSize: 18, paddingVertical: 12 },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 10 },
  go: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  term: { fontFamily: F.b, fontSize: 18, flexShrink: 1 },
  meaning: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontFamily: F.s, fontSize: 11 },
});
