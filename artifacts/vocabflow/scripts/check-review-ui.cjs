const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs, srs } = require('./test-support.cjs');
const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const overview = loadTs(join(__dirname, '../domain/review-overview.ts'), { './srs': srs });
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView'].map(type => [type, type]));
native.StyleSheet = { create: value => value };
const tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

// Real screen/component callbacks, controlled context/clock; not a touch E2E.
function mount(file, properties = {}, initial = {}) {
  let now = new Date('2026-11-07T23:59:59').getTime(), dirty = true, cursor, tree, focus;
  const slots = [], effects = [], routes = [];
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
    'expo-router': { router: { push: route => routes.push(route) }, useFocusEffect: callback => { focus = callback; } },
    '@/contexts/VocabularyContext': { useVocabulary: () => context },
    '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
    '@/hooks/useReviewClock': { useReviewClock: () => now },
    '@/domain/srs': srs, '@/domain/review-overview': overview,
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
    byId(id) { render(); return find(tree, node => node.props?.testID === id); },
    byType(type) { render(); return find(tree, node => node.type === type); },
    update(next) { Object.assign(context, next); dirty = true; render(); },
    time(value) { now = new Date(value).getTime(); dirty = true; render(); },
    focus() { render(); focus(); render(); },
    async settle() { render(); await tick(); render(); },
  };
}
const word = { id: 1, term: 'test', meaning: 'test only', ipa: '', example: '', note: '',
  ...srs.initialProgress('2026-11-07') };

(async () => {
  const screen = mount('../app/(tabs)/review.tsx');
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
  screen.byId('review-back-overview').props.onPress();
  assert.ok(screen.byId('review-start'));
  screen.byId('review-start').props.onPress();
  const onSaved = screen.byType('ReviewCard').props.onSaved;
  const reviewed = { ...tomorrowWord, ...srs.applyReview(tomorrowWord, true, '2026-11-08') };
  screen.update({ words: [reviewed] });
  onSaved('Đã lưu');
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

  let resolveSave;
  const calls = [], messages = [];
  const card = mount('../components/ReviewCard.tsx', { word, disabled: false, onSaved: message => messages.push(message) }, {
    recordReview: (...args) => new Promise(resolve => { calls.push(args); resolveSave = resolve; }),
  });
  assert.equal(card.byId('review-correct'), undefined, 'No grade before revealing meaning');
  card.byId('reveal-answer').props.onPress();
  const answer = card.byId('review-correct').props.onPress;
  answer(); answer();
  assert.deepEqual(calls, [[1, true, 0]], 'Keep the saving lock and expected review count');
  resolveSave(); await card.settle();
  assert.equal(messages.length, 1);
  const freezeCalls = [];
  const freezeCard = mount('../components/ReviewCard.tsx', { word, disabled: false, onSaved() {} }, {
    setWordFrozen: async (...args) => { freezeCalls.push(args); },
  });
  const freeze = freezeCard.byId('review-freeze').props.onPress;
  freeze(); freeze(); await freezeCard.settle();
  assert.deepEqual(freezeCalls, [[1, true]]);
  console.log('PASS: empty/loading/error dashboard; real countdown to start at midnight; explicit session/back/completion/focus; linear six-level chart and zero bars; preserved answer/freeze double-tap locks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
