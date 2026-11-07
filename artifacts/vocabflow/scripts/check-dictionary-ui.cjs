const assert = require('node:assert/strict');
const { join } = require('node:path');
const { readFileSync } = require('node:fs');
const { loadTs } = require('./test-support.cjs');
const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const native = Object.fromEntries(['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'FlatList', 'ActivityIndicator'].map(key => [key, key]));
Object.assign(native, { Platform: { OS: 'web' }, StyleSheet: { create: value => value }, Keyboard: { dismiss() {} } });
const normalizeTerm = value => value.trim().toLowerCase();
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, predicate) {
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  return predicate(node) ? node : find(node.props?.children, predicate);
}

// Exercise real screen callbacks/effects without a private-preview login or
// native UI dependency. This is a logic regression test, not a touch/E2E test.
function mount(file, services, personalWords = []) {
  const slots = [], effects = [], timers = new Map();
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
    react: { ...react, default: react }, 'react-native': native,
    '@expo/vector-icons': { Feather: 'Feather' },
    'react-native-keyboard-controller': { KeyboardAvoidingView: 'KeyboardAvoidingView' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'expo-router': { router: { push: route => routes.push(route) } },
    '@/contexts/VocabularyContext': { useVocabulary: () => ({ words: personalWords }) },
    '@/data/vocabulary': { normalizeTerm }, '@/data/dictionary': services,
    '@/components/DictionaryGate': { DictionaryGate: 'DictionaryGate' },
    '@/components/DictionaryEntryView': { DictionaryEntryView: 'DictionaryEntryView' },
    '@/hooks/useDictionary': { useDictionary: () => ({ ready: true }) },
    '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
    '@/components/ui': { Button: 'Button', EmptyState: 'EmptyState', ErrorBanner: 'ErrorBanner', Skeleton: 'Skeleton', F: {} },
    '@/components/ScreenHeader': { useBottomPad: () => 100 },
  };
  const loaded = loadTs(join(__dirname, file), dependencies, {
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const Component = loaded.default ?? loaded.DictionaryEntryView;
  const props = { id: 42, bottomPad: 100, onBack() {} };
  const render = () => {
    for (let limit = 0; dirty; limit++) {
      assert.ok(limit < 30, 'Screen must settle without an effect loop');
      dirty = false; cursor = 0; tree = Component(props);
      while (effects.length) effects.shift()();
    }
  };
  const api = {
    routes,
    byId(id) { render(); return find(tree, node => node.props?.testID === id); },
    byType(type) { render(); return find(tree, node => node.type === type); },
    timers() { for (const fn of [...timers.values()]) fn(); timers.clear(); render(); },
    async settle() { render(); await tick(); render(); },
  };
  render();
  return api;
}

(async () => {
  const calls = [];
  const screen = mount('../app/(tabs)/dictionary.tsx', {
    searchDictionary: (term, offset) => new Promise(resolve => calls.push({ term, offset, resolve })),
  });
  screen.byId('dictionary-search').props.onChangeText('job');
  screen.byId('dictionary-submit').props.onPress();
  await screen.settle();
  assert.equal(calls.length, 1, 'Immediate submit must not race an automatic second search');
  assert.equal(calls[0].term, 'job');
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

  const entry = { id: 42, term: 'work', pronunciations: [], hasMore: false,
    senses: [{ id: 7, definition: 'công việc', pos: 'noun', subPos: null, example: null },
      { id: 9, definition: 'làm việc', pos: 'verb', subPos: null, example: null }] };
  for (const words of [[], [{ id: 123, term: 'WORK', frozen: true }]]) {
    const view = mount('../components/DictionaryEntryView.tsx', { getDictionaryEntry: async () => entry }, words);
    await view.settle();
    const sense = view.byId('entry-senses').props.renderItem({ item: entry.senses[1], index: 1 });
    find(sense, node => node.props?.accessibilityRole === 'button').props.onPress();
    assert.deepEqual(view.routes[0], words.length
      ? { pathname: '/word', params: { id: '123' } }
      : { pathname: '/word', params: { dictionaryWordId: '42', senseId: '9' } });
  }
  const tabs = readFileSync(join(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
  for (const pattern of [/NativeTabs\.Trigger name="([^"]+)"/g, /Tabs\.Screen name="([^"]+)"/g]) {
    assert.deepEqual([...tabs.matchAll(pattern)].map(match => match[1]), ['dictionary', 'index', 'review', 'settings']);
  }
  console.log('PASS: immediate/exact search without duplicate requests; stale response protection; inline selection/back/clear; correct per-sense draft; existing frozen word preservation; both leftmost tab orders.');
})().catch(error => { console.error(error); process.exitCode = 1; });
