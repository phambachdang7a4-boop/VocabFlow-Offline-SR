const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const domain = loadTs(join(__dirname, '../domain/word-match-game.ts'));
const words = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  term: `word-${index + 1}`,
  meaning: `meaning-${index + 1}`,
}));

const randomValues = [0, 0, 0, 0, 0.99, 0.66, 0.33, 0.99];
const seededRandom = () => randomValues.shift() ?? 0.5;
let state = domain.createWordMatchGame([...words, words[0]], seededRandom);
assert.equal(state.active.length, 5, 'Only five pairs are shown at a time');
assert.equal(state.queue.length, 2, 'Pairs after the first five remain queued');
assert.equal(new Set([...state.active, ...state.queue].map(word => word.id)).size, 7,
  'Repeated mistake IDs are deduplicated');
assert.notDeepEqual(state.termOrder, state.meaningOrder,
  'The English and meaning columns are shuffled independently');
assert.equal(state.termOrder.length, 5, 'The English column starts with five fixed slots');
assert.equal(state.meaningOrder.length, 5, 'The meaning column starts with five fixed slots');

let selection = domain.selectWordMatch(state, 'term', 1);
assert.equal(selection.result, 'selected');
state = selection.state;
selection = domain.selectWordMatch(state, 'meaning', 2);
assert.equal(selection.result, 'incorrect');
state = selection.state;
assert.equal(state.mistakes, 1, 'A wrong connection increments only the game counter');
assert.equal(state.correctCount, 0);
assert.equal(state.lastWrongTermId, 1);
assert.equal(state.lastWrongMeaningId, 2);

selection = domain.selectWordMatch(state, 'term', 1);
state = selection.state;
const termSlotsBeforeMatch = new Map(state.termOrder.map((id, index) => [id, index]));
const meaningSlotsBeforeMatch = new Map(state.meaningOrder.map((id, index) => [id, index]));
selection = domain.selectWordMatch(state, 'meaning', 1);
assert.equal(selection.result, 'correct');
state = selection.state;
assert.equal(state.correctCount, 1);
assert.equal(state.active.length, 5, 'A queued pair fills the just-vacated space');
assert.equal(state.queue.length, 1);
assert.ok(state.active.some(word => word.id === 6), 'The sixth pair loads after the first match');
assert.equal(state.termOrder[termSlotsBeforeMatch.get(1)], 6, 'The next term fills the matched term slot');
assert.equal(state.meaningOrder[meaningSlotsBeforeMatch.get(1)], 6, 'The next meaning fills the matched meaning slot');
for (const id of [2, 3, 4, 5]) {
  assert.equal(state.termOrder.indexOf(id), termSlotsBeforeMatch.get(id), `Term ${id} stays in its original slot`);
  assert.equal(state.meaningOrder.indexOf(id), meaningSlotsBeforeMatch.get(id), `Meaning ${id} stays in its original slot`);
}
assert.ok(!state.active.some(word => word.id === 1), 'A matched pair cannot be selected again');
assert.deepEqual(state.matchedIds, [1]);

for (const word of words.slice(1)) {
  state = domain.selectWordMatch(state, 'meaning', word.id).state;
  const result = domain.selectWordMatch(state, 'term', word.id);
  assert.equal(result.result, 'correct');
  state = result.state;
}
assert.equal(state.correctCount, 7, 'All queued pairs can be completed in one game');
assert.equal(state.active.length, 0);
assert.equal(state.queue.length, 0);
assert.equal(state.termOrder.length, 5, 'Empty slots remain in place after the queue is exhausted');
assert.equal(state.meaningOrder.length, 5, 'Meaning slots remain stable after the queue is exhausted');
assert.ok(state.termOrder.every(id => id === null), 'All cleared term slots remain empty');
assert.ok(state.meaningOrder.every(id => id === null), 'All cleared meaning slots remain empty');
assert.equal(state.mistakes, 1, 'Wrong selections remain a separate cumulative count');
assert.equal(domain.selectWordMatch(state, 'term', 1).result, 'ignored');

const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const slots = [];
let cursor = 0;
let dirty = true;
let tree;
let backHandler;
const effects = [];
const speechCalls = [];
const hapticCalls = [];
const vocabularyWrites = [];
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
  useEffect(callback, deps) {
    const index = cursor++, old = slots[index];
    if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
      const record = { deps }; slots[index] = record;
      effects.push(() => { old?.cleanup?.(); record.cleanup = callback(); });
    }
  },
};
const native = Object.fromEntries(
  ['BackHandler', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(type => [type, type]),
);
native.Platform = { OS: 'android' };
native.StyleSheet = { create: value => value, hairlineWidth: 1 };
native.BackHandler = {
  addEventListener: (_event, handler) => {
    backHandler = handler;
    return { remove() { backHandler = null; } };
  },
};
const animation = { duration: () => ({}), delay: () => ({ duration: () => ({}) }) };
const Animated = { View: 'AnimatedView' };
const haptics = {
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
  notificationAsync: async kind => hapticCalls.push(kind),
  impactAsync: async kind => hapticCalls.push(kind),
};
const speech = {
  speakWord: async term => speechCalls.push(term),
  stopSpeaking: async () => {},
};
const loaded = loadTs(join(__dirname, '../components/ReviewMistakeMatchGame.tsx'), {
  react: { ...react, default: react },
  'react-native': native,
  'react-native-reanimated': {
    default: Animated,
    ...Animated,
    FadeIn: animation,
    FadeInDown: animation,
    FadeOut: animation,
  },
  'expo-haptics': haptics,
  '@expo/vector-icons': { Feather: 'Feather' },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }) },
  '@/components/ui': { Button: 'Button', F: { r: 'Inter', m: 'Inter', s: 'Inter', b: 'Inter' } },
  '@/data/types': {},
  '@/contexts/SpeechPreferencesContext': { useSpeechPreferences: () => speech },
  '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
  '@/domain/word-match-game': domain,
  '@/contexts/VocabularyContext': {
    useVocabulary: () => ({
      recordReview: (...args) => vocabularyWrites.push(['review', ...args]),
      setWordFrozen: (...args) => vocabularyWrites.push(['freeze', ...args]),
    }),
  },
});

