// Exercise the actual repository SQL against Node's SQLite engine.
// Expo bridge/device persistence still needs a physical-device check.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const ts = require('typescript');
const root = mkdtempSync(join(tmpdir(), 'vocabflow-check-'));
let handle;

const sqliteAdapter = {
  openDatabaseAsync: async (filename) => {
    handle = new DatabaseSync(join(root, filename));
    const db = handle;
    return {
      execAsync: async (sql) => db.exec(sql),
      getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params),
      getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
      runAsync: async (sql, ...params) => {
        const result = db.prepare(sql).run(...params);
        return { changes: result.changes, lastInsertRowId: result.lastInsertRowid };
      },
      closeAsync: async () => db.close(),
      withTransactionAsync: async (fn) => {
        db.exec('BEGIN');
        try { await fn(); db.exec('COMMIT'); }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      },
    };
  },
};

const source = readFileSync(join(__dirname, '../data/vocabulary.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const storage = { exports: {} };
new Function('require', 'exports', 'module', compiled)(
  (name) => {
    if (name === 'expo-sqlite') return sqliteAdapter;
    throw new Error(`Unexpected dependency: ${name}`);
  }, storage.exports, storage,
);

(async () => {
  const repo = storage.exports;
  assert.equal((await repo.listWords()).length, 0, 'No seeded words');
  const input = { term: ' Test Word ', meaning: 'Nghĩa kiểm thử', ipa: '', example: '', note: '' };
  await repo.saveWord(input);
  const [word] = await repo.listWords();
  assert.equal(word.term, 'Test Word');
  assert.equal(word.reviewCount, 0);
  await assert.rejects(repo.saveWord({ ...input, term: 'TEST   WORD' }), /đã có/);
  await assert.rejects(repo.saveWord({ ...input, meaning: ' ' }), /Vui lòng/);
  await repo.saveWord({ ...input, meaning: 'Nghĩa đã sửa' }, word.id);
  const [edited] = await repo.listWords();
  assert.equal(edited.meaning, 'Nghĩa đã sửa');
  assert.equal(edited.createdAt, word.createdAt, 'Editing preserves creation date');
  await assert.rejects(repo.saveWord({ ...input, term: 'missing' }, 999), /không còn/);
  const concurrent = await Promise.allSettled([
    repo.saveWord({ ...input, term: 'concurrent' }),
    repo.saveWord({ ...input, term: 'CONCURRENT' }),
  ]);
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
  const persisted = new DatabaseSync(join(root, 'vocabflow.db'));
  assert.equal(persisted.prepare('SELECT COUNT(*) AS n FROM words').get().n, 2);
  persisted.close();
  await repo.deleteWord(word.id);
  assert.equal(handle.prepare('SELECT COUNT(*) AS n FROM word_progress WHERE word_id = ?').get(word.id).n, 0);
  assert.equal((await repo.listWords()).length, 1);
  await assert.rejects(repo.deleteWord(word.id), /không còn/);
  handle.close();
  const reopened = new DatabaseSync(join(root, 'vocabflow.db'));
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM words').get().n, 1);
  reopened.close();
  console.log('PASS: empty database, create/edit/delete, validation, duplicate protection, transactions, persistent SQLite, progress cleanup.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  try { handle?.close(); } catch {}
  rmSync(root, { recursive: true, force: true });
});
