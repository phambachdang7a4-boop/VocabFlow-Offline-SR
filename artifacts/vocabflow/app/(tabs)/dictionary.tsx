import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { normalizeTerm } from '@/data/vocabulary';
import { getRandomUnlearnedDictionaryWord, searchDictionary, suggestDictionary } from '@/data/dictionary';
import { type DictionaryMatch, type DictionarySuggestion } from '@/domain/dictionary';
import { DictionarySuggestions } from '@/components/DictionarySuggestions';
import { DictionaryGate } from '@/components/DictionaryGate';
import { DictionaryEntryView } from '@/components/DictionaryEntryView';
import { CorviBlinkingArtwork } from '@/components/CorviBlinkingArtwork';
import { useDictionary } from '@/hooks/useDictionary';
import { useColors } from '@/hooks/useColors';
import { Button, EmptyState, ErrorBanner, F, MaterialSheen } from '@/components/ui';
import { useBottomPad } from '@/components/ScreenHeader';
import { useReducedMotion } from 'react-native-reanimated';

const CORVI_GREETING = 'Xin chào cậu chủ, ngài muốn tìm từ vựng nào? Xin hãy bấm vào thanh tìm kiếm ở trên.';
const CORVI_CHAT_VARIANTS = [
  'Ta sẵn sàng tra nghĩa và phiên âm trong từ điển offline cho cậu chủ.',
  'Chỉ cần gõ vài chữ cái đầu vào ô phía trên, ta sẽ tìm giúp ngài.',
  'Muốn học từ trong một đoạn văn? Hãy chọn Mắt Quạ nhé.',
  'Tra được từ hay rồi thì lưu nghĩa vào Sổ từ để ôn lại sau nhé.',
  'Cậu chủ có thể mở Hướng dẫn sử dụng nếu muốn khám phá các mục trong app.',
  'Học một chút mỗi ngày sẽ giúp từ mới ở lại lâu hơn đó, thưa cậu chủ.',
  'Ta đang canh thư viện đây. Ngài muốn tìm từ nào cứ nhập ở thanh phía trên.',
  'Thư viện của ta vẫn mở, cậu chủ cứ chọn một lối học nhé.',
  'Từ mới thường bắt đầu bằng một câu hỏi nhỏ. Ta có thể dẫn đường.',
  'Ta luôn sẵn lòng giúp ngài tìm đúng công cụ học hôm nay.',
];
const CORVI_SEARCH_REMINDERS = [
  'Ngài hãy bấm vào thanh tìm kiếm, không phải vào tôi.',
  'Cậu chủ ơi, ô tìm kiếm ở ngay phía trên kìa!',
  'Muốn tra từ thì xin ngài gõ vào thanh tìm kiếm nhé.',
  'Tôi chỉ là quạ thôi ạ; thanh tìm kiếm mới giúp ngài tra từ.',
  'Xin đừng chạm lông tôi nữa, cậu chủ. Hãy dùng ô tìm kiếm phía trên nhé.',
  'Nếu đang tìm một từ, ngài hãy nhập từ ấy vào ô phía trên giúp tôi.',
  'Ta xin phép nhắc nhẹ: thanh tìm kiếm sẽ tra từ nhanh hơn, thưa cậu chủ.',
];

type CorviAction = 'search' | 'extract' | 'guide' | 'review' | 'recommend';
type CorviChoice = { action: CorviAction; label: string; icon: React.ComponentProps<typeof Feather>['name']; testID: string };

const CORVI_CHOICES: CorviChoice[] = [
  { action: 'extract', label: 'Trích từ trong đoạn văn', icon: 'eye', testID: 'dictionary-corvi-choice-extract' },
  { action: 'guide', label: 'Xem hướng dẫn', icon: 'book-open', testID: 'dictionary-corvi-choice-guide' },
  { action: 'review', label: 'Ôn từ đã lưu', icon: 'repeat', testID: 'dictionary-corvi-choice-review' },
  { action: 'search', label: 'Tra một từ', icon: 'search', testID: 'dictionary-corvi-choice-lookup' },
  { action: 'recommend', label: 'Gợi ý một từ mới', icon: 'bookmark', testID: 'dictionary-corvi-choice-recommend' },
];

