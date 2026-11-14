const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs, loadDictionaryDomain, srs } = require('./test-support.cjs');
const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const overview = loadTs(join(__dirname, '../domain/review-overview.ts'), { './srs': srs });
const dictionary = loadDictionaryDomain();
const localDictionaryAdditions = loadTs(join(__dirname, '../domain/dictionary-local-additions.ts'));
const exercises = loadTs(join(__dirname, '../domain/review-exercises.ts'), { './dictionary': dictionary });
const reviewResultDetails = loadTs(
  join(__dirname, '../domain/review-result-details.ts'),
  {
    './dictionary': dictionary,
    './dictionary-local-additions': localDictionaryAdditions,
  },
);
assert.deepEqual(
  reviewResultDetails.groupReviewPronunciations([], '/teɪk/'),
  { us: [], uk: [], unspecified: ['/teɪk/'] },
  'Do not label an untagged saved pronunciation as US or UK.',
);
const reviewSession = loadTs(join(__dirname, '../domain/review-session.ts'));
const soundCues = loadTs(join(__dirname, '../domain/sound-cues.ts'));
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const native = Object.fromEntries(['View', 'Text', 'Image', 'Pressable', 'ScrollView', 'TextInput', 'Modal'].map(type => [type, type]));
native.StyleSheet = { create: value => value, hairlineWidth: 1 };
native.Platform = { OS: 'android' };
native.Keyboard = { dismiss() {} };
native.AppState = { addEventListener: () => ({ remove() {} }) };
native.useWindowDimensions = () => ({ width: 400, height: 800, scale: 1, fontScale: 1 });
const tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

// Real screen/component callbacks, controlled context/clock; not a touch E2E.
function mount(file, properties = {}, initial = {}) {
  let now = new Date('2026-11-07T23:59:59').getTime(), dirty = true, cursor, focusCursor, tree;
  const slots = [], effects = [], routes = [], tabOptions = [], focusCallbacks = [];
  let focusCleanups = [];
  const navigation = { setOptions: options => tabOptions.push(options) };
  const context = { words: [], loading: false, error: null, reload: async () => {}, ...initial };
  const speechCalls = [];
  const shareCalls = [];
  native.Share = {
    share: async content => {
      shareCalls.push(content);
      return { action: 'sharedAction' };
    },
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  };
  const comboRewardCalls = [];
  const sessionResultCalls = [];
  const speechContext = {
    ready: true, autoRead: initial.speechAutoRead ?? false, slowRead: false, stopSpeaking: async () => {},
    speakWord: async word => { speechCalls.push(word); },
  };
  const soundContext = {
    ready: true, enabled: true, volume: 0.7, saving: false, error: null,
    unlockFromGesture() {}, play() {}, startLoop() {}, stopLoop() {},
    setEnabled: async () => {}, setVolume: async () => {}, retryLoad: async () => {},
  };
  const react = {
    createElement: element,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => {
        const value = typeof next === 'function' ? next(slots[index]) : next;
        if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
      }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useMemo: callback => callback(),
    useCallback: callback => callback,
    useEffect(callback, deps) {
      const index = cursor++, old = slots[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        const record = { deps }; slots[index] = record;
        effects.push(() => { old?.cleanup?.(); record.cleanup = callback(); });
      }
    },
  };
  const calendarLabel = day => day.split('-').reverse().join('/');
  const loaded = loadTs(join(__dirname, file), {
    react: { ...react, default: react }, 'react-native': native,
    'react-native-keyboard-controller': { KeyboardAvoidingView: 'KeyboardAvoidingView' },
    '@expo/vector-icons': { Feather: 'Feather', MaterialCommunityIcons: 'MaterialCommunityIcons' },
    'expo-router': {
      router: { push: route => routes.push(route) },
      useFocusEffect: callback => { focusCallbacks[focusCursor++] = callback; },
      useNavigation: () => navigation,
    },
    'expo-crypto': { randomUUID: () => 'review-session-test' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }) },
    '@/contexts/VocabularyContext': { useVocabulary: () => context },
    '@/contexts/SpeechPreferencesContext': { useSpeechPreferences: () => speechContext },
    '@/contexts/SoundEffectsContext': { useSoundEffects: () => soundContext },
    '@/data/dictionary': {
      getDictionaryEntry: async () => initial.dictionaryEntry ?? { pronunciations: [] },
    },
    '@/data/offline-regional-pronunciations': {
      getRegionalIpaLookupForTerm: async () => initial.regionalLookup ??
        (initial.regionalPronunciations
          ? { state: 'found', pronunciations: initial.regionalPronunciations }
          : { state: 'not-installed' }),
    },
    '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
    '@/hooks/useReviewClock': { useReviewClock: () => now },
    '@/domain/srs': srs, '@/domain/review-overview': overview, '@/domain/review-exercises': exercises,
    '@/domain/review-session': reviewSession,
    '@/domain/review-result-details': reviewResultDetails,
    '@/domain/sound-cues': soundCues,
    '../assets/images/corvi-app-icon.png': 'corvi-avatar-asset',
    '@/components/KeyboardAwareScrollViewCompat': { KeyboardAwareScrollViewCompat: 'KeyboardAwareScrollViewCompat' },
    '@/components/ui': { Button: 'Button', ErrorBanner: 'ErrorBanner', Skeleton: 'Skeleton', F: {} },
    '@/components/ScreenHeader': { ScreenHeader: 'ScreenHeader', useBottomPad: () => 108 },
    '@/components/ReviewCard': { ReviewCard: 'ReviewCard', calendarLabel },
    '@/components/ReviewMistakeMatchGame': { ReviewMistakeMatchGame: 'ReviewMistakeMatchGame' },
    '@/components/TabBackgroundMusic': { TabBackgroundMusic: 'TabBackgroundMusic' },
    '@/components/ReviewOverview': { SavedTotal: 'SavedTotal', LevelDistributionChart: 'LevelDistributionChart', ReviewStatusBar: 'ReviewStatusBar' },
    '@/data/vocabulary': {
      recordReviewSessionStart: async () => {},
      recordReviewSessionResult: async result => { sessionResultCalls.push(result); },
      getReviewSessionSummaryMetrics: async sessionId => ({
        stoneEarned: comboRewardCalls
          .filter(([input]) => input.sessionId === sessionId)
          .reduce((total, [input]) => total + input.comboLength, 0),
        personalComboRecord: Math.max(0, ...sessionResultCalls.map(result => result.maxCombo)),
      }),
      recordReviewComboReward: async (...args) => {
        if (args[0].comboLength < 20) return false;
        comboRewardCalls.push(args);
        return true;
      },
    },
  });
  const Component = loaded.default ?? loaded.ReviewCard ?? loaded.ReviewMistakeMatchGame ?? loaded.LevelDistributionChart;
  function render() {
    for (let limit = 0; dirty; limit++) {
      assert.ok(limit < 30, 'Render/effects must settle');
      dirty = false; cursor = 0; focusCursor = 0; tree = Component(properties);
      while (effects.length) effects.shift()();
    }
  }
  return {
    routes,
    tabOptions,
    speechCalls,
    shareCalls,
    comboRewardCalls,
    sessionResultCalls,
    byId(id) { render(); return find(tree, node => node.props?.testID === id); },
    byType(type) { render(); return find(tree, node => node.type === type); },
    update(next) { Object.assign(context, next); dirty = true; render(); },
    props(next) { Object.assign(properties, next); dirty = true; render(); },
    time(value) { now = new Date(value).getTime(); dirty = true; render(); },
    focus() {
      focusCleanups.forEach(cleanup => cleanup?.());
      render();
      focusCleanups = focusCallbacks
        .map(callback => callback())
        .filter(cleanup => typeof cleanup === 'function');
      render();
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); focusCleanups.forEach(cleanup => cleanup()); },
    async settle() { render(); await tick(); render(); },
  };
}
const word = { id: 1, term: 'test', meaning: 'test only', ipa: '', example: '', note: '',
  ...srs.initialProgress('2026-11-07') };
