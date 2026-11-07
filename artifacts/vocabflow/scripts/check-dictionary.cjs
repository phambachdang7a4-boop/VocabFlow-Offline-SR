const assert = require('node:assert/strict');
const { DatabaseSync, backup } = require('node:sqlite');
const { readFileSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const { createRepository, loadTs, srs } = require('./test-support.cjs');
const root = mkdtempSync(join(tmpdir(), 'vocabflow-dictionary-'));
const source = resolve(__dirname, '../../../generated-artifacts/dictionary/dictionary_en_vi.db');
const handles = new Set();
let personal;

function adapter(filename, readOnly = false) {
  const handle = new DatabaseSync(filename, { readOnly });
  handles.add(handle);
  return {
    handle, filename,
    execAsync: async sql => handle.exec(sql),
    getFirstAsync: async (sql, ...params) => handle.prepare(sql).get(...params),
    getAllAsync: async (sql, ...params) => handle.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => handle.prepare(sql).run(...params),
    closeAsync: async () => { handles.delete(handle); handle.close(); },
    withTransactionAsync: async operation => {
      handle.exec('BEGIN');
      try { await operation(); handle.exec('COMMIT'); }
      catch (error) { handle.exec('ROLLBACK'); throw error; }
    },
  };
}

(async () => {
  const domain = loadTs(join(__dirname, '../domain/dictionary.ts'));
  const { DICTIONARY, DICTIONARY_PAGE_SIZE } = domain;
  const bytes = readFileSync(source);
  assert.equal(bytes.length, DICTIONARY.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), DICTIONARY.sha256);
  const queries = loadTs(join(__dirname, '../data/dictionary-queries.ts'), { '../domain/dictionary': domain });
  const reference = adapter(source, true);
  assert.equal(reference.handle.prepare('SELECT count(*) AS n FROM words').get().n, DICTIONARY.wordCount);
  assert.equal(reference.handle.prepare('SELECT count(*) AS n FROM definitions').get().n, DICTIONARY.definitionCount);
  assert.equal(reference.handle.prepare('SELECT count(*) AS n FROM word_definitions').get().n, DICTIONARY.linkCount);
  const result = await queries.searchInDictionary(reference, '  HELLO ');
  const hello = result.items.find(row => row.term === 'hello');
  assert.ok(hello);
  assert.ok(hello.meaning.length);
  assert.deepEqual(await queries.searchInDictionary(reference, ''), { items: [], hasMore: false });
  assert.equal((await queries.searchInDictionary(reference, "' OR 1=1--")).items.length, 0);
  assert.ok((await queries.searchInDictionary(reference, '%')).items.every(row => row.term.startsWith('%')));
  assert.ok((await queries.searchInDictionary(reference, '_')).items.every(row => row.term.startsWith('_')));
  await assert.rejects(queries.searchInDictionary(reference, 'a', -1), /không hợp lệ/);
  await assert.rejects(queries.searchInDictionary(reference, 'a'.repeat(201)), /200/);
  const first = await queries.searchInDictionary(reference, 'a');
  const next = await queries.searchInDictionary(reference, 'a', DICTIONARY_PAGE_SIZE);
  assert.equal(first.items.length, DICTIONARY_PAGE_SIZE);
  assert.equal(first.hasMore, true);
  assert.ok(next.items.every(row => !first.items.some(old => old.id === row.id)));
  const entry = await queries.entryInDictionary(reference, hello.id);
  assert.ok(entry.pronunciations.length && entry.senses.length);
  const sense = entry.senses.at(-1);
  const draft = await queries.draftInDictionary(reference, hello.id, sense.id);
  assert.equal(draft.term, hello.term);
  assert.ok(draft.meaning.includes(sense.definition));
  assert.equal(draft.example, sense.example ?? '');
  assert.equal(draft.ipa, entry.pronunciations[0].ipa);
  assert.ok(draft.note.includes('CC BY-SA'));
  await assert.rejects(queries.draftInDictionary(reference, hello.id, 1), /Không tìm thấy/);
  await assert.rejects(queries.entryInDictionary(reference, -1), /không hợp lệ/);

  personal = createRepository(root);
  assert.equal((await personal.repo.listWords()).length, 0, 'Lookup/draft must never auto-save');
  await personal.repo.saveWord(draft);
  const [word] = await personal.repo.listWords();
  assert.equal(word.term, draft.term);
  assert.equal(word.meaning, draft.meaning);
  assert.equal(word.level, 1);
  assert.equal(srs.isDue(word, '2026-01-01'), true);
  await personal.repo.recordReview(word.id, true, 0);
  await personal.repo.setWordFrozen(word.id, true);
  const snapshot = (await personal.repo.listWords())[0];
  await assert.rejects(personal.repo.saveWord({ ...draft, term: ' HELLO ' }), /đã có/);
  assert.deepEqual((await personal.repo.listWords())[0], snapshot, 'Duplicate import cannot reset content, progress, or freeze');

  // Exercise production initialization, backed by real Node SQLite.
  const { sha256 } = await import('@noble/hashes/sha2.js');
  let downloads = 0;
  const deleted = [];
  const sqlite = {
    openDatabaseAsync: async filename => adapter(join(root, filename)),
    deserializeDatabaseAsync: async data => {
      const filename = join(root, 'import-source.db');
      writeFileSync(filename, data);
      return adapter(filename, true);
    },
    backupDatabaseAsync: async ({ sourceDatabase, destDatabase }) => backup(sourceDatabase.handle, destDatabase.filename),
    deleteDatabaseAsync: async filename => {
      deleted.push(filename);
      assert.ok(filename.startsWith('vocabflow-dictionary-'), 'Never delete personal storage');
      rmSync(join(root, filename), { force: true });
    },
  };
  function repository(fetch) {
    return loadTs(join(__dirname, '../data/dictionary.ts'), {
      'expo-sqlite': sqlite,
      '@noble/hashes/sha2.js': { sha256 },
      '../domain/dictionary': domain,
      './dictionary-queries': queries,
    }, { fetch, process: { env: { EXPO_PUBLIC_DOMAIN: 'unused.invalid' } } });
  }
  const stages = [];
  let repo = repository(async () => { downloads++; return new Response(bytes); });
  const loaded = await repo.openDictionary(stage => stages.push(stage));
  assert.deepEqual(stages, ['checking', 'downloading', 'verifying', 'ready']);
  assert.equal(downloads, 1);
  assert.match(loaded.handle.prepare('EXPLAIN QUERY PLAN SELECT id FROM words WHERE word LIKE ? ORDER BY word COLLATE NOCASE,id').all('a%').map(row => row.detail).join(' '), /idx_vocabflow_words_nocase/);
  await assert.rejects(loaded.runAsync("DELETE FROM words"), /readonly/);
  await loaded.closeAsync();

  repo = repository(async () => { throw new Error('Offline: no network allowed'); });
  const offlineStages = [];
  const reopened = await repo.openDictionary(stage => offlineStages.push(stage));
  assert.deepEqual(offlineStages, ['checking', 'ready'], 'Reopening cached dictionary is fully offline');
  assert.ok((await repo.searchDictionary('hello')).items.some(row => row.id === hello.id));
  assert.equal((await repo.getDictionaryDraft(hello.id, sense.id)).meaning, draft.meaning);
  await reopened.closeAsync();

  // Remove ONLY the disposable reference cache to emulate first use without a network.
  const name = `vocabflow-dictionary-${DICTIONARY.sha256.slice(0, 16)}.db`;
  rmSync(join(root, name));
  let online = false;
  repo = repository(async () => {
    if (!online) throw new Error('No connection');
    return new Response(bytes);
  });
  await assert.rejects(repo.openDictionary(), /Không thể nạp/);
  assert.equal(deleted.at(-1), name);
  assert.deepEqual((await personal.repo.listWords())[0], snapshot);
  online = true;
  const recovered = await repo.openDictionary();
  assert.ok((await repo.searchDictionary('hello')).items.length);
  await recovered.closeAsync();

  rmSync(join(root, name));
  repo = repository(async () => new Response(Buffer.alloc(DICTIONARY.bytes)));
  await assert.rejects(repo.openDictionary(), /không đúng phiên bản/);
  assert.deepEqual((await personal.repo.listWords())[0], snapshot);
  console.log('PASS: pinned real 104,829-word SQLite; bounded prefix/sense paging; literal wildcard safety; selected-sense draft; deliberate save/SRS; duplicate/freeze preservation; checksummed import; indexed read-only cache; offline reopen; failed-download retry; personal-data isolation.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  for (const handle of handles) { try { handle.close(); } catch {} }
  try { personal?.db?.close(); } catch {}
  rmSync(root, { recursive: true, force: true });
});
