import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { normalizeTerm } from '@/data/vocabulary';
import { getDictionaryEntry } from '@/data/dictionary';
import { exampleSegments, type DictionaryEntry, type DictionarySense } from '@/domain/dictionary';
import { useColors } from '@/hooks/useColors';
import { Button, ErrorBanner, F, Skeleton } from '@/components/ui';

/** Shared reading view for one dictionary entry. Caller guarantees a valid id and a ready dictionary. */
export function DictionaryEntryView({ id, bottomPad, onBack, backLabel = 'Quay lại' }: {
  id: number; bottomPad: number; onBack: () => void; backLabel?: string;
}) {
  const c = useColors();
  const { words } = useVocabulary();
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [senses, setSenses] = useState<DictionarySense[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reqRef = useRef(0);

  useEffect(() => {
    const rid = ++reqRef.current;
    setLoading(true); setError(null); setMoreError(null); setEntry(null); setSenses([]); setHasMore(false); setLoadingMore(false);
    getDictionaryEntry(id, 0).then(
      (e) => { if (reqRef.current === rid) { setEntry(e); setSenses(e.senses); setHasMore(e.hasMore); } },
      (e) => { if (reqRef.current === rid) setError(e instanceof Error ? e.message : 'Không thể mở mục từ.'); },
    ).finally(() => { if (reqRef.current === rid) setLoading(false); });
    return () => { reqRef.current += 1; };
  }, [id, tick]);

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

  const backRow = (
    <Pressable testID="entry-back" accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} hitSlop={8}
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name="arrow-left" size={16} color={c.dictHead} />
      <Text style={[styles.backText, { color: c.dictHead }]}>{backLabel}</Text>
    </Pressable>
  );

  if (error) {
    return (
      <ScrollView style={{ backgroundColor: c.dictPage }} contentContainerStyle={{ padding: 20, paddingBottom: bottomPad, gap: 12 }}>
        {backRow}<ErrorBanner message={error} onRetry={() => setTick((n) => n + 1)} />
      </ScrollView>
    );
  }
  if (loading || !entry) {
    return <View style={{ flex: 1, padding: 20, backgroundColor: c.dictPage }}><Skeleton h={90} /><Skeleton h={80} /><Skeleton h={80} /></View>;
  }

  const openExisting = () => { if (existing) router.push({ pathname: '/word', params: { id: String(existing.id) } }); };

  const header = (
    <View style={{ gap: 14, marginBottom: 8 }}>
      {backRow}
      <View style={{ gap: 10 }}>
        <Text style={[styles.term, { color: c.dictHead }]} selectable>{entry.term}</Text>
        {entry.pronunciations.map((p, i) => (
          <View key={`${p.ipa}-${i}`} style={styles.ipaRow}>
            {p.region ? <Text style={[styles.region, { color: c.dictMuted }]}>{p.region.toUpperCase()}</Text> : null}
            <Text style={[styles.ipa, { color: c.dictInk }]} selectable>{p.ipa}</Text>
          </View>
        ))}
      </View>
      {existing ? (
        <View testID="entry-existing" style={[styles.notice, { backgroundColor: c.dictChip, borderRadius: c.radius }]}>
          <Text style={[styles.noticeTitle, { color: c.dictHead }]}>Đã có trong sổ{existing.frozen ? ' (đang đóng băng)' : ''}</Text>
          <Text style={[styles.small, { color: c.dictMuted }]}>Trang hiện có được giữ nguyên, kể cả tiến độ ôn tập.</Text>
          <Button testID="entry-open-existing" label="Mở trang trong sổ" icon="book-open" variant="ghost" onPress={openExisting} />
        </View>
      ) : (
        <Text style={[styles.small, { color: c.dictMuted }]}>Bấm Lưu từ ở nghĩa bạn muốn học, rồi xem lại trước khi ghi vào sổ.</Text>
      )}
      <View style={[styles.rule, { backgroundColor: c.dictLine }]} />
    </View>
  );

  const renderSense = ({ item, index }: { item: DictionarySense; index: number }) => {
    const kind = [item.pos, item.subPos].filter(Boolean).join(' · ');
    return (
      <View testID={`entry-sense-${item.id}`} style={[styles.sense, { borderBottomColor: c.dictLine }]}>
        <View style={styles.senseTop}>
          <Text style={[styles.num, { color: c.dictInk }]}>{index + 1}.</Text>
          <View style={{ flex: 1, gap: 6 }}>
            {kind ? (
              <View style={[styles.kind, { backgroundColor: c.dictChip }]}>
                <Text style={[styles.kindText, { color: c.dictHead }]}>{kind}</Text>
              </View>
            ) : null}
            <Text style={[styles.def, { color: c.dictHead }]} selectable>{item.definition}</Text>
          </View>
          <Pressable testID={existing ? `entry-sense-open-${item.id}` : `entry-add-${item.id}`} accessibilityRole="button"
            accessibilityLabel={existing ? `Mở ${entry.term} trong sổ` : `Lưu nghĩa ${index + 1} vào sổ`}
            onPress={() => {
              if (existing) { openExisting(); return; }
              router.push({ pathname: '/word', params: { dictionaryWordId: String(entry.id), senseId: String(item.id) } });
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.add, existing
              ? { backgroundColor: c.dictChip, opacity: pressed ? 0.7 : 1 }
              : { backgroundColor: pressed ? c.dictAddPressed : c.dictAdd }]}>
            <Feather name={existing ? 'book-open' : 'plus-circle'} size={16} color={existing ? c.dictHead : c.dictAddInk} />
            <Text style={[styles.addText, { color: existing ? c.dictHead : c.dictAddInk }]}>{existing ? 'Trong sổ' : 'Lưu từ'}</Text>
          </Pressable>
        </View>
        {item.example ? (
          <View style={styles.exRow}>
            <View style={[styles.bullet, { backgroundColor: c.dictInk }]} />
            <Text style={[styles.example, { color: c.dictInk }]} selectable>
              {exampleSegments(item.example, entry.term).map((part, index) => (
                <Text key={index} style={part.underline ? styles.exampleHeadword : undefined}>{part.text}</Text>
              ))}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      testID="entry-senses"
      style={{ backgroundColor: c.dictPage }}
      data={senses}
      keyExtractor={(s) => String(s.id)}
      renderItem={renderSense}
      extraData={existing}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReachedThreshold={0.4}
      onEndReached={loadMore}
      contentContainerStyle={{ padding: 20, paddingBottom: bottomPad }}
      ListEmptyComponent={<Text style={[styles.small, { color: c.dictMuted }]}>Mục từ này chưa có nghĩa nào.</Text>}
      ListFooterComponent={
        <View style={{ gap: 12, marginTop: 16 }}>
          {moreError ? <ErrorBanner message={moreError} onRetry={loadMore} /> : null}
          {hasMore ? <Button testID="entry-load-more" label="Xem thêm nghĩa" variant="ghost" loading={loadingMore} onPress={loadMore} /> : null}
          <Pressable testID="entry-open-sources" onPress={() => router.push('/dictionary-sources')} style={styles.ipaRow} hitSlop={6}>
            <Feather name="info" size={14} color={c.dictHead} />
            <Text style={[styles.link, { color: c.dictHead }]}>Nguồn và giấy phép từ điển</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
  backText: { fontFamily: F.s, fontSize: 14 },
  term: { fontFamily: F.b, fontSize: 36, letterSpacing: -0.8 },
  ipaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  region: { fontFamily: F.s, fontSize: 12, letterSpacing: 1, minWidth: 36 },
  ipa: { fontFamily: F.m, fontSize: 16 },
  notice: { padding: 14, gap: 6 },
  noticeTitle: { fontFamily: F.s, fontSize: 15 },
  small: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  rule: { height: 1, marginTop: 4 },
  sense: { paddingVertical: 18, gap: 12, borderBottomWidth: 1 },
  senseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  num: { fontFamily: F.b, fontSize: 17, lineHeight: 25 },
  kind: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  kindText: { fontFamily: F.s, fontSize: 12 },
  def: { fontFamily: F.s, fontSize: 17, lineHeight: 25 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 18 },
  addText: { fontFamily: F.s, fontSize: 13 },
  exRow: { flexDirection: 'row', gap: 10, paddingLeft: 26, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
  example: { flex: 1, fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  exampleHeadword: { textDecorationLine: 'underline' },
  link: { fontFamily: F.s, fontSize: 14 },
});