async function startReview(screen) {
  screen.byId('review-start').props.onPress();
  await screen.settle();
}

(async () => {
  const savedIdiom = {
    ...word,
    id: 81,
    term: 'break the ice',
    meaning: '(idiom) phá tan bầu không khí ngượng ngùng',
    example: 'She told a joke to break the ice.',
  };
  const idiomMode = mount('../app/(tabs)/review.tsx', {}, {
    words: [savedIdiom, { ...word, id: 82, term: 'ordinary' }],
  });
  idiomMode.byId('review-idiom-start').props.onPress();
  await idiomMode.settle();
  assert.equal(idiomMode.byType('ReviewCard').props.word.id, savedIdiom.id);
  assert.equal(idiomMode.byType('ReviewCard').props.exercise.kind, 'idiom-dialogue');
  assert.equal(idiomMode.byId('review-session-count').props.children.join(''), '0/1',
    'The dedicated session queue includes due idioms only.');
  idiomMode.byType('ReviewCard').props.onCommitted(savedIdiom.id, true);
  idiomMode.byType('ReviewCard').props.onNext();
  await idiomMode.settle();
  assert.equal(idiomMode.byId('review-summary-reviewed').props.children.join(''), '1/1');
  assert.equal(idiomMode.byId('review-summary-correct').props.children.join(''), '1/1',
    'Idiom answers use the same normal review result and SRS path.');
  idiomMode.unmount();

  const idiomOnly = mount('../app/(tabs)/review.tsx', {}, {
    words: [savedIdiom],
  });
  assert.equal(idiomOnly.byId('review-start'), undefined,
    'Idiom-only due words cannot enter the ordinary review mode.');
  assert.ok(idiomOnly.byId('review-idiom-start'),
    'Due idioms remain available in their dedicated dialogue mode.');
  idiomOnly.byId('review-idiom-start').props.onPress();
  await idiomOnly.settle();
  assert.equal(idiomOnly.byType('ReviewCard').props.exercise.kind, 'idiom-dialogue');
  idiomOnly.unmount();

  const mixedDue = mount('../app/(tabs)/review.tsx', {}, {
    words: [savedIdiom, { ...word, id: 83, term: 'ordinary' }],
  });
  await startReview(mixedDue);
  assert.equal(mixedDue.byType('ReviewCard').props.word.term, 'ordinary',
    'The ordinary review session excludes due idioms.');
  assert.notEqual(mixedDue.byType('ReviewCard').props.exercise.kind, 'idiom-dialogue');
  mixedDue.unmount();

  const screen = mount('../app/(tabs)/review.tsx');
  const settingsButton = () => screen.byId('review-open-settings');
  assert.equal(settingsButton().props.accessibilityLabel, 'Mở cài đặt');
  settingsButton().props.onPress();
  assert.equal(screen.routes.at(-1), '/settings');
  assert.equal(screen.byType('SavedTotal').props.total, 0);
  assert.deepEqual(screen.byType('LevelDistributionChart').props.levels.map(row => row.count), [0, 0, 0, 0, 0, 0]);
  assert.ok(screen.byId('review-no-schedule'));
  assert.equal(screen.byId('review-countdown'), undefined, 'No invented countdown without a real next schedule');
  screen.byId('review-add-word').props.onPress();
  assert.equal(screen.routes.at(-1), '/word');
  const tomorrowWord = { ...word, level: 2, nextReviewOn: '2026-11-08' };
  screen.update({ words: [tomorrowWord] });
  assert.equal(screen.byId('review-countdown').props.title, '00:00:01');
  assert.equal(screen.byId('review-start'), undefined);
  screen.time('2026-11-08T00:00:00');
  assert.ok(screen.byId('review-start'), 'Midnight expiry must expose the start button without refresh');
  assert.equal(screen.byType('ReviewCard'), undefined, 'Never auto-start a review at expiry');
  await startReview(screen);
  assert.equal(screen.byType('ReviewCard').props.word.id, 1);
  assert.equal(screen.byId('review-open-settings'), undefined, 'Hide settings while a review is in progress');
  assert.equal(screen.tabOptions.at(-1).tabBarStyle.display, 'none', 'Hide the tab bar during the full-screen review');
  assert.equal(screen.byId('review-session-count').props.children.join(''), '0/1');
  screen.byId('review-back-overview').props.onPress();
  await screen.settle();
  assert.equal(screen.byId('review-summary-title').props.children.join(''), 'Bạn đã ôn được 0 từ!');
  assert.equal(screen.byId('review-summary-grade').props.children.join(''), 'C');
  assert.equal(screen.byId('review-summary-status').props.children.join(''), 'Chưa có câu trả lời để tính tỉ lệ');
  assert.equal(screen.byId('review-summary-reviewed').props.children.join(''), '0/1');
  assert.equal(screen.byId('review-summary-correct').props.children.join(''), '0/0');
  assert.equal(screen.byId('review-summary-accuracy').props.children.join(''), '—');
  assert.equal(screen.byId('review-summary-duration').props.children.join(''), '00:00');
  assert.equal(screen.byId('review-summary-stone').props.children.join(''), '0 Stone');
  assert.equal(screen.byId('review-summary-combo').props.children.join(''), '0');
  assert.equal(screen.byId('review-summary-personal-record').props.children.join(''), '0');
  screen.byId('review-summary-close').props.onPress();
  assert.ok(screen.byId('review-start'));
  assert.ok(settingsButton(), 'Settings return on the overview');
  assert.equal(screen.tabOptions.at(-1).tabBarStyle, undefined, 'Restore the tab bar after leaving the session');
  await startReview(screen);
  screen.byType('ReviewCard').props.onCommitted(1, true);
  screen.byId('review-back-overview').props.onPress();
  await screen.settle();
  assert.equal(screen.byId('review-summary-title').props.children.join(''), 'Bạn đã ôn được 1 từ!');
  assert.equal(screen.byId('review-summary-status').props.children.join(''), 'Kết quả tính đến lúc bạn thoát');
  assert.equal(screen.byId('review-summary-grade').props.children.join(''), 'S',
    'An interrupted session ranks only the words answered before exiting.');
  assert.equal(screen.byId('review-summary-combo').props.children.join(''), '1');
  assert.equal(screen.byId('review-summary-personal-record').props.children.join(''), '1');
  screen.byId('review-summary-close').props.onPress();
  await startReview(screen);
  const question = screen.byType('ReviewCard').props;
  const reviewed = { ...tomorrowWord, ...srs.applyReview(tomorrowWord, true, '2026-11-08') };
  screen.update({ words: [reviewed] });
  question.onCommitted(1, true);
  assert.equal(screen.byType('ReviewCard').props.word, question.word, 'Hold the exact snapshot after save, including the last word');
  screen.update({ error: 'Refresh failed after commit' });
  assert.ok(screen.byType('ReviewCard'), 'A context error must not unmount saved feedback');
  assert.equal(screen.byType('ReviewCard').props.blocked, true);
  screen.byType('ReviewCard').props.onNext();
  assert.ok(screen.byType('ReviewCard'));
  screen.update({ error: null });
  screen.byType('ReviewCard').props.onNext();
  await screen.settle();
  assert.equal(screen.byId('review-summary-title').props.children.join(''), 'Bạn đã ôn được 1 từ!');
  assert.equal(screen.byId('review-summary-grade').props.children.join(''), 'S+');
  assert.equal(screen.byId('review-summary-reviewed').props.children.join(''), '1/1');
  assert.equal(screen.byId('review-summary-correct').props.children.join(''), '1/1');
  assert.equal(screen.byId('review-summary-accuracy').props.children.join(''), '100%');
  screen.byId('review-summary-close').props.onPress();
  assert.ok(screen.byId('review-countdown'));
  screen.time(`${reviewed.nextReviewOn}T00:00:00`);
  assert.equal(screen.byType('ReviewCard'), undefined, 'Finishing must clear session state: a later deadline must not auto-open a card');
  assert.ok(screen.byId('review-start'));
  await startReview(screen);
  screen.focus();
  assert.ok(screen.byId('review-start'), 'Re-entering the tab opens the overview');
  screen.update({ words: [{ ...word, frozen: true, nextReviewOn: null }] });
  assert.ok(screen.byId('review-no-schedule'));
  assert.equal(screen.byId('review-countdown'), undefined);
  assert.ok(screen.byId('review-open-frozen'));
  screen.update({ loading: true });
  assert.equal(screen.byType('LevelDistributionChart'), undefined);
  screen.update({ loading: false, error: 'SQLite error' });
  assert.ok(screen.byType('ErrorBanner'));
  assert.equal(screen.byType('SavedTotal'), undefined, 'Never present error-state zeros as real statistics');

  const earlyWords = [{ ...word, id: 11, term: 'missed', meaning: 'bỏ lỡ', nextReviewOn: '2026-11-07' }];
  const early = mount('../app/(tabs)/review.tsx', {}, { words: earlyWords });
  await startReview(early);
  early.byType('ReviewCard').props.onCommitted(11, false);
  early.byType('ReviewCard');
  early.byId('review-back-overview').props.onPress();
  await early.settle();
  assert.deepEqual(early.byType('ReviewMistakeMatchGame').props.words.map(item => item.id), [11],
    'An incorrect saved answer is offered even when the review ends early');
  assert.equal(early.byId('review-summary-title'), undefined);
  early.byType('ReviewMistakeMatchGame').props.onReturnToReview();
  assert.equal(early.byId('review-summary-reviewed').props.children.join(''), '1/1');
  assert.equal(early.byId('review-summary-stone').props.children.join(''), '0 Stone');
  assert.equal(early.byId('review-summary-combo').props.children.join(''), '0');

  const sevenWords = Array.from({ length: 7 }, (_, index) => ({
    ...word,
    id: index + 20,
    term: `term-${index + 20}`,
    meaning: `meaning-${index + 20}`,
    nextReviewOn: '2026-11-07',
  }));
  const sevenMistakes = mount('../app/(tabs)/review.tsx', {}, { words: sevenWords });
  await startReview(sevenMistakes);
  for (const [index, item] of sevenWords.entries()) {
    const cardProps = sevenMistakes.byType('ReviewCard').props;
    cardProps.onCommitted(item.id, false);
    if (index === 0) cardProps.onCommitted(item.id, false);
    sevenMistakes.byType('ReviewCard');
    sevenMistakes.byType('ReviewCard').props.onNext();
    sevenMistakes.byType('ReviewCard');
  }
  await sevenMistakes.settle();
  const sevenGame = sevenMistakes.byType('ReviewMistakeMatchGame');
  assert.equal(sevenGame.props.words.length, 7, 'The handoff retains all mistakes from sessions longer than five words');
  assert.equal(new Set(sevenGame.props.words.map(item => item.id)).size, 7, 'A repeated failed callback does not duplicate a word');
  assert.equal(sevenMistakes.byId('review-summary-title'), undefined);
  sevenGame.props.onReturnToReview();
  assert.equal(sevenMistakes.byId('review-summary-reviewed').props.children.join(''), '7/7');

  const levels = [0, 2, 4, 0, 0, 10].map((count, index) => ({ level: index + 1, count }));
  const chart = mount('../components/ReviewOverview.tsx', { levels });
  const bar = level => find(chart.byId(`review-level-${level}`), node => node.type === 'View' && typeof node.props.style?.height === 'number');
  assert.equal(bar(1).props.style.height, 0);
  assert.equal(bar(3).props.style.height, bar(2).props.style.height * 2, 'Column heights must be linear on a zero baseline');
  assert.equal(bar(6).props.style.height, 210);
  chart.byId('review-level-6').props.onPress();
  assert.equal(bar(6).props.style.backgroundColor, palette.chartBarStrong);
  assert.equal(chart.byId('review-level-6').props.accessibilityLabel, 'Cấp 6: 10 từ');

  const sentenceDistractors = [
    { ...word, id: 3, term: 'check', meaning: 'kiểm tra', nextReviewOn: '2026-11-10' },
    { ...word, id: 4, term: 'verify', meaning: 'xác minh', nextReviewOn: '2026-11-10' },
  ];
  const both = mount('../app/(tabs)/review.tsx', {}, { words: [
    word,
    { ...word, id: 2, reviewCount: 1, term: 'test', meaning: 'kiểm thử', example: 'They test it.' },
    ...sentenceDistractors,
  ], speechAutoRead: true });
  await startReview(both);
  let current = both.byType('ReviewCard').props;
  assert.deepEqual(both.speechCalls, ['test'], 'Auto-pronunciation remains enabled for non-quiz review cards.');
  assert.equal(current.exercise.kind, 'meaning');
  const stableExercise = current.exercise;
  both.time('2026-11-07T23:59:59.500');
  assert.equal(both.byType('ReviewCard').props.exercise, stableExercise, 'Clock rerenders cannot reshuffle the question or hints');
  current.onCommitted(1, true);
  both.byType('ReviewCard').props.onNext();
  current = both.byType('ReviewCard').props;
  assert.equal(current.word.id, 2);
  assert.equal(current.exercise.kind, 'multiple-choice');
  assert.deepEqual(both.speechCalls, ['test'], 'Multiple-choice review cards do not auto-pronounce the answer.');
  assert.equal(current.exercise.prompt, 'They ________ it.', 'Same English word with a different meaning remains a separate question');
  assert.equal(current.exercise.choices.length, 3, 'Sentence blanks must have three or four choices from the notebook.');
  current.onCommitted(2, false);
  await both.settle();
  assert.equal(both.comboRewardCalls.length, 0,
    'Ending a streak shorter than 20 does not award Stone.');
  assert.equal(both.byId('review-combo-reward'), undefined);
  both.update({ words: [word, { ...word, id: 2 }, { ...word, id: 3 }] });
  both.byType('ReviewCard').props.onNext();
  await both.settle();
  assert.equal(both.byType('ReviewCard'), undefined, 'Original queue only, and processed IDs never regrade even if cached due data is stale');
  const mistakeGame = both.byType('ReviewMistakeMatchGame');
  assert.deepEqual(mistakeGame.props.words.map(item => item.id), [2]);
  assert.equal(both.byId('review-summary-title'), undefined, 'The match game appears before the review result');
  mistakeGame.props.onReturnToReview();
  assert.equal(both.byId('review-summary-title').props.children.join(''), 'Bạn đã ôn được 2 từ!');
  assert.equal(both.byId('review-summary-grade').props.children.join(''), 'B-');
  assert.equal(both.byId('review-summary-reviewed').props.children.join(''), '2/2');
  assert.equal(both.byId('review-summary-correct').props.children.join(''), '1/2');
  assert.equal(both.byId('review-summary-accuracy').props.children.join(''), '50%');
  assert.equal(both.byId('review-summary-stone').props.children.join(''), '0 Stone');
  assert.equal(both.byId('review-summary-combo').props.children.join(''), '1');
  assert.equal(both.byId('review-summary-personal-record').props.children.join(''), '1');
  both.byId('review-summary-close').props.onPress();
  assert.ok(both.byId('review-start'));
  await startReview(both);
  const abandoned = both.byType('ReviewCard').props;
  both.byId('review-back-overview').props.onPress();
  await both.settle();
  both.byId('review-summary-close').props.onPress();
  await startReview(both);
  const fresh = both.byType('ReviewCard').props;
  fresh.onBusyChange(true);
  abandoned.onBusyChange(false);
  assert.equal(both.byId('review-back-overview').props.disabled, true, 'Late callbacks must not unlock another question');
  abandoned.onCommitted(1);
  fresh.onBusyChange(false);
  both.byType('ReviewCard').props.onNext();
  assert.equal(both.byType('ReviewCard').props.word.id, 1, 'Abandoned session cannot mark a new session committed');

  const makeProps = (item = word) => ({ word: item, exercise: exercises.createReviewExercise(item, 0),
    blocked: false, isLast: false, onCommitted() {}, onBusyChange() {}, onNext() {} });
  const sentenceWord = { ...word, term: 'test', meaning: 'kiểm thử', example: 'They test it.' };
  const sentenceWords = [
    sentenceWord,
    { ...word, id: 2, term: 'check' },
    { ...word, id: 3, term: 'verify' },
  ];
  const sentenceExercise = exercises.createReviewExercise(sentenceWord, 1, 0, sentenceWords);
  assert.equal(sentenceExercise.kind, 'multiple-choice');
  const fragmentWord = {
    ...sentenceWord,
    id: 91,
    term: 'terrific',
    meaning: 'Hoàn hảo, kỳ diệu',
    example: 'Grudge terrific',
  };
  const fragmentExercise = exercises.createReviewExercise(fragmentWord, 1);
  assert.equal(fragmentExercise.kind, 'meaning',
    'Do not turn a two-word fragment into a sentence question.');
  const fragmentCard = mount('../components/ReviewCard.tsx', {
    ...makeProps(fragmentWord),
    exercise: fragmentExercise,
  }, { recordReview: async () => {} });
  fragmentCard.byId('review-answer-input').props.onChangeText('terrific');
  fragmentCard.byId('review-check').props.onPress();
  await fragmentCard.settle();
  assert.equal(find(fragmentCard.byId('review-result-details'), node =>
    node.type === 'Text' && node.props.children === fragmentWord.example), undefined,
  'Do not repeat a malformed short fragment in review feedback.');
  const resultFreezeCalls = [];
  const sentenceCard = mount('../components/ReviewCard.tsx', {
    ...makeProps(sentenceWord),
    exercise: sentenceExercise,
  }, {
    speechAutoRead: true,
    regionalPronunciations: [
      { ipa: '/test-us/', region: 'NAmE' },
      { ipa: '/test-uk/', region: 'BrE' },
    ],
    recordReview: async () => {},
    setWordFrozen: async (...args) => { resultFreezeCalls.push(args); },
  });
  assert.ok(sentenceCard.byId('review-choice-options'));
  assert.equal(sentenceCard.byId('review-speak-word'), undefined,
    'Multiple-choice questions do not show a pronunciation button.');
  assert.equal(sentenceCard.byId('review-answer-input'), undefined,
    'Sentence questions now select an answer instead of typing into the blank.');
  assert.equal(sentenceCard.byId('review-choice-0').props.accessibilityRole, 'button');
  sentenceCard.byId('review-choice-0').props.onPress();
  await sentenceCard.settle();
  assert.deepEqual(sentenceCard.speechCalls, ['test'],
    'Auto-pronounce the word when the multiple-choice result appears.');
  assert.equal(sentenceCard.byId('review-result-modal'), undefined,
    'Do not open a separate word-information popup after grading.');
  assert.ok(sentenceCard.byId('review-result-details-scroll'),
    'Show the scrollable word information inside the answer card immediately.');
  assert.equal(find(sentenceCard.byId('review-result'), node =>
    node.type === 'Text' && node.props.children === 'Chưa đúng'), undefined,
  'Do not label an incorrect answer as “Chưa đúng”.');
  assert.equal(sentenceCard.byId('review-result-ipa-us').props.children.join(''), '/test-us/',
    'Show American IPA with its explicit US marker.');
  assert.equal(sentenceCard.byId('review-result-ipa-uk').props.children.join(''), '/test-uk/',
    'Show British IPA on a separate line with its explicit UK marker.');
  assert.equal(sentenceCard.byId('review-result-ipa-unspecified'), undefined,
    'Do not add a regional IPA row when there is no unlabelled saved pronunciation.');
  assert.ok(find(sentenceCard.byId('review-result-details'), node =>
    node.type === 'Text' && (Array.isArray(node.props.children) ? node.props.children.join('') : node.props.children) === sentenceWord.example),
  'Show the dictionary example inside the combined answer card.');
  assert.equal(
    sentenceCard.byId('review-result-example-translation'),
    undefined,
    'Leave an unsupported example untranslated in review feedback.',
  );
  assert.equal(
    sentenceCard.byId('review-result-meaning').props.children.join(''),
    sentenceWord.meaning,
    'Always include the saved Vietnamese meaning in the combined answer card.',
  );
  assert.ok(sentenceCard.byId('review-result-actions'));
  sentenceCard.byId('review-result-report').props.onPress();
  assert.ok(sentenceCard.byId('review-report-dialog'));
  sentenceCard.byId('review-report-reason-example').props.onPress();
  sentenceCard.byId('review-report-note').props.onChangeText('The example does not match this meaning.');
  sentenceCard.byId('review-report-share').props.onPress();
  await sentenceCard.settle();
  assert.equal(sentenceCard.shareCalls.length, 1);
  assert.match(sentenceCard.shareCalls[0].message, /Từ: test/u);
  assert.match(sentenceCard.shareCalls[0].message, /Loại lỗi: Ví dụ chưa đúng/u);
  assert.match(sentenceCard.shareCalls[0].message, /Nghĩa hiện tại: kiểm thử/u);
  assert.match(sentenceCard.shareCalls[0].message, /Câu ví dụ: They test it\./u);
  assert.match(sentenceCard.shareCalls[0].message, /Ghi chú: The example does not match this meaning\./u);
  assert.equal(sentenceCard.byId('review-report-dialog'), undefined,
    'Close the report form after opening the native share sheet.');
  sentenceCard.byId('review-result-speak-word').props.onPress();
  assert.deepEqual(sentenceCard.speechCalls, ['test', 'test'],
    'Keep a manual pronunciation control beside the phonetic transcription.');
  sentenceCard.byId('review-result-freeze').props.onPress();
  assert.ok(sentenceCard.byId('review-freeze-dialog'));
  assert.deepEqual(resultFreezeCalls, [], 'Opening the freeze confirmation must not freeze the word yet.');
  sentenceCard.byId('review-freeze-cancel').props.onPress();
  assert.equal(sentenceCard.byId('review-freeze-dialog'), undefined,
    'Choosing “Không” closes the confirmation without freezing.');
  sentenceCard.byId('review-result-freeze').props.onPress();
  sentenceCard.byId('review-freeze-confirm').props.onPress();
  await sentenceCard.settle();
  assert.deepEqual(resultFreezeCalls, [[sentenceWord.id, true]],
    'Choosing “Có” freezes the answered word without grading it a second time.');
  assert.ok(sentenceCard.byId('review-result-frozen'));
  sentenceCard.unmount();

  for (const [state, expected] of [
    ['not-installed', 'Chưa cài gói IPA Anh-Anh · tải gói trong Cài đặt'],
    ['not-found', 'Gói đã cài nhưng không có mục Anh-Anh cho từ này'],
    ['damaged', 'Gói IPA bị lỗi · hãy cài lại trong Cài đặt'],
    ['failed', 'Tra cứu IPA Anh-Anh thất bại · hãy thử lại'],
  ]) {
    const missingIpaCard = mount('../components/ReviewCard.tsx', {
      ...makeProps({ ...word, dictionaryEntryId: null, ipa: '' }),
    }, {
      regionalLookup: { state },
      recordReview: async () => {},
    });
    missingIpaCard.byId('review-answer-input').props.onChangeText('test');
    missingIpaCard.byId('review-check').props.onPress();
    await missingIpaCard.settle();
    assert.equal(
      missingIpaCard.byId('review-result-ipa-uk').props.children.join(''),
      expected,
      `Report ${state} distinctly in the UK IPA row.`,
    );
    assert.equal(
      missingIpaCard.byId('review-result-ipa-us').props.children.join(''),
      'Chưa có dữ liệu',
      `Do not present a missing ${state} lookup as US IPA.`,
    );
    missingIpaCard.unmount();
  }

  const untaggedIpaCard = mount('../components/ReviewCard.tsx', {
    ...makeProps({ ...word, dictionaryEntryId: null, ipa: '/æmbɪɡjuəs/' }),
  }, {
    regionalLookup: { state: 'not-installed' },
    recordReview: async () => {},
  });
  untaggedIpaCard.byId('review-answer-input').props.onChangeText('test');
  untaggedIpaCard.byId('review-check').props.onPress();
  await untaggedIpaCard.settle();
  assert.equal(
    untaggedIpaCard.byId('review-result-ipa-us').props.children.join(''),
    'Chưa có dữ liệu',
    'Do not guess that an old untagged saved IPA is American.',
  );
  assert.equal(
    untaggedIpaCard.byId('review-result-ipa-unspecified').props.children.join(''),
    '/æmbɪɡjuəs/',
    'Show an untagged saved IPA without assigning it to either accent.',
  );
  untaggedIpaCard.unmount();

  const translatedWord = {
    ...sentenceWord,
    id: 93,
    term: 'reciprocate',
    example: 'It is important to reciprocate a favor kindly.',
  };
  const translatedExercise = exercises.createReviewExercise(
    translatedWord,
    1,
    0,
    [
      translatedWord,
      { ...word, id: 94, term: 'return' },
      { ...word, id: 95, term: 'respond' },
    ],
  );
  const translatedCard = mount('../components/ReviewCard.tsx', {
    ...makeProps(translatedWord),
    exercise: translatedExercise,
  }, { recordReview: async () => {} });
  translatedCard.byId('review-choice-0').props.onPress();
  await translatedCard.settle();
  assert.equal(
    translatedCard.byId('review-result-example-translation').props.children.join(''),
    'Điều quan trọng là đáp lại một ân huệ một cách tử tế.',
    'Display the full Vietnamese translation inside the combined answer card.',
  );

  let resolveSave;
  const calls = [], committed = [];
  let nexts = 0;
  const card = mount('../components/ReviewCard.tsx', { ...makeProps(), onCommitted: id => committed.push(id), onNext: () => nexts++ }, {
    recordReview: (...args) => new Promise(resolve => { calls.push(args); resolveSave = resolve; }),
  });
  assert.ok(find(card.byId('review-inline-meaning'), node => node.props?.testID === 'review-answer-input'),
    'Meaning answer must be entered in the answer blank below the meaning');
  const initialSlots = Array.from({ length: 4 }, (_, index) =>
    card.byId(`review-letter-value-${index}`).props.children.join(''));
  assert.ok(initialSlots.some(Boolean), 'Level 1 shows revealed letters in their own slots');
  const letterColor = index => card.byId(`review-letter-value-${index}`).props.style
    .find(style => style && typeof style === 'object' && 'color' in style).color;
  const letterOpacity = index => card.byId(`review-letter-value-${index}`).props.style
    .find(style => style && typeof style === 'object' && 'opacity' in style).opacity;
  const hintIndex = initialSlots.findIndex(Boolean);
  const hintColor = letterColor(hintIndex);
  const hintOpacity = letterOpacity(hintIndex);
  assert.equal(card.byId('flashcard'), undefined);
  assert.equal(card.byId('review-correct'), undefined);
  assert.equal(card.byId('review-answer-correct'), undefined);
  assert.equal(card.byId('review-check').props.disabled, true);
  const answerInput = card.byId('review-answer-input');
  answerInput.props.onSubmitEditing();
  assert.equal(calls.length, 0, 'Empty answer must not submit');
  answerInput.props.onFocus();
  assert.ok(card.byId('review-cursor-0'), 'Show the visible cursor in the first answer cell while focused');
  answerInput.props.onChangeText('X');
  const afterOneLetter = Array.from({ length: 4 }, (_, index) =>
    card.byId(`review-letter-value-${index}`).props.children.join(''));
  assert.equal(afterOneLetter[0], 'X', 'Typed letter overwrites the hint in the same slot');
  assert.ok(card.byId('review-cursor-1'), 'Move the visible cursor to the next answer cell');
  assert.notEqual(letterColor(0), hintColor, 'Typed letters use a stronger color than the hints');
  assert.ok(letterOpacity(0) > hintOpacity, 'Hints are more transparent than typed letters');
  assert.deepEqual(afterOneLetter.slice(1), initialSlots.slice(1), 'Hints in untouched slots remain visible');
  card.byId('review-answer-input').props.onChangeText('  TEST ');
  const answer = card.byId('review-check').props.onPress;
  answer(); answer();
  assert.deepEqual(calls, [[1, true, 0]]);
  card.byId('review-continue').props.onPress();
  assert.equal(nexts, 0, 'Cannot continue before save completes');
  resolveSave(); await card.settle();
  assert.deepEqual(committed, [1]);
  assert.ok(card.byId('review-result'));
  assert.ok(card.byId('review-answer-correct'));
  assert.equal(card.byId('review-result-modal'), undefined);
  assert.ok(card.byId('review-result-details'),
    'Word details are visible from the first answer result state.');
  const resultPanelStyles = card.byId('review-result').props.style;
  assert.ok(resultPanelStyles.some(style => style?.position === 'absolute'),
    'Keep the expanded answer and word details anchored beneath the review question.');
  assert.ok(resultPanelStyles.find(style => style?.height)?.height > 272,
    'The combined answer card is large enough to show word details without opening a popup.');
  assert.ok(find(card.byId('review-result'), node => node.props?.testID === 'review-continue'),
    'Continue stays available in the combined answer card.');
  assert.equal(card.byId('review-continue').props.style.minHeight, 68,
    'Continue button is larger for the full-screen review session');
  card.byId('review-continue').props.onPress();
  assert.equal(nexts, 1);
  assert.equal(calls.length, 1, 'Continue never persists another grade');

  const invisibleSpaceCalls = [];
  const multiWord = { ...word, term: 'find out', meaning: 'phát hiện ra', level: 4 };
  const invisibleSpaceCard = mount('../components/ReviewCard.tsx', makeProps(multiWord), {
    recordReview: async (...args) => { invisibleSpaceCalls.push(args); },
  });
  const multiWordInput = invisibleSpaceCard.byId('review-answer-input');
  multiWordInput.props.onFocus();
  multiWordInput.props.onChangeText('find\u200Bout');
  assert.equal(invisibleSpaceCard.byId('review-answer-input').props.value, 'findout',
    'Whitespace and invisible separators are removed from typed input.');
  const displayedMultiWord = [0, 1, 2, 3, 5, 6, 7].map(index =>
    invisibleSpaceCard.byId(`review-letter-value-${index}`).props.children.join('')).join('');
  assert.equal(displayedMultiWord, 'findout',
    'Characters fill consecutive boxes while the answer slots retain their word gap.');
  assert.equal(invisibleSpaceCard.byId('review-letter-slot-4'), undefined,
    'The visual word boundary remains a gap, not an editable letter slot.');
  assert.ok(invisibleSpaceCard.byId('review-cursor-7'), 'Keep the cursor aligned after the normalized final character');
  invisibleSpaceCard.byId('review-check').props.onPress();
  await invisibleSpaceCard.settle();
  assert.deepEqual(invisibleSpaceCalls, [[1, true, 0]],
    'A zero-width word separator from the mobile keyboard must still grade the visible answer correctly');

  const immediateCalls = [];
  const immediateCard = mount('../components/ReviewCard.tsx', makeProps(multiWord), {
    recordReview: async (...args) => { immediateCalls.push(args); },
  });
  const immediateInput = immediateCard.byId('review-answer-input');
  const submitFromPreviousRender = immediateCard.byId('review-check').props.onPress;
  immediateInput.props.onChangeText('find out');
  submitFromPreviousRender();
  await immediateCard.settle();
  assert.deepEqual(immediateCalls, [[1, true, 0]],
    'Submission reads the latest native input value even before React rerenders');

  const retryCalls = [];
  let rejectFirst, retryResolve;
  const failureCard = mount('../components/ReviewCard.tsx', makeProps(), {
    recordReview: (...args) => new Promise((resolve, reject) => {
      retryCalls.push(args);
      if (retryCalls.length === 1) rejectFirst = reject; else retryResolve = resolve;
    }),
  });
  failureCard.byId('review-answer-input').props.onChangeText('wrong');
  failureCard.byId('review-check').props.onPress();
  rejectFirst(Error('Disk full')); await failureCard.settle();
  assert.equal(failureCard.byId('review-answer-input').props.editable, false);
  failureCard.byId('review-answer-input').props.onChangeText('test');
  const retry = failureCard.byId('review-retry-save').props.onPress;
  retry(); retry();
  assert.deepEqual(retryCalls, [[1, false, 0], [1, false, 0]], 'Retry must retain wrong outcome and reject duplicate clicks');
  retryResolve(); await failureCard.settle();
  failureCard.props({ blocked: true });
  assert.equal(failureCard.byId('review-continue').props.disabled, true);

  const unknownCalls = [];
  const unknown = mount('../components/ReviewCard.tsx', makeProps(), { recordReview: async (...args) => unknownCalls.push(args) });
  const dontKnow = unknown.byId('review-dont-know').props.onPress;
  dontKnow(); dontKnow(); await unknown.settle();
  assert.deepEqual(unknownCalls, [[1, false, 0]]);
  for (const level of [4, 5, 6]) {
    const high = mount('../components/ReviewCard.tsx', makeProps({ ...word, level }));
    assert.equal(high.byId('review-letter-hint'), undefined);
    assert.equal(high.byId('review-answer-correct'), undefined);
    assert.equal(high.byId('review-answer-input').props.autoCorrect, false);
    assert.equal(high.byId('review-answer-input').props.spellCheck, false);
    const highLevelSlots = Array.from({ length: 4 }, (_, index) =>
      high.byId(`review-letter-value-${index}`).props.children.join(''));
    assert.ok(highLevelSlots.every(value => !value.trim()),
      'High-level reviews keep all letter slots blank without revealing hints');
  }
  const cloze = mount('../components/ReviewCard.tsx', {
    ...makeProps(),
    exercise: { kind: 'cloze', prompt: 'They ________ it.', hint: 't___' },
  });
  assert.ok(find(cloze.byId('review-inline-sentence'), node => node.props?.testID === 'review-answer-input'),
    'Cloze answer must be entered directly inside the sentence blank');
  assert.equal(cloze.byId('review-letter-value-0').props.children.join(''), 't');
  cloze.byId('review-answer-input').props.onChangeText('a');
  assert.equal(cloze.byId('review-letter-value-0').props.children.join(''), 'a');
  assert.equal(cloze.byId('review-letter-value-1').props.children.join(''), '',
    'Typing in one slot must not remove or replace hints in other slots');
  const idiomDialogExercise = exercises.createIdiomDialogueExercise(savedIdiom);
  const idiomAnswerCalls = [];
  const idiomCard = mount('../components/ReviewCard.tsx', {
    ...makeProps(savedIdiom),
    exercise: idiomDialogExercise,
  }, {
    recordReview: async (...args) => idiomAnswerCalls.push(args),
  });
  assert.ok(idiomCard.byId('review-dialogue-question'));
  assert.ok(idiomCard.byId('review-dialogue-reply'));
  assert.equal(idiomCard.byId('review-dialogue-corvi-avatar').props.source, 'corvi-avatar-asset',
    'Show the bundled Corvi portrait as the speaker avatar.');
  assert.ok(find(idiomCard.byId('review-dialogue-question'), node =>
    node.type === 'Text' && String(node.props?.children ?? '') === 'Corvi'),
  'Label Corvi as the first speaker.');
  assert.ok(find(idiomCard.byId('review-dialogue-reply'), node =>
    node.type === 'Text' && String(node.props?.children ?? '') === 'Bạn'),
  'Render the learner as the second speaker.');
  assert.ok(find(idiomCard.byId('review-dialogue-question'), node =>
    node.type === 'Text' && String(node.props?.children ?? '').includes('phá tan bầu không khí ngượng ngùng')),
  'The dialogue prompt states the Vietnamese meaning as a recall cue.');
  idiomCard.byId('review-answer-input').props.onChangeText('break the ice');
  idiomCard.byId('review-check').props.onPress();
  await idiomCard.settle();
  assert.deepEqual(idiomAnswerCalls, [[savedIdiom.id, true, 0]],
    'Dialogue idioms grade through the normal SRS review callback.');
  assert.ok(find(idiomCard.byId('review-result-details'), node =>
    node.type === 'Text' && (Array.isArray(node.props.children) ? node.props.children.join('') : node.props.children) === savedIdiom.meaning),
  'The idiom meaning is shown after answering.');
  const freezeCalls = [];
  const freezeCard = mount('../components/ReviewCard.tsx', makeProps(), {
    setWordFrozen: async (...args) => { freezeCalls.push(args); },
    recordReview: async () => { throw Error('Freeze must not grade'); },
  });
  const freeze = freezeCard.byId('review-freeze').props.onPress;
  freeze(); freeze(); await freezeCard.settle();
  assert.deepEqual(freezeCalls, [[1, true]]);
  let finishLate;
  const lateCommits = [], busyChanges = [];
  const leaving = mount('../components/ReviewCard.tsx', { ...makeProps(),
    onCommitted: id => lateCommits.push(id), onBusyChange: busy => busyChanges.push(busy) }, {
    recordReview: () => new Promise(resolve => { finishLate = resolve; }),
  });
  leaving.byId('review-answer-input').props.onChangeText('test');
  leaving.byId('review-check').props.onPress();
  leaving.unmount();
  const afterUnmount = busyChanges.length;
  finishLate(); await tick();
  assert.equal(busyChanges.length, afterUnmount);
  assert.deepEqual(lateCommits, []);
  const comboWords = Array.from({ length: 25 }, (_, index) => ({
    ...word,
    id: index + 1,
    level: 2,
    nextReviewOn: '2026-11-08',
  }));
  const comboScreen = mount('../app/(tabs)/review.tsx', {}, { words: comboWords });
  comboScreen.time('2026-11-08T00:00:00');
  await startReview(comboScreen);
  assert.equal(
    comboScreen.byId('review-combo-counter').props.accessibilityLabel,
    'Combo 0 câu đúng liên tiếp',
  );
  let lastComboNotice = null;
  for (const [index, comboWord] of comboWords.entries()) {
    comboScreen.byType('ReviewCard').props.onCommitted(comboWord.id, true);
    const comboCount = index + 1;
    assert.equal(
      comboScreen.byId('review-combo-counter').props.accessibilityLabel,
      `Combo ${comboCount} câu đúng liên tiếp`,
    );
    if ([5, 10, 25].includes(comboCount)) {
      lastComboNotice = comboCount;
    }
    if (lastComboNotice !== null) {
      assert.equal(
        comboScreen.byId('review-combo-notice').props.accessibilityLabel,
        `Combo ${lastComboNotice} câu đúng liên tiếp!`,
      );
    } else {
      assert.equal(comboScreen.byId('review-combo-notice'), undefined);
    }
    if (index < comboWords.length - 1) {
      comboScreen.byType('ReviewCard').props.onNext();
    }
  }
  comboScreen.byId('review-back-overview').props.onPress();
  await comboScreen.settle();
  assert.equal(comboScreen.comboRewardCalls.length, 1);
  assert.equal(comboScreen.comboRewardCalls[0][0].comboLength, 25,
    'A streak of at least 20 receives Stone when the session ends.');
  assert.equal(comboScreen.byId('review-combo-reward').props.accessibilityLabel,
    'Chuỗi 25 câu được thưởng 25 Stone');
  assert.equal(comboScreen.byId('review-summary-stone').props.children.join(''), '25 Stone');
  assert.equal(comboScreen.byId('review-summary-combo').props.children.join(''), '25');
  assert.equal(comboScreen.byId('review-summary-personal-record').props.children.join(''), '25');
  comboScreen.unmount();
  console.log('PASS: mixed queue and stable snapshots; final feedback held; auto grading/check/dont-know/freeze locks; immutable retry and double-retry guard; no hints4–6; global read error retention; stale callbacks; dashboard/countdown/chart.');
})().catch(error => { console.error(error); process.exitCode = 1; });
