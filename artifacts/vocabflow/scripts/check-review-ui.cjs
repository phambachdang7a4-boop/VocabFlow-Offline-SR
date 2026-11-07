const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs, srs } = require('./test-support.cjs');
const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const overview = loadTs(join(__dirname, '../domain/review-overview.ts'), { './srs': srs });
const dictionary = loadTs(join(__dirname, '../domain/dictionary.ts'));
const exercises = loadTs(join(__dirname, '../domain/review-exercises.ts'), { './dictionary': dictionary });
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'TextInput'].map(type => [type, type]));
native.StyleSheet = { create: value => value };
native.Platform = { OS: 'android' };
native.Keyboard = { dismiss() {} };
const tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

// Real screen/component callbacks, controlled context/clock; not a touch E2E.
function mount(file, properties = {}, initial = {}) {
  let now = new Date('2026-11-07T23:59:59').getTime(), dirty = true, cursor, tree, focus, focusCleanup;
  const slots = [], effects = [], routes = [], tabOptions = [];
  const tabs = { setOptions: options => tabOptions.push(options) };
  const navigation = { getParent: () => tabs };
  const context = { words: [], loading: false, error: null, reload: async () => {}, ...initial };
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
    '@expo/vector-icons': { Feather: 'Feather' },
    'expo-router': { router: { push: route => routes.push(route) }, useFocusEffect: callback => { focus = callback; }, useNavigation: () => navigation },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }) },
    '@/contexts/VocabularyContext': { useVocabulary: () => context },
    '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
    '@/hooks/useReviewClock': { useReviewClock: () => now },
    '@/domain/srs': srs, '@/domain/review-overview': overview, '@/domain/review-exercises': exercises,
    '@/components/KeyboardAwareScrollViewCompat': { KeyboardAwareScrollViewCompat: 'KeyboardAwareScrollViewCompat' },
    '@/components/ui': { Button: 'Button', ErrorBanner: 'ErrorBanner', Skeleton: 'Skeleton', F: {} },
    '@/components/ScreenHeader': { ScreenHeader: 'ScreenHeader', useBottomPad: () => 108 },
    '@/components/ReviewCard': { ReviewCard: 'ReviewCard', calendarLabel },
    '@/components/ReviewOverview': { SavedTotal: 'SavedTotal', LevelDistributionChart: 'LevelDistributionChart', ReviewStatusBar: 'ReviewStatusBar' },
  });
  const Component = loaded.default ?? loaded.ReviewCard ?? loaded.LevelDistributionChart;
  function render() {
    for (let limit = 0; dirty; limit++) {
      assert.ok(limit < 30, 'Render/effects must settle');
      dirty = false; cursor = 0; tree = Component(properties);
      while (effects.length) effects.shift()();
    }
  }
  return {
    routes,
    tabOptions,
    byId(id) { render(); return find(tree, node => node.props?.testID === id); },
    byType(type) { render(); return find(tree, node => node.type === type); },
    update(next) { Object.assign(context, next); dirty = true; render(); },
    props(next) { Object.assign(properties, next); dirty = true; render(); },
    time(value) { now = new Date(value).getTime(); dirty = true; render(); },
    focus() { focusCleanup?.(); render(); focusCleanup = focus(); render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); focusCleanup?.(); },
    async settle() { render(); await tick(); render(); },
  };
}
const word = { id: 1, term: 'test', meaning: 'test only', ipa: '', example: '', note: '',
  ...srs.initialProgress('2026-11-07') };

