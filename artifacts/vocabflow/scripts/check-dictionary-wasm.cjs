const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { dirname, join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadTs, loadDictionaryDomain } = require('./test-support.cjs');

(async () => {
  const { DICTIONARY } = loadDictionaryDomain();
  const { dictionaryImportBytes } = loadTs(join(__dirname, '../domain/dictionary-import.ts'));
  const original = readFileSync(resolve(__dirname, '../../../generated-artifacts/dictionary/dictionary_en_vi.db'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(original.length, DICTIONARY.bytes);
  assert.equal(hash(original), DICTIONARY.sha256);
  assert.deepEqual([original[18], original[19]], [2, 2], 'Pinned source reproduces the original WAL condition');
  const prepared = dictionaryImportBytes(new Uint8Array(original));
  assert.deepEqual([prepared[18], prepared[19]], [1, 1]);
  assert.equal(hash(original), DICTIONARY.sha256, 'Never mutate or redistribute a modified original');
  assert.ok(Buffer.from(prepared.subarray(0, 18)).equals(original.subarray(0, 18)));
  assert.ok(Buffer.from(prepared.subarray(20)).equals(original.subarray(20)), 'Every data byte after the journal flags is unchanged');
  assert.throws(() => dictionaryImportBytes(new Uint8Array(100)), /SQLite hợp lệ/);
  assert.equal(dictionaryImportBytes(prepared), prepared, 'Already-normalized input needs no extra allocation');

  // Execute the EXACT SQLite WebAssembly and MemoryVFS bundled with Expo.
  // locateFile is the supported factory option; this build does not consume
  // wasmBinary. A data URL loads the installed binary with no network or CDN.
  const directory = join(dirname(require.resolve('expo-sqlite/package.json')), 'web/wa-sqlite');
  const imported = file => import(pathToFileURL(join(directory, file)).href);
  const factory = (await imported('wa-sqlite.js')).default;
  const wasm = readFileSync(join(directory, 'wa-sqlite.wasm'));
  const module = await factory({ locateFile: () => `data:application/wasm;base64,${wasm.toString('base64')}` });
  const SQLite = await imported('sqlite-api.js');
  const { MemoryVFS } = await imported('MemoryVFS.js');
  const sqlite = SQLite.Factory(module);
  const name = 'vocabflow-import-test';
  const vfs = await MemoryVFS.create(name, module);
  sqlite.vfs_register(vfs, true);
  const open = filename => sqlite.open_v2(filename, 6 /* READWRITE | CREATE */, name);
  const rows = async (database, query) => {
    const result = [];
    await sqlite.exec(database, query, row => { result.push([...row]); });
    return result;
  };

  const legacy = await open(':memory:');
  try {
    await sqlite.deserialize(legacy, 'main', original);
    await assert.rejects(rows(legacy, 'SELECT COUNT(*) FROM words'), /unable to open database file/i);
  } finally {
    await sqlite.close(legacy);
  }

  const source = await open(':memory:');
  const destination = await open('/dictionary-cache-test.db');
  try {
    await sqlite.deserialize(source, 'main', prepared);
    assert.deepEqual(await rows(source, 'PRAGMA quick_check'), [['ok']]);
    assert.deepEqual(await rows(source, 'SELECT COUNT(*) FROM words'), [[DICTIONARY.wordCount]]);
    assert.deepEqual(await rows(source, 'SELECT COUNT(*) FROM definitions'), [[DICTIONARY.definitionCount]]);
    assert.deepEqual(await rows(source, 'SELECT COUNT(*) FROM word_definitions'), [[DICTIONARY.linkCount]]);
    await sqlite.backup(destination, 'main', source, 'main');
    await sqlite.exec(destination, `
      CREATE INDEX idx_vocabflow_words_nocase ON words(word COLLATE NOCASE, id);
      CREATE TABLE vocabflow_dictionary_meta (source_hash TEXT NOT NULL);
      INSERT INTO vocabflow_dictionary_meta VALUES ('${DICTIONARY.sha256}');
      PRAGMA query_only = ON;
    `);
    const hello = await rows(destination, "SELECT word FROM words WHERE word = 'hello'");
    assert.ok(hello.some(row => row[0] === 'hello'), 'Imported database is searchable');
    await assert.rejects(rows(destination, 'DELETE FROM words'), /readonly|read.only/i);
  } finally {
    await sqlite.close(source);
    await sqlite.close(destination);
  }
  const reopened = await open('/dictionary-cache-test.db');
  try {
    assert.deepEqual(await rows(reopened, 'SELECT COUNT(*) FROM words'), [[DICTIONARY.wordCount]]);
    assert.deepEqual(await rows(reopened, 'SELECT source_hash FROM vocabflow_dictionary_meta'), [[DICTIONARY.sha256]]);
  } finally {
    await sqlite.close(reopened);
  }
  console.log('PASS: actual Expo SQLite WASM reproduces error 14 with original WAL source; normalized import passes integrity, all source counts, backup, index, search, read-only and reopen; original bytes unchanged.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
