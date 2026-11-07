import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { normalizeTerm } from '@/data/vocabulary';
import { getDictionaryEntry } from '@/data/dictionary';
import { validDictionaryId, type DictionaryEntry, type DictionarySense } from '@/domain/dictionary';
import { useDictionary } from '@/hooks/useDictionary';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, Skeleton } from '@/components/ui';
import { DictionaryGate } from '@/components/DictionaryGate';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/dictionary');
}

export default function DictionaryEntryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = (Platform.OS === 'web' ? 34 : insets.bottom) + 24;
  const params = useLocalSearchParams<{ id?: string }>();
  const raw = typeof params.id === 'string' ? params.id : '';
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  const valid = validDictionaryId(id);
  const dict = useDictionary();
  const { words } = useVocabulary();

  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [senses, setSenses] = useState<DictionarySense[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const reqRef = useRef(0);

  useEffect(() => {
    const rid = ++reqRef.current;
    if (!valid || !dict.ready) return;
    setLoading(true); setError(null); setMoreError(null); setEntry(null); setSenses([]); setSelected(null);
    getDictionaryEntry(id, 0).then(
      (e) => { if (reqRef.current === rid) { setEntry(e); setSenses(e.senses); setHasMore(e.hasMore); setSelected(e.senses[0]?.id ?? null); } },
      (e) => { if (reqRef.current === rid) setError(e instanceof Error ? e.message : 'Không thể mở mục từ.'); },
    ).finally(() => { if (reqRef.current === rid) setLoading(false); });
  }, [id, valid, dict.ready, tick]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !entry) return;
    const rid = reqRef.current;
    setLoadingMore(true); setMoreError(null);
    getDictionaryEntry(id, senses.length).then(
      (e) => {
        if (reqRef.current !== rid) return;
        setSenses((prev) => { const seen = new Set(prev.map((s) => s.id)); return [...prev, ...e.senses.filter((s) => !seen.has(s.id))]; });
        setHasMore(e.hasMore);
      },
      (e) => { if (reqRef.current === rid) setMoreError(e instanceof Error ? e.message : 'Không thể tải thêm nghĩa.'); },
    ).finally(() => { if (reqRef.current === rid) setLoadingMore(false); });
  }, [hasMore, loadingMore, entry, id, senses.length]);

  const existing = useMemo(
    () => (entry ? words.find((w) => normalizeTerm(w.term) === normalizeTerm(entry.term)) : undefined),
    [words, entry],
  );

  if (!valid) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: 'Không hợp lệ' }} />
        <EmptyState icon="alert-triangle" title="Đường dẫn không hợp lệ" body="Mục từ này không tồn tại. Hãy quay lại và tra lại.">
          <Button testID="entry-invalid-back" label="Quay lại" icon="arrow-left" onPress={goBack} />
        </EmptyState>
      </View>
    );
  }
  if (!dict.ready) return <View style={{ flex: 1, backgroundColor: c.background }}><DictionaryGate stage={dict.stage} error={dict.error} retry={dict.retry} /></View>;
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, padding: 20, gap: 12 }]}>
        <ErrorBanner message={error} onRetry={() => setTick((n) => n + 1)} />
        <Button testID="entry-error-back" label="Quay lại" icon="arrow-left" variant="ghost" onPress={goBack} />
      </View>
    );
  }
  if (loading || !entry) return <View style={{ flex: 1, padding: 20, backgroundColor: c.background }}><Skeleton h={90} /><Skeleton h={80} /><Skeleton h={80} /></View>;

  const header = (
    <View style={{ gap: 14, marginBottom: 6 }}>
      <View style={{ gap: 6 }}>
        <Text style={[styles.term, { color: c.foreground }]} selectable>{entry.term}</Text>
        {entry.pronunciations.length ? (
          <View style={styles.wrapRow}>
            {entry.pronunciations.map((p, i) => (
              <Text key={`${p.ipa}-${i}`} style={[styles.ipa, { color: c.accent }]} selectable>
                {p.region ? `${p.region.toUpperCase()} ` : ''}{p.ipa}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      {existing ? (
        <View testID="entry-existing" style={[styles.notice, { backgroundColor: c.secondary, borderRadius: c.radius }]}>
          <Text style={[styles.noticeTitle, { color: c.primary }]}>Đã có trong sổ{existing.frozen ? ' (đang đóng băng)' : ''}</Text>
          <Text style={[styles.small, { color: c.mutedForeground }]}>Trang hiện có được giữ nguyên, kể cả tiến độ ôn tập.</Text>
          <Button testID="entry-open-existing" label="Mở trang trong sổ" icon="book-open" variant="ghost"
            onPress={() => router.push({ pathname: '/word', params: { id: String(existing.id) } })} />
        </View>
      ) : (
        <Text style={[styles.small, { color: c.mutedForeground }]}>Chọn một nghĩa, rồi xem lại trước khi lưu vào sổ.</Text>
      )}
      <Text style={[styles.kicker, { color: c.mutedForeground }]}>Các nghĩa ({senses.length}{hasMore ? '+' : ''})</Text>
    </View>
  );

  const renderSense = ({ item, index }: { item: DictionarySense; index: number }) => {
    const on = selected === item.id;
    const kind = [item.pos, item.subPos].filter(Boolean).join(' · ');
    return (
      <Pressable testID={`entry-sense-${item.id}`} accessibilityRole="radio" accessibilityState={{ selected: on }}
        onPress={() => setSelected(item.id)}
        style={[styles.sense, { backgroundColor: c.card, borderColor: on ? c.primary : c.border, borderWidth: on ? 2 : 1, borderRadius: c.radius }]}>
        <View style={[styles.radio, { borderColor: on ? c.primary : c.border }]}>
          {on ? <View style={[styles.radioDot, { backgroundColor: c.primary }]} /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.wrapRow}>
            <Text style={[styles.num, { color: c.mutedForeground }]}>{index + 1}.</Text>
            {kind ? <Text style={[styles.pos, { color: c.accent }]}>{kind}</Text> : null}
          </View>
          <Text style={[styles.def, { color: c.foreground }]}>{item.definition}</Text>
          {item.example ? <Text style={[styles.example, { color: c.mutedForeground }]}>{item.example}</Text> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: entry.term }} />
      <FlatList
        testID="entry-senses"
        data={senses}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderSense}
        extraData={selected}
        ListHeaderComponent={header}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 10 }}
        ListEmptyComponent={<Text style={[styles.small, { color: c.mutedForeground }]}>Mục từ này chưa có nghĩa nào.</Text>}
        ListFooterComponent={
          <View style={{ gap: 12, marginTop: 4 }}>
            {moreError ? <ErrorBanner message={moreError} onRetry={loadMore} /> : null}
            {hasMore ? <Button testID="entry-load-more" label="Xem thêm nghĩa" variant="ghost" loading={loadingMore} onPress={loadMore} /> : null}
            <Pressable testID="entry-open-sources" onPress={() => router.push('/dictionary-sources')} style={styles.wrapRow} hitSlop={6}>
              <Feather name="info" size={14} color={c.primary} />
              <Text style={[styles.link, { color: c.primary }]}>Nguồn và giấy phép từ điển</Text>
            </Pressable>
          </View>
        }
      />
      {!existing ? (
        <View style={[styles.bar, { paddingBottom: bottomPad, borderTopColor: c.border, backgroundColor: c.background }]}>
          <Button testID="entry-add" label="Thêm vào sổ từ" icon="plus" variant="accent" disabled={selected === null}
            onPress={() => {
              if (selected === null) return;
              router.push({ pathname: '/word', params: { dictionaryWordId: String(entry.id), senseId: String(selected) } });
            }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  term: { fontFamily: F.b, fontSize: 32, letterSpacing: -0.6 },
  ipa: { fontFamily: F.m, fontSize: 15 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  notice: { padding: 14, gap: 6 },
  noticeTitle: { fontFamily: F.s, fontSize: 15 },
  small: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  kicker: { fontFamily: F.s, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 4 },
  sense: { flexDirection: 'row', gap: 12, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  num: { fontFamily: F.s, fontSize: 13 },
  pos: { fontFamily: F.s, fontSize: 13 },
  def: { fontFamily: F.m, fontSize: 16, lineHeight: 23 },
  example: { fontFamily: F.r, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  link: { fontFamily: F.s, fontSize: 14 },
  bar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