function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function mount(properties) {
  slots.length = 0;
  effects.length = 0;
  dirty = true;
  cursor = 0;
  const Component = loaded.ReviewMistakeMatchGame;
  function render() {
    for (let limit = 0; dirty; limit++) {
      assert.ok(limit < 30, 'Game render/effects must settle');
      dirty = false;
      cursor = 0;
      tree = Component(properties);
      while (effects.length) effects.shift()();
    }
  }
  return {
    byId(id) { render(); return find(tree, node => node.props?.testID === id); },
    byType(type) { render(); return find(tree, node => node.type === type); },
    press(id) { this.byId(id).props.onPress(); render(); },
    render,
  };
}
function slotFor(game, side, id) {
  for (let slotIndex = 0; slotIndex < 5; slotIndex++) {
    const slot = game.byId(`match-${side}-slot-${slotIndex}`);
    if (find(slot, node => node.props?.testID === `match-${side}-${id}`)) return slotIndex;
  }
  return -1;
}

const gameWords = words.map((word, index) => ({
  ...word,
  ipa: '',
  example: '',
  note: '',
  createdAt: '',
  updatedAt: '',
  level: 1,
  reviewCount: 0,
  lastReviewedOn: null,
  nextReviewOn: null,
  frozen: false,
}));
let returned = 0;
const game = mount({ words: gameWords, onReturnToReview: () => returned++ });
assert.ok(game.byId('match-term-1'));
assert.ok(game.byId('match-meaning-1'));
assert.equal(game.byId('match-term-6'), undefined, 'The sixth pair waits until a slot opens');
const initialTermSlots = new Map(words.slice(0, 5).map(word => [word.id, slotFor(game, 'term', word.id)]));
const initialMeaningSlots = new Map(words.slice(0, 5).map(word => [word.id, slotFor(game, 'meaning', word.id)]));
assert.equal(game.byId(`match-term-slot-${initialTermSlots.get(1)}`).props.style.height, 62,
  'Match cards use the larger fixed slot height');
assert.equal(typeof backHandler, 'function', 'Hardware back is intercepted while playing');

game.press('match-term-1');
game.press('match-meaning-2');
assert.equal(game.byId('match-mistake-count').props.children.join(''), 'Lần nối sai: 1');
assert.deepEqual(speechCalls, ['word-1'], 'Selecting an English word pronounces it');
assert.deepEqual(hapticCalls, ['light', 'error'], 'Selections and wrong matches vibrate');

game.press('match-term-1');
game.press('match-meaning-1');
assert.ok(game.byId('match-term-6'), 'The sixth pair fills the opened slot');
assert.equal(slotFor(game, 'term', 6), initialTermSlots.get(1), 'A new English card appears in the vacated slot');
assert.equal(slotFor(game, 'meaning', 6), initialMeaningSlots.get(1), 'A new meaning appears in its vacated slot');
for (const word of words.slice(1, 5)) {
  assert.equal(slotFor(game, 'term', word.id), initialTermSlots.get(word.id),
    `The English card ${word.id} does not shift after another match`);
  assert.equal(slotFor(game, 'meaning', word.id), initialMeaningSlots.get(word.id),
    `The meaning card ${word.id} does not shift after another match`);
}
assert.equal(game.byId('match-term-1'), undefined, 'Correctly matched choices disappear');
for (const word of words.slice(1)) {
  game.press(`match-term-${word.id}`);
  game.press(`match-meaning-${word.id}`);
}
assert.ok(game.byId('match-result'));
assert.equal(game.byId('match-result-title').props.children.join(''), 'Nối từ hoàn tất!');
assert.equal(game.byId('match-result-count').props.children.join(''), 'Đã nối đúng 7/7 cặp');
assert.equal(game.byId('match-result-mistakes').props.children.join(''), 'Số lần nối sai: 1');
game.press('match-return-review');
assert.equal(returned, 1);
assert.deepEqual(vocabularyWrites, [], 'The game never changes SRS or frozen-word data');

const interrupted = mount({ words: gameWords.slice(0, 1), onReturnToReview: () => returned++ });
interrupted.press('match-exit');
assert.ok(interrupted.byId('match-exit-dialog'));
interrupted.press('match-exit-cancel');
assert.equal(interrupted.byType('Modal').props.visible, false, 'Cancel keeps the player in the game');
assert.equal(backHandler(), true, 'Android hardware back opens the exit confirmation');
assert.equal(interrupted.byType('Modal').props.visible, true);
interrupted.press('match-exit-cancel');
interrupted.press('match-exit');
interrupted.press('match-exit-confirm');
assert.equal(interrupted.byId('match-result-title').props.children.join(''), 'Đã dừng trò chơi');
assert.equal(interrupted.byId('match-result-count').props.children.join(''), 'Đã nối đúng 0/1 cặp');
interrupted.press('match-return-review');
assert.equal(returned, 2, 'The partial result can return to the review summary');

console.log('PASS: five-pair queue and refill, independent shuffles, mismatch counting, pronunciation, haptics, exit confirmation, completion/partial results, no SRS writes.');