const CORVI_REPLY_VARIANTS: Record<CorviAction, string[]> = {
  search: [
    'Rất sẵn lòng. Hãy nhập từ tiếng Anh vào thanh tìm kiếm, ta sẽ tra trong từ điển ngoại tuyến.',
    'Được chứ. Ngài gõ từ cần tra vào ô phía trên, ta sẽ tìm nghĩa và cách phát âm.',
    'Ta sẽ mở đường đến ô tìm kiếm. Một từ thôi cũng đủ cho buổi học hôm nay.',
  ],
  extract: [
    'Hay đấy, ta sẽ giúp ngài nhặt những từ có trong từ điển từ một đoạn văn.',
    'Mắt Quạ đã sẵn sàng. Ngài có thể dán văn bản hoặc chọn tệp TXT để bắt đầu.',
    'Ta sẽ đưa ngài đến Mắt Quạ; phần trích xuất vẫn hoạt động ngoại tuyến.',
  ],
  guide: [
    'Ta sẽ mở bản hướng dẫn ngắn để ngài dễ tìm đường quanh VocabFlow.',
    'Để ta chỉ ngài từng khu vực trong thư viện học tập này.',
    'Vâng, đây là phần hướng dẫn các mục học và cách dùng chúng.',
  ],
  review: [
    'Ta sẽ đưa ngài đến Ôn tập để gặp lại những từ đã lưu.',
    'Đến giờ xem lại từ cũ rồi. Ta sẽ mở lịch ôn của ngài.',
    'Ôn lại một chút sẽ giúp từ vựng ở lại lâu hơn. Mời ngài sang Ôn tập.',
  ],
  recommend: [
    'Ta sẽ chọn một từ trong từ điển mà ngài chưa lưu. Ngài có thể xem nghĩa rồi quyết định có học từ ấy không.',
    'Rất sẵn lòng. Ta sẽ tìm một từ mới trong kho offline để cậu chủ khám phá.',
    'Để ta chọn một từ ngài chưa lưu, rồi mình cùng xem cách dùng của nó nhé.',
  ],
};

function pickDifferentLine(lines: string[], previousLine: string) {
  const choices = lines.filter((line) => line !== previousLine);
  return choices[Math.floor(Math.random() * choices.length)] ?? lines[0];
}

