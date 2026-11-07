const assert = require('node:assert/strict');
const { join } = require('node:path');
const { readFileSync } = require('node:fs');
const { loadTs } = require('./test-support.cjs');
const palette = loadTs(join(__dirname, '../constants/colors.ts')).default.light;
const dictionaryDomain = loadTs(join(__dirname, '../domain/dictionary.ts'));
const { exampleSegments } = dictionaryDomain;
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
function mount(file, services, personalWords = [], properties = {}) {
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
    '@/domain/dictionary': dictionaryDomain,
    react: { ...react, default: react }, 'react-native': native,
    '@expo/vector-icons': { Feather: 'Feather' },
    'react-native-keyboard-controller': { KeyboardAvoidingView: 'KeyboardAvoidingView' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'expo-router': { router: { push: route => routes.push(route) } },
    '@/contexts/VocabularyContext': { useVocabulary: () => ({
      words: personalWords, saveWord: services.saveWord,
      loading: services.bookLoading ?? false, error: services.bookError ?? null, reload: async () => {},
    }) },
    '@/data/vocabulary': { normalizeTerm }, '@/data/dictionary': services,
    '@/components/DictionaryGate': { DictionaryGate: 'DictionaryGate' },
    '@/components/DictionaryEntryView': { DictionaryEntryView: 'DictionaryEntryView' },
    '@/components/DictionarySuggestions': { DictionarySuggestions: 'DictionarySuggestions' },
    '@/components/PartOfSpeechFilter': { PartOfSpeechFilter: 'PartOfSpeechFilter' },
    '@/hooks/useDictionary': { useDictionary: () => ({ ready: true }) },
    '@/hooks/useColors': { useColors: () => ({ ...palette, radius: 14 }) },
    '@/components/ui': { Button: 'Button', EmptyState: 'EmptyState', ErrorBanner: 'ErrorBanner', Skeleton: 'Skeleton', F: {} },
    '@/components/ScreenHeader': { useBottomPad: () => 100 },
  };
  const loaded = loadTs(join(__dirname, file), dependencies, {
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const Component = loaded.default ?? loaded.DictionaryEntryView ?? loaded.DictionarySuggestions ?? loaded.PartOfSpeechFilter;
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
  assert.equal(suggestionCalls.length, 0, 'Ordinary prefix matches never invoke spelling suggestions');

  screen.byId('dictionary-search').props.onChangeText('sincth');
  screen.timers();
  calls.at(-1).resolve({ items: [], hasMore: false });
  await screen.settle();
  assert.equal(suggestionCalls.at(-1).term, 'sincth');
  assert.ok(screen.byType('Skeleton'), 'Keep loading until suggestions finish');
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
  for (const words of [[], [{ id: 123, term: 'WORK', frozen: true }]]) {
    const savedInputs = [];
    const view = mount('../components/DictionaryEntryView.tsx', {
      getDictionaryEntry: async () => entry, saveWord: async input => savedInputs.push(input),
    }, words);
    await view.settle();
    const sense = view.byId('entry-senses').props.renderItem({ item: entry.senses[1], index: 1 });
    find(sense, node => node.props?.accessibilityRole === 'button').props.onPress();
    await view.settle();
    if (words.length) {
      assert.deepEqual(view.routes[0], { pathname: '/word', params: { id: '123' } });
      assert.deepEqual(savedInputs, [], 'Existing/frozen words must never be overwritten');
    } else {
      assert.deepEqual(view.routes, [], 'Save directly without opening a confirmation form');
      assert.deepEqual(savedInputs, [dictionaryDomain.dictionaryDraft(entry, entry.senses[1])]);
      assert.ok(find(view.byId('entry-senses').props.ListHeaderComponent, node => node.props?.testID === 'entry-save-success'));
    }
  }
  const writes = [];
  let completeWrite;
  const direct = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => entry,
    saveWord: input => new Promise(resolve => { writes.push(input); completeWrite = resolve; }),
  });
  await direct.settle();
  const add = sense => find(direct.byId('entry-senses').props.renderItem({ item: sense, index: 0 }), node => node.props?.accessibilityRole === 'button').props.onPress;
  const firstPress = add(entry.senses[0]);
  firstPress(); firstPress(); add(entry.senses[1])();
  assert.equal(writes.length, 1, 'Double taps and competing senses cannot create two writes');
  completeWrite(); await direct.settle();
  firstPress();
  assert.equal(writes.length, 1, 'Committed local marker prevents duplicate writes before context refresh');
  assert.deepEqual(direct.routes, []);
  let failures = 0;
  const retrySave = mount('../components/DictionaryEntryView.tsx', {
    getDictionaryEntry: async () => entry,
    saveWord: async () => { if (++failures === 1) throw Error('Không thể lưu từ.'); },
  });
  await retrySave.settle();
  const retryPress = () => find(retrySave.byId('entry-senses').props.renderItem({ item: entry.senses[0], index: 0 }), node => node.props?.accessibilityRole === 'button').props.onPress();
  retryPress(); await retrySave.settle();
  assert.ok(find(retrySave.byId('entry-senses').props.ListHeaderComponent, node => node.type === 'ErrorBanner'));
  retryPress(); await retrySave.settle();
  assert.equal(failures, 2);
  assert.ok(find(retrySave.byId('entry-senses').props.ListHeaderComponent, node => node.props?.testID === 'entry-save-success'));
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
  assert.ok(!readFileSync(join(__dirname, '../components/DictionaryEntryView.tsx'), 'utf8').includes('Bấm Lưu từ ở nghĩa'));
  const tabs = readFileSync(join(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
  for (const pattern of [/NativeTabs\.Trigger name="([^"]+)"/g, /Tabs\.Screen name="([^"]+)"/g]) {
    assert.deepEqual([...tabs.matchAll(pattern)].map(match => match[1]), ['dictionary', 'index', 'review', 'settings']);
  }
  console.log('PASS: POS checkbox multi-select/reset/disabled choices; filtered paging and stale-page rejection; retry All; correct sense save; removed hint; example underlines; search/suggestions; existing/frozen preservation; tab order.');
})().catch(error => { console.error(error); process.exitCode = 1; });
