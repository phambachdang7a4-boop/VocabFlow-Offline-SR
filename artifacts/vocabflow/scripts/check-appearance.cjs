const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const storage = new Map();
let failRead = false, failWrite = false, finishWrite, deferWrite = false;
const writes = [];
const asyncStorage = {
  async getItem(key) { if (failRead) throw Error('read failed'); return storage.get(key) ?? null; },
  async setItem(key, value) {
    writes.push([key, value]);
    if (failWrite) throw Error('write failed');
    if (deferWrite) await new Promise(resolve => { finishWrite = resolve; });
    storage.set(key, value);
  },
};
const asyncStorageModule = { ...asyncStorage, default: asyncStorage };
const persistence = loadTs(join(__dirname, '../data/appearance.ts'), {
  '@react-native-async-storage/async-storage': asyncStorageModule,
});

function provider() {
  const slots = [], effects = [];
  let cursor, tree, dirty = true, unmounted = false, lateWrites = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  const memo = (fn, deps) => {
    const index = cursor++, previous = slots[index];
    if (!previous || !same(previous.deps, deps)) slots[index] = { deps, value: fn() };
    return slots[index].value;
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    createContext: () => ({ Provider: 'AppearanceProvider' }),
    useContext: () => tree.props.value,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => {
        if (unmounted) lateWrites++;
        const value = typeof next === 'function' ? next(slots[index]) : next;
        if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
      }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || !same(previous.deps, deps)) {
        const record = { deps }; slots[index] = record;
        effects.push(() => { previous?.cleanup?.(); record.cleanup = fn(); });
      }
    },
  };
  const module = loadTs(join(__dirname, '../contexts/AppearanceContext.tsx'), {
    react: { ...react, default: react }, '@/data/appearance': persistence,
  });
  function render() {
    for (let count = 0; dirty; count++) {
      assert.ok(count < 30, 'Preference effects must settle');
      dirty = false; cursor = 0; tree = module.AppearanceProvider({ children: 'app' });
      while (effects.length) effects.shift()();
    }
  }
  render();
  return {
    value() { render(); return tree.props.value; },
    async settle() { render(); await tick(); render(); },
    unmount() { unmounted = true; slots.forEach(slot => slot?.cleanup?.()); },
    lateWrites: () => lateWrites,
  };
}

const luminance = hex => {
  const [r, g, b] = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

(async () => {
  assert.equal(await persistence.readAppearance(), 'light', 'Default is light, regardless of device appearance');
  const first = provider();
  assert.equal(first.value().ready, false);
  await first.settle();
  assert.equal(first.value().mode, 'light');
  assert.equal(first.value().ready, true);
  deferWrite = true;
  const save = first.value().setMode('dark');
  assert.equal(first.value().saving, true);
  assert.equal(first.value().mode, 'light', 'No saved-state claim before persistence succeeds');
  await first.value().setMode('light');
  assert.equal(writes.length, 1, 'Pending choices are locked to prevent write races');
  finishWrite(); await save; await first.settle(); deferWrite = false;
  assert.equal(first.value().mode, 'dark');
  assert.equal(storage.get(persistence.APPEARANCE_KEY), 'dark');
  first.unmount();
  const reopened = provider(); await reopened.settle();
  assert.equal(reopened.value().mode, 'dark', 'Cold start restores saved preference');
  failWrite = true;
  await reopened.value().setMode('light'); await reopened.settle();
  assert.equal(reopened.value().mode, 'dark');
  assert.ok(reopened.value().error);
  assert.equal(reopened.value().saving, false);
  failWrite = false;
  await reopened.value().setMode('light'); await reopened.settle();
  assert.equal(reopened.value().mode, 'light');
  assert.equal(reopened.value().error, null);
  failRead = true;
  const readError = provider(); await readError.settle();
  assert.equal(readError.value().ready, true, 'A preference failure cannot block access to vocabulary');
  assert.ok(readError.value().error);
  failRead = false; storage.set(persistence.APPEARANCE_KEY, 'dark');
  const retry = readError.value().retryLoad();
  assert.equal(readError.value().ready, true, 'Retry cannot unmount navigation or the active review');
  await retry; await readError.settle();
  assert.equal(readError.value().mode, 'dark');
  storage.set(persistence.APPEARANCE_KEY, 'invalid');
  await assert.rejects(persistence.readAppearance(), /không hợp lệ/);
  const leaving = provider(); leaving.unmount(); await tick();
  assert.equal(leaving.lateWrites(), 0);

  const palettes = loadTs(join(__dirname, '../constants/colors.ts')).default;
  for (const mode of ['light', 'dark']) {
    const c = palettes[mode];
    assert.ok(c, `Missing ${mode} palette`);
    assert.equal(c.background.toUpperCase(), mode === 'light' ? '#F7F1E3' : '#1E2130');
    assert.equal(c.header.toUpperCase(), '#2F4F86');
    assert.equal(c.navigation.toUpperCase(), '#2F4F86');
    assert.equal(c.button.toUpperCase(), '#E9B949');
    assert.equal(c.frozen.toUpperCase(), '#BFE3F2');
    assert.equal(c.destructive.toUpperCase(), '#C0392B');
    assert.equal(c.success.toUpperCase(), '#3E8E5A');
    assert.equal(c.reviewRight.toUpperCase(), '#3E8E5A');
    assert.equal(c.sheen, mode === 'light' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)');
    assert.equal(c.sheenEdge, mode === 'light' ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.22)');
    assert.equal(c.goldSheen, mode === 'light' ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.26)');
    for (const [foreground, background] of [
      ['foreground', 'background'], ['mutedForeground', 'background'],
      ['headerForeground', 'header'], ['headerMuted', 'header'],
      ['buttonForeground', 'button'], ['cardForeground', 'card'],
      ['frozenForeground', 'frozen'], ['navigationInactive', 'navigation'],
      ['dictInk', 'dictPage'], ['dictHead', 'dictPage'],
    ]) {
      const ratio = contrast(c[foreground], c[background]);
      assert.ok(ratio >= 4.5, `${mode} ${foreground}/${background} contrast ${ratio.toFixed(2)} must be >=4.5`);
    }
    const hook = loadTs(join(__dirname, '../hooks/useColors.ts'), {
      '@/contexts/AppearanceContext': { useAppearance: () => ({ mode }) },
      '@/constants/colors': palettes,
    });
    assert.equal(hook.useColors().background, c.background);
  }
  console.log('PASS: default light; persistent manual modes/cold start; write locking/failure recovery; load failure/retry without unmount; cleanup; exact palettes and readable text contrast; active color hook.');
})().catch(error => { console.error(error); process.exitCode = 1; });