(async () => {
  const screen = mount('../app/(tabs)/review.tsx');
  const settingsButton = () => find(screen.byType('ScreenHeader').props.right, node => node.props?.testID === 'review-open-settings');
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
  screen.byId('review-start').props.onPress();
  assert.equal(screen.byType('ReviewCard').props.word.id, 1);
  assert.equal(screen.byId('review-open-settings'), undefined, 'Hide settings while a review is in progress');
  assert.equal(screen.tabOptions.at(-1).tabBarStyle.display, 'none', 'Hide the tab bar during the full-screen review');
  assert.equal(screen.byId('review-session-count').props.children.join(''), '0/1');
  screen.byId('review-back-overview').props.onPress();
  assert.ok(screen.byId('review-start'));
  assert.ok(settingsButton(), 'Settings return on the overview');
  assert.equal(screen.tabOptions.at(-1).tabBarStyle, undefined, 'Restore the tab bar after leaving the session');
  screen.byId('review-start').props.onPress();
  const question = screen.byType('ReviewCard').props;
  const reviewed = { ...tomorrowWord, ...srs.applyReview(tomorrowWord, true, '2026-11-08') };
  screen.update({ words: [reviewed] });
  question.onCommitted(1);
  assert.equal(screen.byType('ReviewCard').props.word, question.word, 'Hold the exact snapshot after save, including the last word');
  screen.update({ error: 'Refresh failed after commit' });
  assert.ok(screen.byType('ReviewCard'), 'A context error must not unmount saved feedback');
  assert.equal(screen.byType('ReviewCard').props.blocked, true);
  screen.byType('ReviewCard').props.onNext();
  assert.ok(screen.byType('ReviewCard'));
  screen.update({ error: null });
  screen.byType('ReviewCard').props.onNext();
  assert.ok(screen.byId('review-countdown'));
  screen.time(`${reviewed.nextReviewOn}T00:00:00`);
  assert.equal(screen.byType('ReviewCard'), undefined, 'Finishing must clear session state: a later deadline must not auto-open a card');
  assert.ok(screen.byId('review-start'));
  screen.byId('review-start').props.onPress();
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

  const levels = [0, 2, 4, 0, 0, 10].map((count, index) => ({ level: index + 1, count }));
  const chart = mount('../components/ReviewOverview.tsx', { levels });
  const bar = level => find(chart.byId(`review-level-${level}`), node => node.type === 'View' && typeof node.props.style?.height === 'number');
  assert.equal(bar(1).props.style.height, 0);
  assert.equal(bar(3).props.style.height, bar(2).props.style.height * 2, 'Column heights must be linear on a zero baseline');
  assert.equal(bar(6).props.style.height, 210);
  chart.byId('review-level-6').props.onPress();
  assert.equal(bar(6).props.style.backgroundColor, palette.chartBarStrong);
  assert.equal(chart.byId('review-level-6').props.accessibilityLabel, 'Cấp 6: 10 từ');

  const both = mount('../app/(tabs)/review.tsx', {}, { words: [word, { ...word, id: 2, reviewCount: 1, term: 'test', meaning: 'kiểm thử', example: 'They test it.' }] });
  both.byId('review-start').props.onPress();
  let current = both.byType('ReviewCard').props;
  assert.equal(current.exercise.kind, 'meaning');
  const stableExercise = current.exercise;
  both.time('2026-11-07T23:59:59.500');
  assert.equal(both.byType('ReviewCard').props.exercise, stableExercise, 'Clock rerenders cannot reshuffle the question or hints');
  current.onCommitted(1);
  both.byType('ReviewCard').props.onNext();
  current = both.byType('ReviewCard').props;
  assert.equal(current.word.id, 2);
  assert.equal(current.exercise.kind, 'cloze');
  assert.equal(current.exercise.prompt, 'They ________ it.', 'Same English word with a different meaning remains a separate question');
  current.onCommitted(2);
  both.update({ words: [word, { ...word, id: 2 }, { ...word, id: 3 }] });
  both.byType('ReviewCard').props.onNext();
  assert.equal(both.byType('ReviewCard'), undefined, 'Original queue only, and processed IDs never regrade even if cached due data is stale');
  assert.ok(both.byId('review-start'));
  both.byId('review-start').props.onPress();
  const abandoned = both.byType('ReviewCard').props;
  both.byId('review-back-overview').props.onPress();
  both.byId('review-start').props.onPress();
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
  let resolveSave;
  const calls = [], committed = [];
  let nexts = 0;
  const card = mount('../components/ReviewCard.tsx', { ...makeProps(), onCommitted: id => committed.push(id), onNext: () => nexts++ }, {
    recordReview: (...args) => new Promise(resolve => { calls.push(args); resolveSave = resolve; }),
  });
  assert.ok(find(card.byId('review-inline-meaning'), node => node.props?.testID === 'review-answer-input'),
    'Meaning answer must be entered in the answer blank below the meaning');
  assert.ok(card.byId('review-answer-input').props.placeholder.includes('t'),
    'The level hint must be shown inside the answer blank');
  assert.equal(card.byId('flashcard'), undefined);
  assert.equal(card.byId('review-correct'), undefined);
  assert.equal(card.byId('review-answer-correct'), undefined);
  assert.equal(card.byId('review-check').props.disabled, true);
  card.byId('review-answer-input').props.onSubmitEditing();
  assert.equal(calls.length, 0, 'Empty answer must not submit');
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
  card.byId('review-continue').props.onPress();
  assert.equal(nexts, 1);
  assert.equal(calls.length, 1, 'Continue never persists another grade');

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
    assert.ok(/^_/.test(high.byId('review-answer-input').props.placeholder),
      'High-level reviews show only blank letter slots, not a letter hint');
  }
  const cloze = mount('../components/ReviewCard.tsx', {
    ...makeProps(),
    exercise: { kind: 'cloze', prompt: 'They ________ it.', hint: 't___' },
  });
  assert.ok(find(cloze.byId('review-inline-sentence'), node => node.props?.testID === 'review-answer-input'),
    'Cloze answer must be entered directly inside the sentence blank');
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
  console.log('PASS: mixed queue and stable snapshots; final feedback held; auto grading/check/dont-know/freeze locks; immutable retry and double-retry guard; no hints4–6; global read error retention; stale callbacks; dashboard/countdown/chart.');
})().catch(error => { console.error(error); process.exitCode = 1; });
