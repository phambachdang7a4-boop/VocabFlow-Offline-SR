const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');
const path = join(__dirname, '../data/sqlite-connection.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));

function load(runtime, browser) {
  return loadTs(path, {}, {
    globalThis: runtime,
    navigator: runtime.navigator,
    document: browser ? {} : undefined,
  });
}

(async () => {
  const native = load({}, false);
  let active = 0;
  let maximum = 0;
  const order = [];
  const open = name => async () => {
    active++;
    maximum = Math.max(maximum, active);
    order.push(name);
    await tick();
    active--;
    return name;
  };
  assert.deepEqual(await Promise.all([
    native.openDatabaseSafely(open('personal')),
    native.openDatabaseSafely(open('dictionary')),
  ]), ['personal', 'dictionary']);
  assert.equal(maximum, 1, 'First database opens must not race the SDK worker/VFS initialization');
  assert.deepEqual(order, ['personal', 'dictionary']);
  await assert.rejects(native.openDatabaseSafely(async () => { throw Error('Disk failure'); }), /Disk failure/);
  assert.equal(await native.openDatabaseSafely(open('recovered')), 'recovered', 'Queue recovers after rejection');

  let available = false;
  let locks = 0;
  let databaseOpens = 0;
  const browserRuntime = {
    navigator: {
      locks: {
        request: async (name, options, callback) => {
          locks++;
          assert.equal(name, 'vocabflow-sqlite-storage');
          assert.equal(options.ifAvailable, true, 'Never hang behind another tab indefinitely');
          return callback(available ? { name } : null);
        },
      },
    },
  };
  const browser = load(browserRuntime, true);
  const openBrowser = async () => { databaseOpens++; return 'browser-db'; };
  await assert.rejects(browser.openDatabaseSafely(openBrowser), /another tab/);
  assert.equal(databaseOpens, 0, 'Do not poison the SDK worker when another tab owns OPFS');
  available = true;
  assert.equal(await browser.openDatabaseSafely(openBrowser), 'browser-db');
  assert.equal(locks, 2, 'Closing the other tab permits a later retry');
  const afterRefresh = load(browserRuntime, true);
  assert.equal(await afterRefresh.openDatabaseSafely(openBrowser), 'browser-db');
  assert.equal(locks, 2, 'Fast Refresh reuses this tab’s lock rather than deadlocking itself');
  assert.match(browser.storageFailureMessage(Error('createSyncAccessHandle: file locked'), 'fallback'), /đóng các tab/i);
  assert.match(browser.storageFailureMessage(Error('Invalid VFS state'), 'fallback'), /tải lại trang/i);
  assert.match(browser.storageFailureMessage(Error('navigator.storage not available'), 'fallback'), /Chrome thường/i);
  assert.equal(browser.storageFailureMessage(Error('specific error'), 'Cannot open'), 'Cannot open Chi tiết: specific error');
  assert.equal(browser.storageFailureMessage(Error('Human message'), 'Human message'), 'Human message');
  assert.doesNotMatch(browser.storageFailureMessage(Error('WASM fetch failed: https://example.test/a?token=private'), 'Error'), /token=/);
  console.log('PASS: serialized personal/reference opens; rejected-open recovery; browser single-tab ownership/retry; Fast Refresh lock reuse; actionable errors without destructive resets.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
