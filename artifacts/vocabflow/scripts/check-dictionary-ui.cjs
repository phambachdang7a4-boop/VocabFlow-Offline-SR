const assert = require('node:assert/strict');
const { join } = require('node:path');
const { readFileSync, existsSync } = require('node:fs');
const { loadTs, loadDictionaryDomain } = require('./test-support.cjs');
const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const dictionaryDomain = loadDictionaryDomain();
const soundCues = loadTs(join(__dirname, '../domain/sound-cues.ts'));
const { exampleSegments, pronunciationAccent } = dictionaryDomain;
const dictionaryEntrySource = readFileSync(join(__dirname, '../components/DictionaryEntryView.tsx'), 'utf8');
const dictionaryTabSource = readFileSync(join(__dirname, '../app/(tabs)/dictionary.tsx'), 'utf8');
const tabLayoutSource = readFileSync(join(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
const dictionarySourcesSource = readFileSync(join(__dirname, '../app/dictionary-sources.tsx'), 'utf8');
for (const tab of ['courses', 'index', 'review', 'blank']) {
  const source = readFileSync(join(__dirname, `../app/(tabs)/${tab}.tsx`), 'utf8');
  assert.doesNotMatch(source, /<ScreenHeader\b/, `${tab} no longer renders a redundant page-title banner.`);
}
assert.doesNotMatch(dictionaryEntrySource, /entry-open-sources|Nguồn và giấy phép từ điển/,
  'Entry results do not repeat the source attribution link under each lookup.');
assert.match(dictionaryTabSource, /dictionary-open-sources/,
  'A compact info button still provides access to the attribution page.');
assert.doesNotMatch(dictionaryTabSource, /VocabFlow · Anh – Việt ngoại tuyến|<Text[^>]*>Tra Từ<\/Text>/,
  'The redundant dictionary title above the search field is removed.');
assert.match(tabLayoutSource, /NativeTabs\.Trigger\.Label>Thư Viện<\/NativeTabs\.Trigger\.Label>|options=\{\{ title: "Thư Viện"/,
  'The active navigation implementation names the dictionary tab Thư Viện.');
assert.match(tabLayoutSource, /title: "Thư Viện"/,
  'Classic navigation names the dictionary tab Thư Viện.');
assert.match(dictionarySourcesSource, /Nguồn từ điển/,
  'The full dictionary attribution page remains available in the app.');
assert.match(dictionaryEntrySource, /entry-regional-ipa-install/,
  'Dictionary entries link to Settings when the regional IPA pack is missing.');
assert.match(dictionaryEntrySource, /entry-root-shortcut-/,
  'Entries with an explicitly defined inflection expose a root shortcut.');
for (const [sentence, term, expected] of [
  ['I have not seen him since.', 'since', ['since']],
  ['Since then, since yesterday.', 'since', ['Since', 'since']],
  ['Sincerity is not since.', 'since', ['since']],
  ['Take  off, then take off.', 'take off', ['Take  off', 'take off']],
  ['C++ and C+ are different.', 'C++', ['C++']],
  ['Nothing to underline.', 'since', []],
  ['Nothing to underline.', '', []],
]) {
  const segments = exampleSegments(sentence, term);
  assert.equal(segments.map(part => part.text).join(''), sentence);
  assert.deepEqual(segments.filter(part => part.underline).map(part => part.text), expected);
}
assert.equal(pronunciationAccent('BrE'), 'uk');
assert.equal(pronunciationAccent('Received-Pronunciation'), 'uk');
assert.equal(pronunciationAccent('NAmE'), 'us');
assert.equal(pronunciationAccent('General-American'), 'us');
assert.equal(pronunciationAccent(null), null);
const native = Object.fromEntries(['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'FlatList', 'ActivityIndicator', 'Image', 'Modal'].map(key => [key, key]));
let screenWidth = 390;
Object.assign(native, {
  Platform: { OS: 'web' },
  StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, hairlineWidth: 1 },
  Keyboard: { dismiss() {} },
  useWindowDimensions: () => ({ width: screenWidth, height: 844, scale: 1, fontScale: 1 }),
});
const animationCalls = [];
const sharedValues = [];
let reducedMotionEnabled = false;
const reanimated = {
  default: { View: 'AnimatedView' },
  cancelAnimation() {},
  useAnimatedStyle: fn => fn(),
  useSharedValue: value => { const shared = { value }; sharedValues.push(shared); return shared; },
  withDelay: (delay, animation) => ({ type: 'delay', delay, animation }),
  withRepeat: (animation, count, reverse) => {
    const call = { type: 'repeat', animation, count, reverse };
    animationCalls.push(call);
    return call;
  },
  withSequence: (...animations) => ({ type: 'sequence', animations }),
  withTiming: (value, options) => ({ type: 'timing', value, options }),
  useReducedMotion: () => reducedMotionEnabled,
};
const normalizeTerm = value => value.trim().toLowerCase();
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function textOf(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return node && typeof node === 'object' ? textOf(node.props?.children) : '';
}

// Exercise real screen callbacks/effects without a private-preview login or
// native UI dependency. This is a logic regression test, not a touch/E2E test.
function mount(file, services, personalWords = [], properties = {}) {
  const slots = [], effects = [], timers = new Map(), intervals = new Map();
  let cursor, dirty = true, tree, timerId = 0;
  const react = {
    createElement: element,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo: fn => fn(),
    useCallback: fn => fn,
    useEffect(fn, dependencies) {
      const index = cursor++, old = slots[index];
      if (!old || dependencies.some((value, i) => !Object.is(value, old.dependencies[i]))) {
        const record = { dependencies };
        slots[index] = record;
        effects.push(() => { old?.cleanup?.(); record.cleanup = fn(); });
      }
    },
  };
  const routes = [];
  const dependencies = {
    '@/domain/dictionary': dictionaryDomain,
    '@/data/offline-regional-pronunciations': {
      getOfflineRegionalIpaStatus: async () => ({ state: 'missing', bytes: 0, entryCount: 0 }),
    },
    react: { ...react, default: react }, 'react-native': native, 'react-native-reanimated': reanimated,
    '@expo/vector-icons': { Feather: 'Feather' },
    'react-native-keyboard-controller': { KeyboardAvoidingView: 'KeyboardAvoidingView' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'expo-router': { router: { push: route => routes.push(route) }, useFocusEffect: () => {} },
    '@/contexts/VocabularyContext': { useVocabulary: () => ({
      words: personalWords, saveWord: services.saveWord,
      loading: services.bookLoading ?? false, error: services.bookError ?? null, reload: async () => {},
    }) },
    '@/contexts/SpeechPreferencesContext': { useSpeechPreferences: () => ({
      ready: true, autoRead: false, slowRead: false, stopSpeaking: async () => {}, speakWord: async () => {},
    }) },
    '@/contexts/SoundEffectsContext': { useSoundEffects: () => ({
      ready: true, enabled: true, volume: 0.7, saving: false, error: null,
      unlockFromGesture() {}, play() {}, startLoop() {}, stopLoop() {},
      setEnabled: async () => {}, setVolume: async () => {}, retryLoad: async () => {},
    }) },
    '@/domain/sound-cues': soundCues,
    '@/data/vocabulary': { normalizeTerm },
    '@/data/dictionary-course-index': {
      COURSE_DICTIONARY_COURSES: [{ id: 'ielts-topic', title: 'IELTS' }],
    },
    '@/data/dictionary': {
      getDictionaryInflectionRoots: async () => [],
      ...services,
    },
    '@/components/DictionaryGate': { DictionaryGate: 'DictionaryGate' },
    '@/components/DictionaryEntryView': { DictionaryEntryView: 'DictionaryEntryView' },
    '@/components/CorviBlinkingArtwork': { CorviBlinkingArtwork: 'CorviBlinkingArtwork' },
    '@/components/DictionarySuggestions': { DictionarySuggestions: 'DictionarySuggestions' },
    '@/components/PartOfSpeechFilter': { PartOfSpeechFilter: 'PartOfSpeechFilter' },
    '@/hooks/useDictionary': { useDictionary: () => ({ ready: true }) },
    '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
    '@/components/ui': { Button: 'Button', EmptyState: 'EmptyState', ErrorBanner: 'ErrorBanner', Skeleton: 'Skeleton', F: {} },
    '../../assets/images/corvi-dictionary-background.png': 'corvi-background-dark-asset',
    '../../assets/images/corvi-dictionary-background-light.png': 'corvi-background-light-asset',
    '../../assets/images/corvi-dictionary-character-alpha.png': 'corvi-character-asset',
    '@/components/ScreenHeader': { useBottomPad: () => 100 },
  };
  const loaded = loadTs(join(__dirname, file), dependencies, {
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval: fn => { const id = ++timerId; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
  });
  const Component = loaded.default ?? loaded.DictionaryEntryView ?? loaded.DictionarySuggestions ?? loaded.PartOfSpeechFilter ?? loaded.CorviBlinkingArtwork;
  const props = { id: 42, bottomPad: 100, onBack() {}, ...properties };
  const render = () => {
    for (let limit = 0; dirty; limit++) {
      assert.ok(limit < 30, 'Screen must settle without an effect loop');
      dirty = false; cursor = 0; tree = Component(props);
      while (effects.length) effects.shift()();
    }
  };
  const api = {
    routes,
    update(next) { Object.assign(props, next); dirty = true; render(); },
    byId(id) { render(); return find(tree, node => node.props?.testID === id); },
    byType(type) { render(); return find(tree, node => node.type === type); },
    timers() { for (const fn of [...timers.values()]) fn(); timers.clear(); render(); },
    tickIntervals(count = 1) {
      for (let tick = 0; tick < count; tick++) {
        for (const fn of [...intervals.values()]) fn();
      }
      render();
    },
    async settle() { render(); await tick(); render(); },
  };
  render();
  return api;
}

(async () => {
  const calls = [];
  const suggestionCalls = [];
  const screen = mount('../app/(tabs)/dictionary.tsx', {
    searchDictionary: (term, offset) => new Promise(resolve => calls.push({ term, offset, resolve })),
    suggestDictionary: term => new Promise((resolve, reject) => suggestionCalls.push({ term, resolve, reject })),
  });
  const animatedArt = mount('../components/CorviBlinkingArtwork.tsx', {}, [], {
    source: 1, backgroundSource: 2, testID: 'corvi-blink-test', artSize: 236,
    style: { width: 236, height: 236 },
  });
  assert.ok(animatedArt.byId('corvi-blink-test'), 'The animated artwork retains the original Corvi illustration.');
  assert.equal(animatedArt.byId('corvi-blink-test-background').props.source, 2,
    'A cleaned bookshelf background can render independently below Corvi.');
  assert.ok(
    animatedArt.byId('corvi-blink-test-frame').props.children.indexOf(animatedArt.byId('corvi-blink-test-background')) <
      animatedArt.byId('corvi-blink-test-frame').props.children.indexOf(animatedArt.byId('corvi-blink-test')),
    'The empty background is layered behind the transparent character.',
  );
  assert.deepEqual(animatedArt.byId('corvi-blink-test').props.style.at(-1), { width: 236, height: 236 },
    'The base illustration receives explicit dimensions so it cannot collapse on mobile.');
  assert.ok(animatedArt.byId('corvi-blink-test-blink'), 'Corvi’s blinking eyelid is rendered above the eye.');
  assert.ok(animatedArt.byId('corvi-blink-test-gaze'), 'A pixel-sized pupil overlay provides the gaze motion.');
  assert.ok(animatedArt.byId('corvi-blink-test-page-turn'), 'A restrained page overlay is rendered over the open book.');
  assert.equal(animatedArt.byId('corvi-blink-test-page-turn').props.style.at(-1).opacity, 0,
    'The turning-page layer stays invisible between page turns.');
  assert.ok(animatedArt.byId('corvi-blink-test-wing-sweep'), 'A separate pixel-art wing layer sweeps toward the page.');
  assert.equal(animatedArt.byId('corvi-blink-test-wing-sweep').props.style.at(-1).opacity, 0,
    'Corvi’s wing stays still between page turns.');
  const gazeCycle = animationCalls.find(call => call.type === 'repeat'
    && call.animation.type === 'sequence'
    && call.animation.animations.some(part => part.type === 'delay' && part.delay === 2500)
    && call.animation.animations.some(part => part.type === 'delay' && part.delay === 3200));
  assert.ok(gazeCycle, 'Idle gaze repeatedly shifts between the user and the book with pauses.');
  const pageCycle = animationCalls.find(call => call.type === 'repeat'
    && call.animation.type === 'sequence'
    && call.animation.animations.some(part => part.type === 'delay' && part.delay === 5200)
    && call.animation.animations.some(part => part.type === 'timing' && part.options?.duration === 420));
  assert.ok(pageCycle, 'The book page turns occasionally and settles back in a short, restrained motion.');
  const wingCycle = animationCalls.find(call => call.type === 'repeat'
    && call.animation.type === 'sequence'
    && call.animation.animations.some(part => part.type === 'delay' && part.delay === 5000)
    && call.animation.animations.some(part => part.type === 'timing' && part.options?.duration === 300));
  assert.ok(wingCycle, 'Corvi’s wing sweeps in sync with the periodic book-page animation.');
  animationCalls.length = 0;
  const eyeContactArt = mount('../components/CorviBlinkingArtwork.tsx', {}, [], {
    source: 1, testID: 'corvi-eye-contact-test', artSize: 210, gazeToUser: true,
  });
  assert.ok(eyeContactArt.byId('corvi-eye-contact-test-gaze'));
  assert.ok(!animationCalls.some(call => call.animation?.type === 'sequence'
    && call.animation.animations.some(part => part.type === 'delay' && part.delay === 2500)),
  'Locked eye contact replaces idle gaze cycling with a direct gaze.');
  assert.equal(sharedValues.at(-3).value?.type, 'timing');
  assert.equal(sharedValues.at(-3).value?.value, 1, 'Conversation gaze animates toward the learner and remains there.');
  reducedMotionEnabled = true;
  animationCalls.length = 0;
  const reducedArt = mount('../components/CorviBlinkingArtwork.tsx', {}, [], {
    source: 1, testID: 'corvi-reduced-motion-test', artSize: 210, gazeToUser: true,
  });
  assert.ok(reducedArt.byId('corvi-reduced-motion-test-page-turn'));
  assert.equal(animationCalls.length, 0, 'Reduced motion disables all repeating character animations.');
  assert.deepEqual(sharedValues.slice(-5).map(value => value.value), [0, 0, 1, 0, 0],
    'Reduced motion keeps blink, float, page, and wing static while preserving choice-state eye contact.');
  reducedMotionEnabled = false;
  assert.ok(screen.byId('dictionary-search-idle'), 'Dictionary shows a welcoming idle state before a search');
  assert.ok(screen.byId('dictionary-search-idle-scroll'), 'The empty state can scroll when it exceeds the viewport');
  assert.ok(screen.byId('dictionary-corvi-idle-art'), 'Corvi artwork is visible before a search');
  const idleCorviArt = screen.byId('dictionary-corvi-idle-art');
  assert.equal(idleCorviArt.props.artSize, 180, 'The phone-sized idle artwork is larger and readable.');
  assert.deepEqual(idleCorviArt.props.style.at(-1), { width: 180, height: 180 },
    'Corvi receives explicit width and height in the idle state.');
  assert.equal(idleCorviArt.props.source, 'corvi-character-asset',
    'The enlarged library Corvi renders from an independent transparent character image.');
  assert.equal(idleCorviArt.props.backgroundSource, 'corvi-background-light-asset',
    'The light library theme uses the cleaned background without Corvi.');
  screenWidth = 320;
  const narrowScreen = mount('../app/(tabs)/dictionary.tsx', {
    searchDictionary: async () => ({ items: [], hasMore: false }),
    suggestDictionary: async () => [],
  });
  const narrowArt = narrowScreen.byId('dictionary-corvi-idle-art');
  assert.equal(narrowArt.props.artSize, 160, 'The narrow-phone layout keeps the enlarged Corvi illustration readable.');
  assert.deepEqual(narrowArt.props.style.at(-1), { width: 160, height: 160 },
    'The illustration retains explicit dimensions on a narrow phone.');
  narrowScreen.byId('dictionary-corvi-talk').props.onPress();
  assert.ok(narrowScreen.byId('dictionary-corvi-choice-groups-compact'),
    'Very narrow phones keep every choice available below Corvi.');
  assert.equal(narrowScreen.byId('dictionary-corvi-assistant-composition'), undefined,
    'Very narrow phones avoid squeezing the side-by-side composition.');
  screenWidth = 390;
  assert.equal(screen.byId('dictionary-corvi-name').props.children[0], 'Mr. Corvi — Quản gia',
    'The steward uses the approved full display name.');
  const idleChildren = screen.byId('dictionary-search-idle').props.children;
  assert.ok(idleChildren.indexOf(screen.byId('dictionary-corvi-dialogue-wrap')) < idleChildren.indexOf(screen.byId('dictionary-corvi-composition')),
    'The dialogue bubble and downward tail are laid out before the Corvi art, never over it.');
  assert.equal(screen.byId('dictionary-corvi-choice-extract'), undefined,
    'Conversation choices stay hidden until the learner opens Corvi.');
  assert.equal(
    screen.byId('dictionary-corvi-dialogue').props.accessibilityLabel,
    'Xin chào cậu chủ, ngài muốn tìm từ vựng nào? Xin hãy bấm vào thanh tìm kiếm ở trên.',
    'Corvi greets the learner before any taps.',
  );
  screen.tickIntervals(1);
  assert.equal(screen.byId('dictionary-corvi-dialogue').props.children[0], 'X',
    'Corvi’s line appears one character at a time.');
  screen.byId('dictionary-corvi-talk').props.onPress();
  assert.ok(screen.byId('dictionary-corvi-assistant-screen'),
    'One tap opens a dedicated assistant screen instead of inline choices.');
  assert.ok(screen.byId('dictionary-corvi-back'),
    'The assistant screen has a back control like other app screens.');
  assert.equal(screen.byId('dictionary-search'), undefined,
    'The assistant screen replaces the dictionary search header while open.');
  assert.equal(screen.byId('dictionary-corvi-assistant-name').props.children[0], 'Mr. Corvi — Quản gia');
  assert.ok(screen.byId('dictionary-corvi-options'), 'All Corvi choices appear on the dedicated screen.');
  assert.equal(screen.byId('dictionary-corvi-assistant-art').props.artSize, 156,
    'Corvi is sized to leave room for the side choice buttons on a phone.');
  assert.equal(screen.byId('dictionary-corvi-assistant-art').props.gazeToUser, true,
    'Corvi keeps eye contact on the assistant screen.');
  assert.ok(screen.byId('dictionary-corvi-assistant-composition'),
    'The assistant screen places Corvi between the two groups of choices.');
  assert.equal(screen.byId('dictionary-corvi-choice-group-left').props.children.flat(Infinity).length, 2,
    'The left side keeps the first two Corvi choices.');
  assert.equal(screen.byId('dictionary-corvi-choice-group-right').props.children.flat(Infinity).length, 3,
    'The right side keeps the remaining three Corvi choices.');
  for (const choice of ['lookup', 'extract', 'guide', 'review', 'recommend']) {
    assert.ok(screen.byId(`dictionary-corvi-choice-${choice}`), `Corvi offers the ${choice} reply choice.`);
    assert.ok(screen.byId(`dictionary-corvi-choice-${choice}`).props.accessibilityLabel,
      `${choice} remains explicitly labeled for assistive technology.`);
  }
  screen.byId('dictionary-corvi-choice-guide').props.onPress();
  assert.ok(screen.byId('dictionary-corvi-assistant-screen'),
    'Choosing an option keeps the assistant screen open while Corvi replies.');
  assert.ok(screen.byId('dictionary-corvi-choice-lookup'),
    'Choosing one option does not remove the remaining options.');
  assert.equal(screen.byId('dictionary-corvi-action-guide'), undefined,
    'The destination action waits until Corvi finishes typing his reply.');
  assert.notEqual(screen.byId('dictionary-corvi-dialogue').props.children[0],
    screen.byId('dictionary-corvi-dialogue').props.accessibilityLabel,
    'Corvi’s chosen reply begins as typed dialogue before the action appears.');
  screen.tickIntervals(200);
  assert.ok(screen.byId('dictionary-corvi-action-guide'), 'An explicit action follows the typed guide reply.');
  screen.byId('dictionary-corvi-action-guide').props.onPress();
  assert.equal(screen.byId('dictionary-guide-modal').props.visible, true, 'The guidebook opens from Corvi’s dialogue.');
  assert.ok(screen.byId('dictionary-guide-content'), 'The guidebook contains practical instructions.');
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 1 trên 6',
    'The guide announces the current page and total page count accessibly.');
  assert.match(textOf(screen.byId('dictionary-guide-content')), /Bắt đầu bằng ngữ cảnh/);
  assert.ok(screen.byId('dictionary-guide-previous').props.disabled, 'The previous-page control is disabled on the first page.');
  assert.ok(screen.byId('dictionary-guide-next'), 'The popup has a working next-page control.');
  assert.equal(screen.byId('dictionary-guide-close'), undefined,
    'The popup is completed from its last page instead of being dismissed midway.');
  const guideModal = screen.byId('dictionary-guide-modal');
  guideModal.props.onRequestClose();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 1 trên 6',
    'The device back action cannot skip the guide before its final page.');
  screen.byId('dictionary-guide-next').props.onPress();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 2 trên 6');
  const navigationPage = textOf(screen.byId('dictionary-guide-content'));
  for (const tool of ['Thư Viện', 'Khóa học', 'Ôn tập', 'Sổ từ', 'Nhiệm Vụ', 'Bộ Sưu Tập']) {
    assert.ok(navigationPage.includes(tool), `The guide explains ${tool}.`);
  }
  screen.byId('dictionary-guide-previous').props.onPress();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 1 trên 6');
  screen.byId('dictionary-guide-next').props.onPress();
  screen.byId('dictionary-guide-next').props.onPress();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 3 trên 6');
  const readingPage = textOf(screen.byId('dictionary-guide-content'));
  assert.ok(readingPage.indexOf('1 · Đọc và đoán') < readingPage.indexOf('2 · Tra trong Thư Viện'));
  assert.ok(readingPage.indexOf('2 · Tra trong Thư Viện') < readingPage.indexOf('3 · Dùng Mắt Quạ'));
  assert.ok(readingPage.indexOf('3 · Dùng Mắt Quạ') < readingPage.indexOf('4 · Lưu và gặp lại'));
  assert.match(readingPage, /beneath/);
  assert.match(readingPage, /TXT/);
  screen.byId('dictionary-guide-next').props.onPress();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 4 trên 6');
  const spacedRepetitionPage = textOf(screen.byId('dictionary-guide-content'));
  for (const checkpoint of ['0, 1, 3, 7, 14 và 30 ngày', 'cấp 6', 'ngày mai']) {
    assert.ok(spacedRepetitionPage.includes(checkpoint), `The guide accurately explains ${checkpoint}.`);
  }
  screen.byId('dictionary-guide-next').props.onPress();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 5 trên 6');
  const dataPage = textOf(screen.byId('dictionary-guide-content'));
  for (const detail of ['ngoại tuyến', 'JSON', 'Đồng bộ tùy chọn', 'không thể hoàn tác']) {
    assert.ok(dataPage.toLocaleLowerCase('vi').includes(detail.toLocaleLowerCase('vi')), `The guide explains ${detail}.`);
  }
  screen.byId('dictionary-guide-next').props.onPress();
  assert.equal(screen.byId('dictionary-guide-page-count').props.accessibilityLabel, 'Trang 6 trên 6');
  const vocabularyPage = textOf(screen.byId('dictionary-guide-content'));
  assert.match(vocabularyPage, /đọc, nghe và giao tiếp/);
  assert.match(vocabularyPage, /không phải mục tiêu/);
  assert.ok(screen.byId('dictionary-guide-done'), 'The final page offers an explicit completion action.');
  screen.byId('dictionary-guide-done').props.onPress();
  assert.equal(screen.byId('dictionary-guide-modal').props.visible, false, 'The final completion button dismisses the popup.');
  screen.byId('dictionary-corvi-talk').props.onPress();
  const normalLineOne = screen.byId('dictionary-corvi-dialogue').props.accessibilityLabel;
  screen.byId('dictionary-corvi-talk').props.onPress();
  const normalLineTwo = screen.byId('dictionary-corvi-dialogue').props.accessibilityLabel;
  assert.notEqual(normalLineTwo, normalLineOne, 'Normal Corvi greetings do not repeat consecutively.');
  for (let tap = 0; tap < 8; tap += 1) {
    screen.byId('dictionary-corvi-talk').props.onPress();
    assert.ok(screen.byId('dictionary-corvi-options'),
      'Repeatedly tapping Corvi keeps the assistant menu visible.');
    for (const choice of ['lookup', 'extract', 'guide', 'review', 'recommend']) {
      assert.ok(screen.byId(`dictionary-corvi-choice-${choice}`),
        `The ${choice} choice stays available after repeated taps.`);
    }
    assert.equal(screen.byId('dictionary-corvi-action-search'), undefined,
      'Repeated taps do not replace the choice list with a search-only action.');
  }
  screen.byId('dictionary-corvi-back').props.onPress();
  assert.equal(screen.byId('dictionary-corvi-assistant-screen'), undefined,
    'The back control returns from Corvi to the dictionary.');
  assert.ok(screen.byId('dictionary-search'));

  for (const [choice, action, route] of [
    ['lookup', 'search', null],
    ['extract', 'extract', '/extract'],
    ['review', 'review', '/review'],
  ]) {
    const choiceScreen = mount('../app/(tabs)/dictionary.tsx', {
      searchDictionary: async () => ({ items: [], hasMore: false }),
      suggestDictionary: async () => [],
    });
    choiceScreen.byId('dictionary-corvi-talk').props.onPress();
    choiceScreen.byId(`dictionary-corvi-choice-${choice}`).props.onPress();
    const actionTestID = action === 'extract' ? 'dictionary-open-extract' : `dictionary-corvi-action-${action}`;
    assert.equal(choiceScreen.byId(actionTestID), undefined,
      `${choice} destination is not opened before Corvi replies.`);
    choiceScreen.tickIntervals(200);
    choiceScreen.byId(actionTestID).props.onPress();
    if (route) {
      assert.equal(choiceScreen.routes.at(-1), route, `Corvi opens the existing ${route} destination after the reply.`);
    } else {
      assert.deepEqual(choiceScreen.routes, [], 'The lookup choice stays on the dictionary screen and focuses search.');
    }
  }
  const recommendationScreen = mount('../app/(tabs)/dictionary.tsx', {
    searchDictionary: async () => ({ items: [], hasMore: false }),
    suggestDictionary: async () => [],
    getRandomUnlearnedDictionaryWord: async (learnedTerms) => {
      assert.ok(learnedTerms.has('hello'), 'Corvi receives the saved-word set to exclude.');
      return { id: 9301, term: 'serendipity', meaning: 'sự tình cờ may mắn' };
    },
  }, [{ term: 'hello' }]);
  recommendationScreen.byId('dictionary-corvi-talk').props.onPress();
  recommendationScreen.byId('dictionary-corvi-choice-recommend').props.onPress();
  assert.equal(recommendationScreen.byId('dictionary-corvi-action-recommend'), undefined,
    'Corvi does not reveal the recommendation action before finishing the reply.');
  recommendationScreen.tickIntervals(200);
  await recommendationScreen.byId('dictionary-corvi-action-recommend').props.onPress();
  assert.equal(recommendationScreen.byType('DictionaryEntryView').props.id, 9301,
    'The recommendation opens its real offline dictionary entry.');
  assert.equal(recommendationScreen.byType('DictionaryEntryView').props.backLabel, 'Về cuộc trò chuyện',
    'Returning from a suggestion returns to Corvi.');
  recommendationScreen.byType('DictionaryEntryView').props.onBack();
  assert.ok(recommendationScreen.byId('dictionary-corvi-assistant-screen'),
    'The learner can continue the conversation after viewing a suggested word.');
  assert.ok(recommendationScreen.byId('dictionary-corvi-choice-lookup'),
    'Returning from a suggested word preserves the available choices.');
  screen.byId('dictionary-search').props.onChangeText('job');
  screen.byId('dictionary-submit').props.onPress();
  await screen.settle();
  assert.equal(calls.length, 1, 'Immediate submit must not race an automatic second search');
  assert.equal(calls[0].term, 'job');
  assert.ok(screen.byId('dictionary-search-loading'), 'Dictionary search shows a dedicated waiting state');
  assert.ok(screen.byId('dictionary-corvi-search-art'), 'Corvi artwork appears while results are loading');
  calls[0].resolve({ items: [{ id: 81, term: 'job', meaning: 'việc làm' }], hasMore: false });
  await screen.settle();
  assert.equal(screen.byType('DictionaryEntryView').props.id, 81);
  screen.timers();
  assert.equal(calls.length, 1, 'Submit cancels the pending typing debounce');
  screen.byType('DictionaryEntryView').props.onBack();
  screen.byId('dictionary-submit').props.onPress();
  await screen.settle();
  screen.byId('dictionary-search').props.onChangeText('work');
  calls[1].resolve({ items: [{ id: 81, term: 'job', meaning: 'việc làm' }], hasMore: false });
  await screen.settle();
  assert.equal(screen.byType('DictionaryEntryView'), undefined, 'Old response cannot reopen a word after editing');
  screen.timers();
  assert.equal(calls.at(-1).term, 'work');
  calls.at(-1).resolve({ items: [{ id: 42, term: 'work', meaning: 'công việc' }], hasMore: false });
  await screen.settle();
  const list = screen.byId('dictionary-results');
  list.props.renderItem({ item: list.props.data[0] }).props.onPress();
  assert.equal(screen.byType('DictionaryEntryView').props.id, 42);
  screen.byId('dictionary-clear').props.onPress();
  await screen.settle();
  assert.equal(screen.byId('dictionary-search').props.value, '');
  assert.equal(screen.byType('DictionaryEntryView'), undefined);
  assert.equal(suggestionCalls.length, 0, 'Ordinary prefix matches never invoke spelling suggestions');

  screen.byId('dictionary-search').props.onChangeText('sincth');
  screen.timers();
  calls.at(-1).resolve({ items: [], hasMore: false });
  await screen.settle();
  assert.equal(suggestionCalls.at(-1).term, 'sincth');
  assert.ok(screen.byId('dictionary-search-loading'), 'Keep the Corvi loading state until suggestions finish');
  suggestionCalls.at(-1).resolve([{ id: 91, term: 'since' }]);
  await screen.settle();
  screen.byType('DictionarySuggestions').props.onAddManual();
  assert.equal(screen.routes.at(-1), '/word', 'A near-match must not prevent deliberate manual creation');
  screen.byType('DictionarySuggestions').props.onPick({ id: 91, term: 'since' });
  assert.equal(screen.byId('dictionary-search').props.value, 'since');
  assert.equal(screen.byType('DictionaryEntryView').props.id, 91);
  calls.at(-1).resolve({ items: [{ id: 91, term: 'since', meaning: 'kể từ' }], hasMore: false });
  await screen.settle();
  screen.byType('DictionaryEntryView').props.onBack();
  assert.equal(screen.byId('dictionary-results').props.data[0].term, 'since');

  screen.byId('dictionary-search').props.onChangeText('oldtypo');
  screen.timers();
  calls.at(-1).resolve({ items: [], hasMore: false });
  await screen.settle();
  screen.byId('dictionary-search').props.onChangeText('hello');
  suggestionCalls.at(-1).resolve([{ id: 91, term: 'since' }]);
  await screen.settle();
  assert.equal(screen.byType('DictionarySuggestions'), undefined, 'Late suggestions cannot replace a newer query');
  screen.byId('dictionary-clear').props.onPress();

  screen.byId('dictionary-search').props.onChangeText('heelo');
  screen.byId('dictionary-submit').props.onPress();
  await screen.settle();
  calls.at(-1).resolve({ items: [], hasMore: false });
  await screen.settle();
  suggestionCalls.at(-1).reject(Error('SQLite suggestion read failed'));
  await screen.settle();
  assert.equal(screen.byType('ErrorBanner').props.message, 'SQLite suggestion read failed', 'Storage failures must not pretend no matches exist');

  screen.byId('dictionary-search').props.onChangeText('zzzzzzz');
  screen.timers();
  calls.at(-1).resolve({ items: [], hasMore: false });
  await screen.settle();
  suggestionCalls.at(-1).resolve([]);
  await screen.settle();
  assert.ok(screen.byId('dictionary-add-manual'), 'Keep deliberate manual entry if there is no close word');
  const picked = [];
  const suggestionList = mount('../components/DictionarySuggestions.tsx', {}, [], {
    items: [{ id: 91, term: 'since' }], onPick: item => picked.push(item),
  });
  suggestionList.byId('dictionary-suggestion-91').props.onPress();
  assert.deepEqual(picked, [{ id: 91, term: 'since' }]);

  const entry = { id: 42, term: 'work', pronunciations: [], hasMore: false, partsOfSpeech: ['noun', 'verb'],
    senses: [{ id: 7, definition: 'công việc', pos: 'noun', subPos: null, example: null },
      { id: 9, definition: 'làm việc', pos: 'verb', subPos: null, example: null }] };
  const btn = (view, sense, index = 0) => find(view.byId('entry-senses').props.renderItem({ item: sense, index }), node => node.props?.accessibilityRole === 'button');
  const header = view => view.byId('entry-senses').props.ListHeaderComponent;
  {
    const rootRequests = [];
    const rootView = mount('../components/DictionaryEntryView.tsx', {
      getDictionaryEntry: async () => entry,
      getDictionaryInflectionRoots: async id => {
        rootRequests.push(id);
        return [{ id: 99, term: 'work' }];
      },
      saveWord: async () => {},
    });
    await rootView.settle();
    await rootView.settle();
    assert.deepEqual(rootRequests, [42]);
    const shortcut = find(
      header(rootView),
      node => node.props?.testID === 'entry-root-shortcut-99',
    );
    assert.ok(shortcut, 'A confirmed root entry appears as a shortcut.');
    shortcut.props.onPress();
    assert.deepEqual(rootView.routes[0], {
      pathname: '/dictionary-entry',
      params: { id: '99' },
    });
  }
  // Saved/frozen matching sense opens its own row; the other sense stays saveable.
  {
    const savedInputs = [];
    const frozen = { id: 123, ...dictionaryDomain.dictionaryDraft(entry, entry.senses[0]), frozen: true };
    const view = mount('../components/DictionaryEntryView.tsx', {
      getDictionaryEntry: async () => entry, saveWord: async input => savedInputs.push(input),
    }, [frozen]);
    await view.settle();
    btn(view, entry.senses[0]).props.onPress(); await view.settle();
    assert.deepEqual(view.routes[0], { pathname: '/word', params: { id: '123' } });
    assert.deepEqual(savedInputs, [], 'Saved/frozen sense must never be overwritten');
    assert.ok(!find(header(view), node => node.props?.testID === 'entry-existing'), 'No blanket headword banner');
    const other = btn(view, entry.senses[1], 1);
    assert.equal(other.props.testID, 'entry-add-9');
    assert.notEqual(other.props.disabled, true);
    other.props.onPress(); await view.settle();
    assert.deepEqual(savedInputs, [dictionaryDomain.dictionaryDraft(entry, entry.senses[1])]);
  }
  // Legacy same-English row with an unmatched meaning must not block.
  {
    const savedInputs = [];
    const view = mount('../components/DictionaryEntryView.tsx', {
      getDictionaryEntry: async () => entry, saveWord: async input => savedInputs.push(input),
    }, [{ id: 5, term: 'WORK', meaning: 'tác phẩm', ipa: '', example: '', note: '', frozen: false }]);
    await view.settle();
    btn(view, entry.senses[0]).props.onPress(); await view.settle();
    assert.deepEqual(view.routes, [], 'Save directly without opening a confirmation form');
    assert.equal(savedInputs.length, 1);
    assert.ok(find(header(view), node => node.props?.testID === 'entry-save-success'));
  }
  const writes = [];
  let completeWrite;
  const direct = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => entry,
    saveWord: input => new Promise(resolve => { writes.push(input); completeWrite = resolve; }),
  });
  await direct.settle();
  assert.equal(find(header(direct), node => node.props?.testID === 'entry-ipa-us').props.children.join(''), '',
    'Leave the American IPA field blank when the dictionary has no American variant.');
  assert.equal(find(header(direct), node => node.props?.testID === 'entry-ipa-uk').props.children.join(''), '',
    'Leave the British IPA field blank when the dictionary has no British variant.');
  const press9 = btn(direct, entry.senses[1], 1).props.onPress;
  press9(); press9(); btn(direct, entry.senses[0]).props.onPress();
  assert.equal(writes.length, 1, 'Pending write lock prevents duplicate taps');
  completeWrite(); await direct.settle();
  press9();
  assert.equal(writes.length, 1, 'Committed sense marker prevents re-save before context refresh');
  assert.equal(btn(direct, entry.senses[1], 1).props.disabled, true);
  const seven = btn(direct, entry.senses[0]);
  assert.equal(seven.props.testID, 'entry-add-7', 'Saving sense 9 leaves sense 7 available');
  assert.notEqual(seven.props.disabled, true);
  seven.props.onPress(); completeWrite(); await direct.settle();
  assert.equal(writes.length, 2);
  assert.deepEqual(writes.map(w => [w.dictionaryEntryId, w.dictionarySenseId]), [[42, 9], [42, 7]]);
  assert.deepEqual(direct.routes, []);
  const regional = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => ({
      ...entry,
      pronunciations: [
        { ipa: '/wɜːrk/', region: 'NAmE' },
        { ipa: '/wɜːk/', region: 'BrE' },
      ],
    }),
    saveWord: async () => {},
  });
  await regional.settle();
  assert.equal(find(header(regional), node => node.props?.testID === 'entry-ipa-us').props.children.join(''), '/wɜːrk/');
  assert.equal(find(header(regional), node => node.props?.testID === 'entry-ipa-uk').props.children.join(''), '/wɜːk/');
  const singleRegional = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => ({
      ...entry,
      pronunciations: [
        { ipa: '/tɛst/', region: 'NAmE' },
        { ipa: '/tɛst/', region: 'BrE' },
      ],
    }),
    saveWord: async () => {},
  });
  await singleRegional.settle();
  assert.equal(find(header(singleRegional), node => node.props?.testID === 'entry-ipa-shared').props.children.join(''), '/tɛst/');
  assert.equal(find(header(singleRegional), node => node.props?.testID === 'entry-ipa-us'), undefined,
    'Identical American and British readings appear once, not as a duplicate.');
  let failures = 0;
  const retrySave = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => entry,
    saveWord: async () => { if (++failures === 1) throw Error('Không thể lưu từ.'); },
  });
  await retrySave.settle();
  const retryPress = () => btn(retrySave, entry.senses[0]).props.onPress();
  retryPress(); await retrySave.settle();
  assert.ok(find(header(retrySave), node => node.type === 'ErrorBanner'));
  assert.equal(btn(retrySave, entry.senses[0]).props.testID, 'entry-add-7', 'Failure does not mark saved');
  retryPress(); await retrySave.settle();
  assert.equal(failures, 2);
  assert.ok(find(header(retrySave), node => node.props?.testID === 'entry-save-success'));
  for (const state of [{ bookLoading: true }, { bookError: 'Không đọc được sổ từ' }]) {
    const blocked = mount('../components/DictionaryEntryView.tsx', {
      ...state, getDictionaryEntry: async () => entry, saveWord: async () => { throw Error('Must not save while blocked'); },
    });
    await blocked.settle();
    const button = find(blocked.byId('entry-senses').props.renderItem({ item: entry.senses[0], index: 0 }), node => node.props?.accessibilityRole === 'button');
    assert.equal(button.props.disabled, true);
    button.props.onPress(); await blocked.settle();
  }
  const pending = [];
  const filteredSaves = [];
  const filteredView = mount('../components/DictionaryEntryView.tsx', {
    saveWord: async input => filteredSaves.push(input),
    getDictionaryEntry: (id, offset, parts) => new Promise((resolve, reject) => pending.push({ id, offset, parts: Array.isArray(parts) ? [...parts] : parts, resolve, reject })),
  });
  await filteredView.settle();
  assert.equal(pending.at(-1).parts, 'first', 'Initial entry query requests the first type in source order');
  pending.at(-1).resolve({ ...entry, senses: [entry.senses[0]], hasMore: true });
  await filteredView.settle();
  assert.deepEqual(filteredView.byType('PartOfSpeechFilter').props.selected, ['noun'], 'Default must follow this entry, not the fixed enum order or All');
  filteredView.byType('PartOfSpeechFilter').props.onChange([]);
  filteredView.byId('entry-senses');
  assert.deepEqual(pending.at(-1).parts, [], 'Explicit All must stay distinct from automatic first type');
  pending.at(-1).resolve({ ...entry, hasMore: true });
  await filteredView.settle();
  filteredView.byType('PartOfSpeechFilter').props.onChange(['noun']);
  assert.equal(filteredView.byId('entry-senses').props.data.length, 0);
  assert.deepEqual(pending.at(-1).parts, ['noun']);
  assert.equal(pending.at(-1).offset, 0);
  pending.at(-1).resolve({ ...entry, senses: [entry.senses[0]], hasMore: true });
  await filteredView.settle();
  filteredView.byId('entry-senses').props.onEndReached();
  assert.equal(pending.at(-1).offset, 1);
  assert.deepEqual(pending.at(-1).parts, ['noun']);
  const oldMore = pending.at(-1);
  filteredView.byType('PartOfSpeechFilter').props.onChange(['verb']);
  filteredView.byId('entry-senses');
  oldMore.resolve({ ...entry, senses: [{ ...entry.senses[0], id: 999 }], hasMore: false });
  pending.at(-1).resolve({ ...entry, senses: [entry.senses[1]], hasMore: false });
  await filteredView.settle();
  assert.deepEqual(filteredView.byId('entry-senses').props.data.map(sense => sense.id), [9], 'Old pagination must not leak nouns into verb results');
  const filteredSense = filteredView.byId('entry-senses').props.renderItem({ item: entry.senses[1], index: 0 });
  find(filteredSense, node => node.props?.testID === 'entry-add-9').props.onPress();
  await filteredView.settle();
  assert.deepEqual(filteredView.routes, []);
  assert.deepEqual(filteredSaves, [dictionaryDomain.dictionaryDraft(entry, entry.senses[1])]);
  filteredView.byType('PartOfSpeechFilter').props.onChange([]);
  filteredView.byId('entry-senses');
  pending.at(-1).reject(Error('Cannot read filtered senses'));
  await filteredView.settle();
  const beforeReset = pending.length;
  find(filteredView.byId('entry-senses').props.ListEmptyComponent, node => node.props?.testID === 'entry-filter-reset').props.onPress();
  filteredView.byId('entry-senses');
  assert.equal(pending.length, beforeReset + 1, 'Reset must retry even if All was already selected when it failed');
  pending.at(-1).resolve(entry);
  await filteredView.settle();
  assert.deepEqual(filteredView.byId('entry-senses').props.data, entry.senses);
  let checklist;
  checklist = mount('../components/PartOfSpeechFilter.tsx', {}, [], {
    available: ['noun', 'verb'], selected: [],
    onChange: selected => checklist.update({ selected }),
  });
  checklist.byId('entry-pos-toggle').props.onPress();
  assert.equal(checklist.byId('entry-pos-adverb').props.disabled, true);
  checklist.byId('entry-pos-noun').props.onPress();
  assert.equal(checklist.byId('entry-pos-noun').props.accessibilityState.checked, true);
  checklist.byId('entry-pos-verb').props.onPress();
  assert.equal(checklist.byId('entry-pos-noun').props.accessibilityState.checked, true);
  assert.equal(checklist.byId('entry-pos-verb').props.accessibilityState.checked, true);
  checklist.byId('entry-pos-noun').props.onPress();
  checklist.byId('entry-pos-verb').props.onPress();
  assert.equal(checklist.byId('entry-pos-all').props.accessibilityState.checked, true);
  const adverbView = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => ({ ...entry, partsOfSpeech: ['adverb', 'verb'], senses: [{ ...entry.senses[0], pos: 'D' }] }),
  });
  await adverbView.settle();
  assert.deepEqual(adverbView.byType('PartOfSpeechFilter').props.selected, ['adverb'], 'A different entry gets its own first type');
  const partSearches = [];
  const partFilterScreen = mount('../app/(tabs)/dictionary.tsx', {
    searchDictionary: (term, offset, courseId, partOfSpeech) =>
      new Promise(resolve => partSearches.push({ term, offset, courseId, partOfSpeech, resolve })),
    suggestDictionary: async () => [],
  });
  partFilterScreen.byId('dictionary-search').props.onChangeText('in');
  partFilterScreen.byId('dictionary-part-filter-open').props.onPress();
  assert.equal(partFilterScreen.byId('dictionary-part-filter-modal').props.visible, true,
    'The POS dropdown opens a native-friendly selection sheet.');
  partFilterScreen.byId('dictionary-part-filter-option-verb').props.onPress();
  await partFilterScreen.settle();
  assert.equal(partSearches.length, 1);
  assert.deepEqual(
    [partSearches[0].term, partSearches[0].offset, partSearches[0].courseId, partSearches[0].partOfSpeech],
    ['in', 0, null, 'verb'],
    'Selecting a part of speech reruns the lookup from the first page.',
  );
  assert.equal(partFilterScreen.byId('dictionary-part-filter-value').props.children.join(''), 'Động từ');
  partSearches[0].resolve({ items: [{ id: 2, term: 'inspect', meaning: 'kiểm tra' }], hasMore: true });
  await partFilterScreen.settle();
  partFilterScreen.byId('dictionary-results').props.onEndReached();
  await partFilterScreen.settle();
  assert.deepEqual(
    [partSearches[1].offset, partSearches[1].partOfSpeech],
    [1, 'verb'],
    'Loading another page keeps the selected part-of-speech filter.',
  );
  partSearches[1].resolve({ items: [], hasMore: false });
  await partFilterScreen.settle();
  partFilterScreen.byId('dictionary-course-filter-ielts-topic').props.onPress();
  await partFilterScreen.settle();
  assert.deepEqual(
    [partSearches[2].offset, partSearches[2].courseId, partSearches[2].partOfSpeech],
    [0, 'ielts-topic', 'verb'],
    'Course and part-of-speech filters remain active together.',
  );
  partSearches[2].resolve({ items: [], hasMore: false });
  await partFilterScreen.settle();
  assert.ok(!readFileSync(join(__dirname, '../components/DictionaryEntryView.tsx'), 'utf8').includes('Bấm Lưu từ ở nghĩa'));
  const tabs = readFileSync(join(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
  assert.deepEqual(
    [...tabs.matchAll(/name="(dictionary|courses|review|index|blank)"/g)].map(match => match[1]),
    ['dictionary', 'courses', 'review', 'index', 'blank'],
    'The currently registered tab screens remain in the expected order.',
  );
  assert.equal(existsSync(join(__dirname, '../app/(tabs)/settings.tsx')), false, 'Settings must not be auto-discovered as a sixth tab');
  assert.ok(existsSync(join(__dirname, '../app/settings.tsx')));
  assert.match(readFileSync(join(__dirname, '../app/_layout.tsx'), 'utf8'), /<Stack\.Screen\s+name="settings"/);
  for (const route of ['courses', 'blank']) assert.ok(existsSync(join(__dirname, `../app/(tabs)/${route}.tsx`)));
  console.log('PASS: POS search dropdown and combined course filter; POS checkbox multi-select/reset/disabled choices; filtered paging and stale-page rejection; retry All; correct sense save; removed hint; example underlines; search/suggestions; per-sense save/open/frozen preservation; legacy same-English not blocking; tab order.');
})().catch(error => { console.error(error); process.exitCode = 1; });
