const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

// Test the real hook's event handlers without requiring a navigation focus
// change, rerender, native network, or a paid browser session.
class ConsentRequired extends Error {}
const states = [];
const updates = [];
const lifecycle = [];
let focus;
const calls = [];
let pending;
let mode = 'consent';
const react = {
  useState(initial) {
    const index = states.length;
    states.push(initial);
    return [initial, value => { states[index] = value; updates.push([index, value]); }];
  },
  useRef: current => ({ current }),
  useCallback: fn => fn,
  useEffect: fn => lifecycle.push(fn),
};
const { useDictionary } = loadTs(join(__dirname, '../hooks/useDictionary.ts'), {
  react,
  'expo-router': { useFocusEffect: fn => { focus = fn; } },
  '../data/dictionary': {
    DictionaryDownloadConsentRequired: ConsentRequired,
    openDictionary: async (onStage, options) => {
      calls.push(options.allowDownload);
      onStage('checking');
      if (!options.allowDownload && mode !== 'cached') throw new ConsentRequired();
      if (mode === 'cached') return {};
      onStage('downloading');
      return new Promise((resolve, reject) => { pending = { resolve, reject }; });
    },
  },
});
const tick = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  const hook = useDictionary();
  const cleanups = lifecycle.map(fn => fn());
  focus();
  await tick();
  assert.deepEqual(calls, [false], 'Mount/focus only checks local cache');
  assert.equal(states[0], 'awaiting-consent');
  const before = updates.length;
  hook.approveDownload();
  assert.deepEqual(calls, [false, true], 'Tap starts approved load synchronously, without rerender/focus');
  assert.ok(updates.slice(before).some(([index, value]) => index === 0 && value === 'downloading'));
  hook.approveDownload();
  assert.equal(calls.length, 2, 'Double tap cannot start another download');
  pending.reject(new Error('Network unavailable'));
  await tick();
  assert.equal(states[0], 'awaiting-consent');
  assert.equal(states[1], 'Network unavailable');
  hook.retry();
  await tick();
  assert.equal(calls.at(-1), false, 'Retry/check never reuses mobile-data permission');
  hook.approveDownload();
  assert.equal(calls.at(-1), true, 'Tap works again after an error');
  pending.resolve({});
  await tick();
  assert.equal(states[0], 'ready');
  assert.equal(states[1], null);
  mode = 'cached';
  focus();
  await tick();
  assert.equal(calls.at(-1), false, 'Returning to a loaded screen checks cache without downloading');
  assert.equal(states[0], 'ready');
  cleanups.forEach(fn => fn?.());
  const count = calls.length;
  hook.approveDownload();
  assert.equal(calls.length, count, 'Unmounted callbacks cannot start a transfer');
  console.log('PASS: download button triggers directly; immediate loading state; double-tap guard; failure/retry; fresh consent; cached refocus; unmount safety.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
