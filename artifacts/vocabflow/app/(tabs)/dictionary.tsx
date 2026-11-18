import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { normalizeTerm } from '@/data/vocabulary';
import { getRandomUnlearnedDictionaryWord, searchDictionary, suggestDictionary } from '@/data/dictionary';
import { COURSE_DICTIONARY_COURSES } from '@/domain/course-ids';
import {
  DICTIONARY_PARTS,
  type DictionaryMatch,
  type DictionaryPartOfSpeech,
  type DictionarySuggestion,
} from '@/domain/dictionary';
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
type CorviAction = 'search' | 'extract' | 'guide' | 'review' | 'recommend';
type CorviChoice = { action: CorviAction; label: string; icon: React.ComponentProps<typeof Feather>['name']; testID: string };

const CORVI_CHOICES: CorviChoice[] = [
  { action: 'extract', label: 'Trích từ trong đoạn văn', icon: 'eye', testID: 'dictionary-corvi-choice-extract' },
  { action: 'guide', label: 'Xem hướng dẫn', icon: 'book-open', testID: 'dictionary-corvi-choice-guide' },
  { action: 'review', label: 'Ôn từ đã lưu', icon: 'repeat', testID: 'dictionary-corvi-choice-review' },
  { action: 'search', label: 'Tra một từ', icon: 'search', testID: 'dictionary-corvi-choice-lookup' },
  { action: 'recommend', label: 'Gợi ý một từ mới', icon: 'bookmark', testID: 'dictionary-corvi-choice-recommend' },
];