export default function DictionaryScreen() {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const corviArt = c.dictPage === '#FBF7EE'
    ? require('../../assets/images/corvi-dictionary-search-light.png')
    : require('../../assets/images/corvi-dictionary-search.png');
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
  const [suggestions, setSuggestions] = useState<DictionarySuggestion[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [corviConversationOpen, setCorviConversationOpen] = useState(false);
  const [corviPendingAction, setCorviPendingAction] = useState<CorviAction | null>(null);
  const [corviTypingComplete, setCorviTypingComplete] = useState(false);
  const [corviRecommendationLoading, setCorviRecommendationLoading] = useState(false);
  const [corviRecommendationError, setCorviRecommendationError] = useState<string | null>(null);
  const [corviSuggestedEntry, setCorviSuggestedEntry] = useState(false);
  const corviTapCount = useRef(0);
  const lastCorviLine = useRef(CORVI_GREETING);
  const [corviDialogue, setCorviDialogue] = useState(CORVI_GREETING);
  const [typedCorviDialogue, setTypedCorviDialogue] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const reqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    const letters = Array.from(corviDialogue);
    let visibleCount = 0;
    setTypedCorviDialogue('');
    setCorviTypingComplete(false);
    if (reduceMotion) {
      setTypedCorviDialogue(corviDialogue);
      setCorviTypingComplete(true);
      return;
    }
    const timer = setInterval(() => {
      visibleCount += 1;
      setTypedCorviDialogue(letters.slice(0, visibleCount).join(''));
      if (visibleCount >= letters.length) {
        clearInterval(timer);
        setCorviTypingComplete(true);
      }
    }, 28);
    return () => clearInterval(timer);
  }, [corviDialogue, reduceMotion]);

  const showCorviLine = (line: string) => {
    lastCorviLine.current = line;
    setCorviDialogue(line);
  };

  const talkToCorvi = () => {
    corviTapCount.current += 1;
    if (corviTapCount.current > 3) {
      setCorviConversationOpen(false);
      setCorviPendingAction('search');
      showCorviLine(pickDifferentLine(CORVI_SEARCH_REMINDERS, lastCorviLine.current));
      return;
    }
    setCorviPendingAction(null);
    setCorviConversationOpen(true);
    showCorviLine(pickDifferentLine(CORVI_CHAT_VARIANTS, lastCorviLine.current));
  };

  const chooseCorviReply = (action: CorviAction) => {
    setCorviConversationOpen(false);
    setCorviPendingAction(action);
    setCorviRecommendationError(null);
    showCorviLine(pickDifferentLine(CORVI_REPLY_VARIANTS[action], lastCorviLine.current));
  };

  const followCorviAction = async () => {
    const action = corviPendingAction;
    setCorviPendingAction(null);
    setCorviConversationOpen(false);
    if (action === 'search') {
      inputRef.current?.focus();
    } else if (action === 'extract') {
      router.push('/extract');
    } else if (action === 'guide') {
      setGuideOpen(true);
    } else if (action === 'review') {
      router.push('/review');
    } else if (action === 'recommend') {
      setCorviRecommendationLoading(true);
      setCorviRecommendationError(null);
      try {
        const recommendation = await getRandomUnlearnedDictionaryWord(new Set(saved.keys()));
        if (!recommendation) {
          setCorviConversationOpen(true);
          showCorviLine('Ta chưa tìm thấy từ nào ngoài những từ ngài đã lưu. Có lẽ ngài đã khám phá gần hết thư viện rồi!');
          return;
        }
        setCorviSuggestedEntry(true);
        setOpenId(recommendation.id);
      } catch (failure) {
        setCorviRecommendationError(failure instanceof Error ? failure.message : 'Corvi chưa thể chọn từ lúc này.');
        setCorviConversationOpen(true);
        showCorviLine('Ta xin lỗi, hiện chưa mở được một từ mới. Ngài có thể thử lại sau nhé.');
      } finally {
        setCorviRecommendationLoading(false);
      }
    }
  };

  // Badge counts saved meanings per headword; it never blocks opening an entry.
  const saved = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of words) { const k = normalizeTerm(w.term); counts.set(k, (counts.get(k) ?? 0) + 1); }
    return counts;
  }, [words]);

  useEffect(() => () => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    reqRef.current += 1;
  }, []);

  useEffect(() => {
    const id = ++reqRef.current;
    setError(null);
    setLoadingMore(false);
    setSuggestions([]);
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
        if (r.items.length === 0) {
          // Typo help only after an empty first page; loading stays on until done.
          return suggestDictionary(debounced).then(
            (s) => { if (reqRef.current === id) setSuggestions(s); },
          );
        }
      },
    ).catch(e => {
      if (reqRef.current !== id) return;
      setItems([]); setSuggestions([]); setHasMore(false);
      setError(e instanceof Error ? e.message : 'Không thể tra cứu hoặc gợi ý từ.');
    }).finally(() => { if (reqRef.current === id) setLoading(false); });
  }, [lookup, dict.ready, retryTick]);

  const onChange = (v: string) => {
    // Invalidate immediately, not 250 ms later: an older exact-match response
    // must not reopen a word after the user has started typing something else.
    reqRef.current += 1;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    setQ(v); setOpenId(null); setItems([]); setSuggestions([]); setHasMore(false);
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
    setOpenId(null); setItems([]); setSuggestions([]); setLoading(true);
    // One effect owns both typed and submitted searches, so submit cannot race
    // a second debounce-triggered request and lose its exact-match action.
    setLookup({ term, openExact: true });
  };

  const pickSuggestion = (s: DictionarySuggestion) => {
    Keyboard.dismiss();
    reqRef.current += 1;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setQ(s.term); setSuggestions([]); setItems([]); setHasMore(false);
    setError(null); setLoadingMore(false); setLoading(true);
    setOpenId(s.id);
    // Refresh the list for the corrected term behind the inline entry so Back is right.
    setLookup({ term: s.term, openExact: false });
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
    const savedMeanings = saved.get(normalizeTerm(item.term)) ?? 0;
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
            {savedMeanings > 0 ? (
              <View style={[styles.pill, { backgroundColor: c.dictChip }]}>
                <Text style={[styles.pillText, { color: c.dictHead }]}>Đã lưu {savedMeanings} nghĩa</Text>
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
    <DictionaryEntryView key={openId} id={openId} bottomPad={bottom}
      backLabel={corviSuggestedEntry ? 'Về cuộc trò chuyện' : 'Kết quả tra cứu'}
      onBack={() => {
        setOpenId(null);
        if (corviSuggestedEntry) setCorviConversationOpen(true);
        setCorviSuggestedEntry(false);
      }} />
  );
  else if (!debounced) body = (
    <ScrollView
      testID="dictionary-search-idle-scroll"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom }}
    >
      <View testID="dictionary-search-idle" style={styles.idleState}>
        <Pressable
          testID="dictionary-corvi-talk"
          accessibilityRole="button"
          accessibilityLabel="Trò chuyện với Mr. Corvi"
          onPress={talkToCorvi}
          style={({ pressed }) => [styles.corviTouchable, { opacity: pressed ? 0.82 : 1 }]}
        >
          <CorviBlinkingArtwork
            testID="dictionary-corvi-idle-art"
            source={corviArt}
            artSize={210}
            style={styles.idleArt}
            gazeToUser={corviConversationOpen}
          />
        </Pressable>
        <View testID="dictionary-corvi-dialogue-wrap" style={styles.dialogueWrap}>
          <View style={[styles.dialogueBubble, { backgroundColor: c.dictChip, borderColor: c.dictLine }]}>
            <Text style={[styles.dialogueName, { color: c.dictHead }]}>Mr. Corvi</Text>
            <Text
              testID="dictionary-corvi-dialogue"
              accessibilityLabel={corviDialogue}
              accessibilityLiveRegion="polite"
              style={[styles.dialogueCopy, { color: c.dictInk }]}
            >
              {typedCorviDialogue}
            </Text>
          </View>
          <View style={[styles.dialogueTail, { borderTopColor: c.dictChip }]} />
        </View>
        {corviRecommendationLoading ? (
          <View testID="dictionary-corvi-recommend-loading" style={styles.recommendLoading}>
            <ActivityIndicator size="small" color={c.dictHead} />
            <Text style={[styles.talkHint, { color: c.dictMuted }]}>Corvi đang tìm một từ mới trong từ điển offline…</Text>
          </View>
        ) : corviConversationOpen ? (
          <View testID="dictionary-corvi-options" style={styles.corviOptions}>
            <Text style={[styles.choicePrompt, { color: c.dictMuted }]}>Ngài muốn làm gì tiếp theo?</Text>
            <View style={styles.choiceGrid}>
              {CORVI_CHOICES.map((choice) => (
                <Pressable
                  key={choice.testID}
                  testID={choice.testID}
                  accessibilityRole="button"
                  onPress={() => chooseCorviReply(choice.action)}
                  style={({ pressed }) => [
                    styles.corviChoice,
                    { backgroundColor: pressed ? c.dictChip : c.dictPage, borderColor: c.dictLine },
                  ]}
                >
                  <Feather name={choice.icon} size={16} color={c.dictHead} />
                  <Text style={[styles.corviChoiceText, { color: c.dictHead }]}>{choice.label}</Text>
                </Pressable>
              ))}
            </View>
            {corviRecommendationError ? (
              <Text testID="dictionary-corvi-recommend-error" style={[styles.talkHint, { color: c.destructive }]}>
                {corviRecommendationError}
              </Text>
            ) : null}
          </View>
        ) : corviPendingAction && corviTypingComplete ? (
          <Button
            testID={corviPendingAction === 'extract'
              ? 'dictionary-open-extract'
              : `dictionary-corvi-action-${corviPendingAction}`}
            label={corviPendingAction === 'search' ? 'Tìm từ ngay' :
              corviPendingAction === 'extract' ? 'Mở Mắt Quạ' :
                corviPendingAction === 'guide' ? 'Mở hướng dẫn' :
                  corviPendingAction === 'recommend' ? 'Gợi ý một từ' : 'Mở Ôn tập'}
            icon={corviPendingAction === 'search' ? 'search' :
              corviPendingAction === 'extract' ? 'eye' :
                corviPendingAction === 'guide' ? 'book-open' :
                  corviPendingAction === 'recommend' ? 'bookmark' : 'repeat'}
            onPress={followCorviAction}
            style={styles.corviActionButton}
          />
        ) : (
          <Text style={[styles.talkHint, { color: c.dictMuted }]}>
            {corviPendingAction ? 'Corvi đang hồi âm...' : 'Chạm vào Corvi để mở các lựa chọn'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
  else if (loading && items.length === 0) body = (
    <ScrollView
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom }}
    >
      <View testID="dictionary-search-loading" accessibilityLiveRegion="polite" style={styles.loadingState}>
        <CorviBlinkingArtwork
          testID="dictionary-corvi-search-art"
          source={corviArt}
          artSize={236}
          style={styles.loadingArt}
        />
        <Text style={[styles.loadingTitle, { color: c.dictHead }]}>Corvi đang tìm từ cho bạn</Text>
        <Text style={[styles.loadingBody, { color: c.dictMuted }]}>
          Chờ một chút nhé, Corvi đang tra trong từ điển ngoại tuyến.
        </Text>
        <ActivityIndicator accessibilityLabel="Đang tìm từ" size="small" color={c.dictHead} />
      </View>
    </ScrollView>
  );
  else if (error && items.length === 0) body = (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} onRetry={() => setRetryTick((n) => n + 1)} />
    </ScrollView>
  );
  else if (items.length === 0 && suggestions.length > 0) body = (
    <DictionarySuggestions items={suggestions} onPick={pickSuggestion} bottomPad={bottom}
      onAddManual={() => router.push('/word')} />
  );
  else if (items.length === 0) body = (
    <ScrollView
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom }}
    >
      <EmptyState icon="feather" title="Không có mục từ phù hợp" body={`Không tìm thấy từ bắt đầu bằng “${debounced}”. Bạn vẫn có thể tự ghi từ này vào sổ.`}>
        <Button testID="dictionary-add-manual" label="Tự ghi từ mới" icon="edit-3" variant="ghost" onPress={() => router.push('/word')} />
      </EmptyState>
    </ScrollView>
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
      <View style={[styles.band, {
        backgroundColor: c.dictBand,
        paddingTop: top + 10,
        shadowColor: c.shade,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 4,
      }]}>
        <MaterialSheen tone="navy" radius={0} />
        <View style={[styles.search, {
          backgroundColor: c.dictField,
          borderRadius: c.radius,
          borderColor: c.border,
          opacity: dict.ready ? 1 : 0.6,
          shadowColor: c.shade,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.14,
          shadowRadius: 6,
          elevation: 3,
        }]}>
          <MaterialSheen radius={c.radius} />
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
            style={[styles.searchInput, { color: c.dictFieldInk }]}
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
          <Pressable testID="dictionary-open-sources" accessibilityLabel="Nguồn từ điển" onPress={() => router.push('/dictionary-sources')}
            hitSlop={8} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Feather name="info" size={20} color={c.dictMuted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: c.dictLine }]} />
          <Pressable testID="dictionary-submit" accessibilityRole="button" accessibilityLabel="Tra ngay" onPress={submit}
            disabled={!dict.ready || !q.trim()} hitSlop={6}
            style={({ pressed }) => [styles.go, { opacity: pressed ? 0.6 : (!dict.ready || !q.trim()) ? 0.4 : 1 }]}>
            <Feather name="search" size={22} color={c.dictHead} />
          </Pressable>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: c.dictPage }}>{body}</View>
      <Modal
        testID="dictionary-guide-modal"
        visible={guideOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideOpen(false)}
      >
        <Pressable
          style={[styles.guideOverlay, { backgroundColor: c.overlay, paddingTop: top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={() => setGuideOpen(false)}
        >
          <Pressable
            accessibilityRole="none"
            onPress={() => {}}
            style={[styles.guideCard, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 6 }]}
          >
            <View style={styles.guideHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.guideEyebrow, { color: c.primary }]}>CORVI GIỚI THIỆU</Text>
                <Text style={[styles.guideTitle, { color: c.foreground }]}>Hướng dẫn nhanh</Text>
              </View>
              <Pressable
                testID="dictionary-guide-close"
                accessibilityRole="button"
                accessibilityLabel="Đóng hướng dẫn"
                onPress={() => setGuideOpen(false)}
                hitSlop={10}
                style={styles.guideClose}
              >
                <Feather name="x" size={22} color={c.foreground} />
              </Pressable>
            </View>
            <ScrollView
              testID="dictionary-guide-content"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.guideSections}
            >
              {[
                ['Thư Viện', 'Tra từ tiếng Anh trong từ điển offline, xem nghĩa, phiên âm và ví dụ. Chọn nghĩa muốn học để lưu vào Sổ từ.'],
                ['Khóa học', 'Chọn một khóa và học lần lượt từng bài; tiến độ được lưu trên thiết bị.'],
                ['Ôn tập', 'Ôn các từ đến hạn theo lịch lặp lại ngắt quãng. Trả lời xong sẽ xem kết quả và tiếp tục bài ôn.'],
                ['Sổ từ', 'Tìm, lọc và xem những nghĩa bạn đã lưu để học; có thể quản lý từng từ ngay tại đây.'],
                ['Nhiệm Vụ', 'Hoàn thành mục tiêu trong ngày để nhận lượt mở rương; mảnh tranh được xem trong Bộ Sưu Tập.'],
                ['Mắt Quạ', 'Dán văn bản hoặc chọn tệp TXT để trích từ có trong từ điển offline. Nội dung nguồn không được dùng làm câu ví dụ.'],
              ].map(([title, description]) => (
                <View key={title} style={[styles.guideSection, { borderBottomColor: c.border }]}>
                  <Text style={[styles.guideSectionTitle, { color: c.foreground }]}>{title}</Text>
                  <Text style={[styles.guideSectionBody, { color: c.mutedForeground }]}>{description}</Text>
                </View>
              ))}
            </ScrollView>
            <Button
              testID="dictionary-guide-done"
              label="Đã hiểu"
              onPress={() => setGuideOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  band: { position: 'relative', paddingHorizontal: 16, paddingBottom: 14 },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  search: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, minHeight: 54, borderWidth: 1 },
  searchInput: { flex: 1, minWidth: 0, width: 0, fontFamily: F.m, fontSize: 18, paddingVertical: 12 },
  idleState: { flexGrow: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  corviTouchable: { width: 210, height: 210, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' },
  idleArt: { width: 210, height: 210, maxWidth: '100%' },
  corviOptions: { width: '100%', maxWidth: 360, gap: 8, marginTop: 2 },
  recommendLoading: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  choicePrompt: { fontFamily: F.m, fontSize: 12, textAlign: 'center' },
  choiceGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  corviChoice: { width: '48%', minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  corviChoiceText: { flexShrink: 1, fontFamily: F.s, fontSize: 12, textAlign: 'center' },
  corviActionButton: { width: '100%', maxWidth: 320, minHeight: 48, marginTop: 2 },
  dialogueWrap: { width: '100%', maxWidth: 360, alignItems: 'center' },
  dialogueBubble: { width: '100%', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 5 },
  dialogueTail: { width: 0, height: 0, borderTopWidth: 9, borderLeftWidth: 9, borderRightWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  dialogueName: { fontFamily: F.s, fontSize: 12, letterSpacing: 0.3, textAlign: 'center' },
  dialogueCopy: { fontFamily: F.r, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  talkHint: { fontFamily: F.m, fontSize: 13, textAlign: 'center', marginTop: -2 },
  loadingState: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 10 },
  loadingArt: { width: 236, height: 236, maxWidth: '100%' },
  loadingTitle: { fontFamily: F.b, fontSize: 19, textAlign: 'center' },
  loadingBody: { maxWidth: 300, fontFamily: F.r, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 2 },
  guideOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  guideCard: { width: '100%', maxWidth: 480, maxHeight: '88%', alignSelf: 'center', borderWidth: 1, padding: 18, gap: 14 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideEyebrow: { fontFamily: F.s, fontSize: 11, letterSpacing: 1.4, marginBottom: 3 },
  guideTitle: { fontFamily: F.b, fontSize: 23 },
  guideClose: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  guideSections: { paddingBottom: 6 },
  guideSection: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  guideSectionTitle: { fontFamily: F.s, fontSize: 15, marginBottom: 4 },
  guideSectionBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 10 },
  go: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  term: { fontFamily: F.b, fontSize: 18, flexShrink: 1 },
  meaning: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontFamily: F.s, fontSize: 11 },
});