const GUIDE_PAGES = [
  {
    eyebrow: 'BẮT ĐẦU',
    title: 'Học theo nhịp của bạn',
    intro: 'VocabFlow kết hợp tra từ, học theo chủ đề và ôn lại từ đã lưu. Sau khi cài tài nguyên, bạn có thể học ngoại tuyến.',
    sections: [
      ['Bắt đầu bằng ngữ cảnh', 'Đọc một câu hoặc đoạn ngắn, đánh dấu từ chưa biết và thử đoán nghĩa trước khi tra.'],
      ['Học vừa sức', 'Chọn vài từ hữu ích, lưu đúng nghĩa rồi quay lại tự nhớ trong những lượt ôn sau.'],
    ],
  },
  {
    eyebrow: 'NĂM Ô Ở THANH DƯỚI',
    title: 'Mỗi ô có một nhiệm vụ',
    intro: 'Các mục bổ trợ cho nhau; bạn có thể chuyển qua lại mà không cần học theo một lộ trình cứng.',
    sections: [
      ['Thư Viện', 'Tra từ Anh–Việt, xem nghĩa, phiên âm và ví dụ; chọn nghĩa phù hợp rồi lưu vào Sổ từ.'],
      ['Khóa học', 'Học theo chủ đề và bài học. Khóa Idioms luyện thành ngữ bằng câu thoại có chỗ trống.'],
      ['Ôn tập', 'Tự nhớ từ đã đến hạn. Câu trả lời đúng hoặc sai sẽ cập nhật cấp ôn theo lịch của app.'],
      ['Sổ từ', 'Tìm từ đã lưu, lọc theo cấp ôn, đóng băng để tạm ẩn khỏi lượt ôn hoặc xóa từ không cần nữa.'],
      ['Nhiệm Vụ', 'Theo dõi mục tiêu trong ngày, mở rương nhận thưởng và xem mảnh tượng trong Bộ Sưu Tập.'],
      ['Corvi', 'Chạm vào quản gia trong Thư Viện để mở màn hình trợ lý, rồi chọn tra từ, dùng Mắt Quạ, ôn tập, xin gợi ý từ mới hoặc đọc hướng dẫn.'],
    ],
  },
  {
    eyebrow: 'ĐỌC, ĐOÁN, TRA TỪ',
    title: 'Học từ trong ngữ cảnh',
    intro: 'Đọc đoạn ngắn: “After class, Mina missed the last bus. She walked home beneath the streetlights, carrying a book from the library.”',
    sections: [
      ['1 · Đọc và đoán', 'Mina đi bộ về nhà beneath the streetlights. Dựa vào cảnh này, thử đoán beneath có nghĩa là “ở dưới”.'],
      ['2 · Tra trong Thư Viện', 'Tìm beneath, đọc các nghĩa và ví dụ, rồi chọn nghĩa phù hợp với câu đang đọc.'],
      ['3 · Dùng Mắt Quạ', 'Dán văn bản hoặc chọn tệp TXT để trích những từ có trong từ điển offline. Mắt Quạ không dịch cả câu.'],
      ['4 · Lưu và gặp lại', 'Lưu nghĩa bạn chọn vào Sổ từ. Mở Ôn tập khi từ đến hạn để tự nhớ lại thay vì chỉ đọc lại đáp án.'],
    ],
  },
  {
    eyebrow: 'CÁCH ÔN CỦA VOCABFLOW',
    title: 'Lặp lại ngắt quãng',
    intro: 'Thay vì xem lại mọi từ mỗi ngày, bạn tự nhớ lại từ sau những khoảng cách tăng dần. Việc cố gắng nhớ trước khi xem đáp án giúp nhận ra từ nào cần ôn thêm.',
    sections: [
      ['Các mốc ôn', 'Lịch có các mốc 0, 1, 3, 7, 14 và 30 ngày tính từ lần ôn đầu tiên. Từ mới có thể được ôn ngay; nếu đã lỡ mốc, app hẹn lại vào ngày mai.'],
      ['Khi trả lời đúng', 'Từ lên một cấp và được hẹn ở mốc tiếp theo. Trả lời đúng ở cấp 6 sẽ hoàn tất lịch ôn của từ đó.'],
      ['Khi trả lời sai', 'Từ lùi một cấp, không xuống dưới cấp 1, rồi được hẹn ôn lại vào ngày mai. Sai là tín hiệu để gặp lại từ sớm hơn, không phải hình phạt.'],
    ],
  },
  {
    eyebrow: 'DỮ LIỆU CỦA BẠN',
    title: 'Lưu, sao lưu và đồng bộ',
    intro: 'Sau khi cài từ điển, bạn có thể học ngoại tuyến mà không cần tài khoản. Sổ từ và tiến độ được lưu trên thiết bị; đồng bộ tài khoản là tùy chọn.',
    sections: [
      ['Dữ liệu học', 'Từ đã lưu, cấp ôn, trạng thái đóng băng, thống kê và phần thưởng nằm trong dữ liệu ứng dụng trên máy. Đăng xuất không tự xóa dữ liệu cục bộ.'],
      ['Sao lưu và khôi phục', 'Trong Cài đặt, xuất/chia sẻ tệp JSON để giữ bản sao. Nhập tệp sẽ thay thế dữ liệu học hiện tại; hãy xuất bản sao trước. Tệp sao lưu không gồm từ điển hay audio offline.'],
      ['Đồng bộ tùy chọn', 'Khi đăng nhập và có mạng, sổ từ cùng tiến độ có thể đồng bộ với tài khoản để dùng trên thiết bị khác.'],
      ['Tài nguyên và đặt lại', 'Cài đặt quản lý tải/xóa từ điển, IPA và audio offline. Đặt lại sẽ xóa dữ liệu trên máy và cloud cùng tài nguyên offline; cần mạng, không thể hoàn tác.'],
    ],
  },
  {
    eyebrow: 'XÂY VỐN TỪ',
    title: 'Vì sao cần nhiều từ?',
    intro: 'Vốn từ rộng giúp bạn hiểu nhiều chủ đề hơn khi đọc, nghe và giao tiếp; nhưng học nhiều từ cùng lúc không phải mục tiêu.',
    sections: [
      ['Hiểu được nhiều ngữ cảnh', 'Từ quen thuộc giúp nắm ý chính, nhận ra chi tiết và suy đoán từ mới từ câu xung quanh — hữu ích trong học tập, công việc và các kỳ thi.'],
      ['Học chất lượng trước số lượng', 'Ưu tiên từ thường gặp và từ theo mục tiêu của bạn. Học nghĩa trong câu, cách dùng và ví dụ; chỉ lưu nghĩa phù hợp với ngữ cảnh.'],
      ['Một nhịp học dễ duy trì', 'Mỗi ngày đọc một đoạn, chọn vài từ thật sự cần, rồi hoàn thành lượt Ôn tập đến hạn. Tự đặt câu hoặc dùng từ khi nói/viết để chuyển từ nhận biết sang sử dụng.'],
    ],
  },
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
  const { width: windowWidth } = useWindowDimensions();
  const compactCorvi = windowWidth < 370;
  const corviArtSize = windowWidth < 420 ? (compactCorvi ? 160 : 180) : 220;
  const corviAssistantArtSize = windowWidth < 370 ? 140 : windowWidth < 420 ? 156 : 188;
  const reduceMotion = useReducedMotion();
  const corviBackgroundArt = c.dictPage === '#FBF7EE'
    ? require('../../assets/images/corvi-dictionary-background-light.png')
    : require('../../assets/images/corvi-dictionary-background.png');
  const corviArt = require('../../assets/images/corvi-dictionary-character-alpha.png');
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  const bottom = useBottomPad();
  const dict = useDictionary();
  const { words } = useVocabulary();
  const [q, setQ] = useState('');
  const [lookup, setLookup] = useState({ term: '', openExact: false });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState<DictionaryPartOfSpeech | null>(null);
  const [partFilterOpen, setPartFilterOpen] = useState(false);
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
  const lastCorviLine = useRef(CORVI_GREETING);
  const [corviDialogue, setCorviDialogue] = useState(CORVI_GREETING);
  const [typedCorviDialogue, setTypedCorviDialogue] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [guidePage, setGuidePage] = useState(0);
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

  useEffect(() => {
    if (!corviConversationOpen || Platform.OS === 'web') return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setCorviConversationOpen(false);
      setCorviPendingAction(null);
      return true;
    });
    return () => backHandler.remove();
  }, [corviConversationOpen]);

  const talkToCorvi = () => {
    setCorviPendingAction(null);
    setCorviConversationOpen(true);
    showCorviLine(pickDifferentLine(CORVI_CHAT_VARIANTS, lastCorviLine.current));
  };

  const chooseCorviReply = (action: CorviAction) => {
    setCorviConversationOpen(true);
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
      setGuidePage(0);
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

  const renderCorviChoice = (choice: CorviChoice) => (
    <Pressable
      key={choice.testID}
      testID={choice.testID}
      accessibilityRole="button"
      accessibilityLabel={choice.label}
      onPress={() => chooseCorviReply(choice.action)}
      style={({ pressed }) => [
        styles.corviChoice,
        {
          backgroundColor: pressed ? c.dictChip : c.dictPage,
          borderColor: c.dictLine,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Feather name={choice.icon} size={16} color={c.dictHead} />
      <Text style={[styles.corviAssistantChoiceText, { color: c.dictHead }]}>{choice.label}</Text>
      <Feather name="chevron-right" size={15} color={c.dictMuted} />
    </Pressable>
  );

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
    searchDictionary(debounced, 0, selectedCourseId, selectedPartOfSpeech).then(
      (r) => {
        if (reqRef.current !== id) return;
        setItems(r.items); setHasMore(r.hasMore);
        if (lookup.openExact) {
          const exact = r.items.find((item) => normalizeTerm(item.term) === normalizeTerm(debounced));
          if (exact) setOpenId(exact.id);
        }
        if (r.items.length === 0 && selectedCourseId === null && selectedPartOfSpeech === null) {
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
  }, [lookup, dict.ready, retryTick, selectedCourseId, selectedPartOfSpeech]);

  const selectCourse = (courseId: string | null) => {
    if (courseId === selectedCourseId) return;
    reqRef.current += 1;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setSelectedCourseId(courseId);
    setItems([]);
    setSuggestions([]);
    setHasMore(false);
    setOpenId(null);
    setError(null);
    setLoading(!!q.trim());
    setLoadingMore(false);
    setLookup({ term: q.trim(), openExact: false });
  };

  const selectPartOfSpeech = (part: DictionaryPartOfSpeech | null) => {
    setPartFilterOpen(false);
    if (part === selectedPartOfSpeech) return;
    reqRef.current += 1;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setSelectedPartOfSpeech(part);
    setItems([]);
    setSuggestions([]);
    setHasMore(false);
    setOpenId(null);
    setError(null);
    setLoading(!!q.trim());
    setLoadingMore(false);
    setLookup({ term: q.trim(), openExact: false });
  };

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
    searchDictionary(debounced, items.length, selectedCourseId, selectedPartOfSpeech).then(
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
          {item.courseTags?.length ? (
            <View
              testID={`dictionary-result-course-tags-${item.id}`}
              style={styles.courseTags}
              accessibilityLabel={`Thuộc khóa học: ${item.courseTags.join(", ")}`}
            >
              {item.courseTags.map((tag) => (
                <View key={tag} style={[styles.pill, { backgroundColor: c.dictChip }]}>
                  <Text style={[styles.pillText, { color: c.dictHead }]}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color={c.dictMuted} />
      </Pressable>
    );
  };

  let body: React.ReactNode;
  if (corviConversationOpen) body = (
    <ScrollView
      testID="dictionary-corvi-assistant-scroll"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: bottom }}
    >
      <View testID="dictionary-corvi-assistant-screen" style={styles.corviAssistantScreen}>
        <View style={styles.corviAssistantHero}>
          <View style={[styles.corviAssistantBubble, { backgroundColor: c.dictChip, borderColor: c.dictLine }]}>
            <Text testID="dictionary-corvi-assistant-name" style={[styles.dialogueName, { color: c.dictHead }]}>Mr. Corvi — Quản gia</Text>
            <Text
              testID="dictionary-corvi-dialogue"
              accessibilityLabel={corviDialogue}
              accessibilityLiveRegion="polite"
              style={[styles.dialogueCopy, { color: c.dictInk }]}
            >
              {typedCorviDialogue}
            </Text>
          </View>
        </View>
        <View testID="dictionary-corvi-options" style={styles.corviAssistantOptions}>
          <Text style={[styles.choicePrompt, { color: c.dictMuted }]}>Ngài muốn làm gì tiếp theo?</Text>
          {compactCorvi ? (
            <>
              <Pressable
                testID="dictionary-corvi-talk"
                accessibilityRole="button"
                accessibilityLabel="Nghe Corvi nói thêm"
                onPress={talkToCorvi}
                style={({ pressed }) => [
                  styles.corviAssistantArtTouch,
                  { width: corviAssistantArtSize, height: corviAssistantArtSize, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <CorviBlinkingArtwork
                  testID="dictionary-corvi-assistant-art"
                  source={corviArt}
                  backgroundSource={corviBackgroundArt}
                  artSize={corviAssistantArtSize}
                  style={{ width: corviAssistantArtSize, height: corviAssistantArtSize }}
                  gazeToUser
                />
              </Pressable>
              <View testID="dictionary-corvi-choice-groups-compact" style={styles.corviAssistantCompactGroups}>
                <View testID="dictionary-corvi-choice-group-left" style={styles.corviAssistantChoiceGroup}>
                  {CORVI_CHOICES.slice(0, 2).map(renderCorviChoice)}
                </View>
                <View testID="dictionary-corvi-choice-group-right" style={styles.corviAssistantChoiceGroup}>
                  {CORVI_CHOICES.slice(2).map(renderCorviChoice)}
                </View>
              </View>
            </>
          ) : (
            <View testID="dictionary-corvi-assistant-composition" style={styles.corviAssistantComposition}>
              <View testID="dictionary-corvi-choice-group-left" style={styles.corviAssistantChoiceGroup}>
                {CORVI_CHOICES.slice(0, 2).map(renderCorviChoice)}
              </View>
              <Pressable
                testID="dictionary-corvi-talk"
                accessibilityRole="button"
                accessibilityLabel="Nghe Corvi nói thêm"
                onPress={talkToCorvi}
                style={({ pressed }) => [
                  styles.corviAssistantArtTouch,
                  { width: corviAssistantArtSize, height: corviAssistantArtSize, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <CorviBlinkingArtwork
                  testID="dictionary-corvi-assistant-art"
                  source={corviArt}
                  backgroundSource={corviBackgroundArt}
                  artSize={corviAssistantArtSize}
                  style={{ width: corviAssistantArtSize, height: corviAssistantArtSize }}
                  gazeToUser
                />
              </Pressable>
              <View testID="dictionary-corvi-choice-group-right" style={styles.corviAssistantChoiceGroup}>
                {CORVI_CHOICES.slice(2).map(renderCorviChoice)}
              </View>
            </View>
          )}
          {corviRecommendationError ? (
            <Text testID="dictionary-corvi-recommend-error" style={[styles.talkHint, { color: c.destructive }]}>
              {corviRecommendationError}
            </Text>
          ) : null}
          {corviPendingAction && corviTypingComplete ? (
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
          ) : corviPendingAction ? (
            <Text style={[styles.talkHint, { color: c.dictMuted }]}>Corvi đang hồi âm...</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
  else if (!dict.ready) body = <DictionaryGate stage={dict.stage} error={dict.error} retry={dict.retry} approveDownload={dict.approveDownload} />;
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
        <View testID="dictionary-corvi-dialogue-wrap" style={styles.dialogueWrap}>
          <View style={[styles.dialogueBubble, { backgroundColor: c.dictChip, borderColor: c.dictLine }]}>
            <Text testID="dictionary-corvi-name" style={[styles.dialogueName, { color: c.dictHead }]}>Mr. Corvi — Quản gia</Text>
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
        <View testID="dictionary-corvi-composition" style={[styles.corviComposition, compactCorvi && styles.corviCompositionCompact]}>
          <Pressable
            testID="dictionary-corvi-talk"
            accessibilityRole="button"
            accessibilityLabel="Trò chuyện với Mr. Corvi"
            onPress={talkToCorvi}
            style={({ pressed }) => [styles.corviTouchable, { width: corviArtSize, height: corviArtSize, opacity: pressed ? 0.82 : 1 }]}
          >
            <CorviBlinkingArtwork
              testID="dictionary-corvi-idle-art"
              source={corviArt}
              backgroundSource={corviBackgroundArt}
              artSize={corviArtSize}
              style={[styles.idleArt, { width: corviArtSize, height: corviArtSize }]}
            />
          </Pressable>
        </View>
        {corviRecommendationLoading ? (
          <View testID="dictionary-corvi-recommend-loading" style={styles.recommendLoading}>
            <ActivityIndicator size="small" color={c.dictHead} />
            <Text style={[styles.talkHint, { color: c.dictMuted }]}>Corvi đang tìm một từ mới trong từ điển offline…</Text>
          </View>
        ) : (
          <Text style={[styles.talkHint, { color: c.dictMuted }]}>
            {corviPendingAction ? 'Corvi đang hồi âm...' : 'Chạm vào Corvi để mở màn hình trợ lý'}
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
          backgroundSource={corviBackgroundArt}
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
      <EmptyState
        icon="feather"
        title="Không có mục từ phù hợp"
        body={selectedCourseId || selectedPartOfSpeech
          ? `Không tìm thấy từ bắt đầu bằng “${debounced}” phù hợp với bộ lọc đã chọn.`
          : `Không tìm thấy từ bắt đầu bằng “${debounced}”. Bạn vẫn có thể tự ghi từ này vào sổ.`}
      >
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
        {corviConversationOpen ? (
          <View style={styles.corviPageHeader}>
            <Pressable
              testID="dictionary-corvi-back"
              accessibilityRole="button"
              accessibilityLabel="Quay lại Thư viện"
              onPress={() => { setCorviConversationOpen(false); setCorviPendingAction(null); }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.corviHeaderBack,
                { backgroundColor: pressed ? c.dictChip : 'transparent' },
              ]}
            >
              <Feather name="arrow-left" size={22} color={c.dictHead} />
            </Pressable>
            <Text style={[styles.corviHeaderTitle, { color: c.dictHead }]}>Trợ lý Corvi</Text>
          </View>
        ) : (
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
        )}
        {!corviConversationOpen && dict.ready ? (
          <View style={styles.filters}>
            <View testID="dictionary-course-filter" style={styles.courseFilter}>
              <Text style={[styles.courseFilterLabel, { color: c.dictHead }]}>Lọc khóa học</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.courseFilterOptions}
              >
                <Pressable
                  testID="dictionary-course-filter-all"
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCourseId === null }}
                  accessibilityLabel="Tất cả khóa học"
                  onPress={() => selectCourse(null)}
                  style={({ pressed }) => [
                    styles.courseFilterChip,
                    {
                      backgroundColor: selectedCourseId === null ? c.dictHead : c.dictPage,
                      borderColor: selectedCourseId === null ? c.dictHead : c.dictLine,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.courseFilterText, { color: selectedCourseId === null ? c.dictPage : c.dictHead }]}>Tất cả</Text>
                </Pressable>
                {COURSE_DICTIONARY_COURSES.map((course) => {
                  const selected = selectedCourseId === course.id;
                  return (
                    <Pressable
                      key={course.id}
                      testID={`dictionary-course-filter-${course.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Khóa học ${course.title}`}
                      onPress={() => selectCourse(course.id)}
                      style={({ pressed }) => [
                        styles.courseFilterChip,
                        {
                          backgroundColor: selected ? c.dictHead : c.dictPage,
                          borderColor: selected ? c.dictHead : c.dictLine,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.courseFilterText, { color: selected ? c.dictPage : c.dictHead }]}>{course.title}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View testID="dictionary-part-filter" style={styles.partFilter}>
              <Text style={[styles.courseFilterLabel, { color: c.dictHead }]}>Từ loại</Text>
              <Pressable
                testID="dictionary-part-filter-open"
                accessibilityRole="button"
                accessibilityLabel={`Chọn từ loại, hiện tại: ${selectedPartOfSpeech
                  ? DICTIONARY_PARTS.find((part) => part.id === selectedPartOfSpeech)?.viLabel
                  : 'Tất cả từ loại'}`}
                accessibilityState={{ expanded: partFilterOpen }}
                onPress={() => setPartFilterOpen(true)}
                style={({ pressed }) => [
                  styles.partFilterTrigger,
                  { backgroundColor: c.dictPage, borderColor: c.dictLine, opacity: pressed ? 0.76 : 1 },
                ]}
              >
                <Text
                  testID="dictionary-part-filter-value"
                  numberOfLines={1}
                  style={[styles.courseFilterText, { color: c.dictHead, flex: 1 }]}
                >
                  {selectedPartOfSpeech
                    ? DICTIONARY_PARTS.find((part) => part.id === selectedPartOfSpeech)?.viLabel
                    : 'Tất cả từ loại'}
                </Text>
                <Feather name="chevron-down" size={18} color={c.dictHead} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, backgroundColor: c.dictPage }}>{body}</View>
      <Modal
        testID="dictionary-part-filter-modal"
        visible={partFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPartFilterOpen(false)}
      >
        <Pressable
          testID="dictionary-part-filter-backdrop"
          accessibilityRole="button"
          accessibilityLabel="Đóng bộ lọc từ loại"
          onPress={() => setPartFilterOpen(false)}
          style={[styles.partFilterOverlay, { backgroundColor: c.overlay, paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <Pressable
            accessibilityRole="none"
            onPress={(event) => event.stopPropagation()}
            style={[styles.partFilterSheet, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 8 }]}
          >
            <View style={styles.partFilterSheetHeader}>
              <Text style={[styles.partFilterTitle, { color: c.foreground }]}>Lọc theo từ loại</Text>
              <Pressable
                testID="dictionary-part-filter-close"
                accessibilityRole="button"
                accessibilityLabel="Đóng bộ lọc"
                onPress={() => setPartFilterOpen(false)}
                hitSlop={8}
              >
                <Feather name="x" size={22} color={c.foreground} />
              </Pressable>
            </View>
            <ScrollView
              testID="dictionary-part-filter-options"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {[
                { id: null, label: 'Tất cả từ loại' },
                ...DICTIONARY_PARTS.map((part) => ({ id: part.id, label: part.viLabel })),
              ].map((option) => {
                const selected = option.id === selectedPartOfSpeech;
                return (
                  <Pressable
                    key={option.id ?? 'all'}
                    testID={`dictionary-part-filter-option-${option.id ?? 'all'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectPartOfSpeech(option.id)}
                    style={({ pressed }) => [
                      styles.partFilterOption,
                      { borderBottomColor: c.border, opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <Text style={[styles.partFilterOptionText, { color: selected ? c.primary : c.foreground }]}>
                      {option.label}
                    </Text>
                    {selected ? <Feather name="check" size={19} color={c.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        testID="dictionary-guide-modal"
        visible={guideOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGuidePage((page) => Math.max(0, page - 1))}
      >
        <View
          style={[styles.guideOverlay, { backgroundColor: c.overlay, paddingTop: top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View
            style={[styles.guideCard, { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 6 }]}
          >
            <View style={styles.guideHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.guideEyebrow, { color: c.primary }]}>CORVI GIỚI THIỆU</Text>
                <Text style={[styles.guideTitle, { color: c.foreground }]}>Hướng dẫn nhanh</Text>
              </View>
            </View>
            <ScrollView
              testID="dictionary-guide-content"
              showsVerticalScrollIndicator={false}
              key={guidePage}
              style={styles.guidePageScroll}
              contentContainerStyle={styles.guideSections}
            >
              <Text style={[styles.guidePageEyebrow, { color: c.primary }]}>{GUIDE_PAGES[guidePage].eyebrow}</Text>
              <Text style={[styles.guidePageTitle, { color: c.foreground }]}>{GUIDE_PAGES[guidePage].title}</Text>
              <Text style={[styles.guidePageIntro, { color: c.mutedForeground }]}>{GUIDE_PAGES[guidePage].intro}</Text>
              {GUIDE_PAGES[guidePage].sections.map(([title, description]) => (
                <View key={title} style={[styles.guideSection, { borderBottomColor: c.border }]}>
                  <Text style={[styles.guideSectionTitle, { color: c.foreground }]}>{title}</Text>
                  <Text style={[styles.guideSectionBody, { color: c.mutedForeground }]}>{description}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.guideFooter}>
              <Pressable
                testID="dictionary-guide-previous"
                accessibilityRole="button"
                accessibilityLabel="Trang trước"
                accessibilityState={{ disabled: guidePage === 0 }}
                disabled={guidePage === 0}
                onPress={() => setGuidePage((page) => Math.max(0, page - 1))}
                style={({ pressed }) => [styles.guidePageControl, { opacity: guidePage === 0 ? 0.35 : pressed ? 0.65 : 1 }]}
              >
                <Feather name="arrow-left" size={18} color={c.foreground} />
              </Pressable>
              <Text
                testID="dictionary-guide-page-count"
                accessibilityRole="text"
                accessibilityLabel={`Trang ${guidePage + 1} trên ${GUIDE_PAGES.length}`}
                style={[styles.guidePageCount, { color: c.mutedForeground }]}
              >
                {guidePage + 1} / {GUIDE_PAGES.length}
              </Text>
              {guidePage < GUIDE_PAGES.length - 1 ? (
                <Pressable
                  testID="dictionary-guide-next"
                  accessibilityRole="button"
                  accessibilityLabel="Trang tiếp theo"
                  onPress={() => setGuidePage((page) => Math.min(GUIDE_PAGES.length - 1, page + 1))}
                  style={({ pressed }) => [styles.guidePageControl, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Feather name="arrow-right" size={18} color={c.foreground} />
                </Pressable>
              ) : (
                <Button
                  testID="dictionary-guide-done"
                  label="Hoàn tất"
                  onPress={() => { setGuideOpen(false); setGuidePage(0); }}
                  style={styles.guideDone}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  band: { position: 'relative', paddingHorizontal: 16, paddingBottom: 14 },
  corviPageHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  corviHeaderBack: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  corviHeaderTitle: { fontFamily: F.b, fontSize: 18 },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  search: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, minHeight: 54, borderWidth: 1 },
  searchInput: { flex: 1, minWidth: 0, width: 0, fontFamily: F.m, fontSize: 18, paddingVertical: 12 },
  filters: { paddingTop: 10, gap: 8 },
  courseFilter: { gap: 6 },
  courseFilterLabel: { fontFamily: F.s, fontSize: 12 },
  courseFilterOptions: { alignItems: 'center', gap: 7, paddingRight: 4 },
  courseFilterChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 16, borderWidth: 1 },
  courseFilterText: { fontFamily: F.s, fontSize: 12 },
  partFilter: { gap: 5 },
  partFilterTrigger: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1 },
  partFilterOverlay: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 24 },
  partFilterSheet: { width: '100%', maxWidth: 520, maxHeight: '78%', alignSelf: 'center', borderWidth: 1, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 8, overflow: 'hidden' },
  partFilterSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  partFilterTitle: { fontFamily: F.b, fontSize: 18 },
  partFilterOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  partFilterOptionText: { fontFamily: F.m, fontSize: 15 },
  corviAssistantScreen: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 16, paddingBottom: 18 },
  corviAssistantHero: { alignItems: 'center', gap: 10 },
  corviAssistantBubble: { width: '100%', maxWidth: 520, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, gap: 6 },
  corviAssistantArtTouch: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  corviAssistantOptions: { width: '100%', maxWidth: 620, alignSelf: 'center', gap: 10 },
  corviAssistantComposition: { width: '100%', minHeight: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  corviAssistantChoiceGroup: { flex: 1, minWidth: 0, maxWidth: 150, gap: 8 },
  corviAssistantCompactGroups: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  corviAssistantChoiceText: { flex: 1, minWidth: 0, fontFamily: F.s, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  idleState: { flexGrow: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  corviComposition: { width: '100%', maxWidth: 620, minHeight: 202, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0 },
  corviCompositionCompact: { minHeight: 140 },
  corviTouchable: { maxWidth: '100%', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' },
  idleArt: { maxWidth: '100%' },
  recommendLoading: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  choicePrompt: { fontFamily: F.m, fontSize: 12, textAlign: 'center' },
  corviChoice: { width: '100%', minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 6, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  corviActionButton: { width: '100%', maxWidth: 320, minHeight: 48, marginTop: 2 },
  dialogueWrap: { width: '100%', maxWidth: 520, alignItems: 'center', zIndex: 1 },
  dialogueBubble: { width: '100%', borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, gap: 6 },
  dialogueTail: { width: 0, height: 0, borderTopWidth: 9, borderLeftWidth: 9, borderRightWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1, alignSelf: 'center' },
  dialogueName: { fontFamily: F.s, fontSize: 15, letterSpacing: 0.3, textAlign: 'center' },
  dialogueCopy: { fontFamily: F.r, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  talkHint: { fontFamily: F.m, fontSize: 13, textAlign: 'center', marginTop: -2 },
  loadingState: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 10 },
  loadingArt: { width: 236, height: 236, maxWidth: '100%' },
  loadingTitle: { fontFamily: F.b, fontSize: 19, textAlign: 'center' },
  loadingBody: { maxWidth: 300, fontFamily: F.r, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 2 },
  guideOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  guideCard: { width: '100%', maxWidth: 480, maxHeight: '88%', alignSelf: 'center', borderWidth: 1, padding: 18, gap: 12 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideEyebrow: { fontFamily: F.s, fontSize: 11, letterSpacing: 1.4, marginBottom: 3 },
  guideTitle: { fontFamily: F.b, fontSize: 23 },
  guidePageScroll: { flexShrink: 1, minHeight: 0 },
  guideSections: { paddingBottom: 8 },
  guidePageEyebrow: { fontFamily: F.s, fontSize: 11, letterSpacing: 1.3, marginBottom: 5 },
  guidePageTitle: { fontFamily: F.b, fontSize: 20, lineHeight: 26, marginBottom: 6 },
  guidePageIntro: { fontFamily: F.r, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  guideSection: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  guideSectionTitle: { fontFamily: F.s, fontSize: 15, marginBottom: 4 },
  guideSectionBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  guideFooter: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  guidePageControl: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  guidePageCount: { flex: 1, fontFamily: F.m, fontSize: 13, textAlign: 'center' },
  guideDone: { minWidth: 124 },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 10 },
  go: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  courseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  term: { fontFamily: F.b, fontSize: 18, flexShrink: 1 },
  meaning: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontFamily: F.s, fontSize: 11 },
});
