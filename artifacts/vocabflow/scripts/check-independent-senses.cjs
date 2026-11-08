const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository, loadTs } = require('./test-support.cjs');
const { dictionaryDraft, sameWordSense } = loadTs(join(__dirname, '../domain/dictionary.ts'));
const roots = [],
  handles = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'vocabflow-senses-'));
  roots.push(dir);
  return dir;
};
const open = (root, options) => {
  const h = createRepository(root, '2026-11-07T12:00:00', options);
  handles.push(h);
  return h;
};
const entry = {
  id: 42,
  term: 'take',
  pronunciations: [{ ipa: '/teɪk/', region: null }],
};
const senses = [
  {
    id: 7,
    definition: 'Sự cầm',
    pos: 'noun',
    subPos: null,
    example: 'A take.',
  },
  {
    id: 8,
    definition: 'Lấy',
    pos: 'verb',
    subPos: null,
    example: 'Take the book.',
  },
  {
    id: 9,
    definition: 'Cảnh quay',
    pos: 'noun',
    subPos: null,
    example: 'One more take.',
  },
];
const drafts = senses.map((sense) => dictionaryDraft(entry, sense));

function legacy(root, empty = false) {
  const db = new DatabaseSync(join(root, 'vocabflow.db'));
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT NOT NULL,
      normalized_term TEXT NOT NULL UNIQUE, meaning TEXT NOT NULL,
      ipa TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE word_progress (
      word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
      review_count INTEGER NOT NULL DEFAULT 0 CHECK(review_count >= 0),
      level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 6),
      learned_on TEXT NOT NULL, next_review_on TEXT,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN(0,1)),
      last_reviewed_on TEXT, frozen INTEGER NOT NULL DEFAULT 0 CHECK(frozen IN(0,1))
    );
    CREATE INDEX idx_progress_due ON word_progress(completed,next_review_on);
    PRAGMA user_version = 4;
  `);
  for (const [id, term, meaning, level, count, frozen, completed, next] of [
    [7, 'take', drafts[0].meaning, 4, 3, 0, 0, '2026-11-13'],
    [9, 'frozen', 'đã đóng băng', 5, 4, 1, 0, null],
    [10, 'done', 'đã hoàn tất', 6, 6, 0, 1, null],
  ]) {
    db.prepare('INSERT INTO words VALUES(?,?,?,?,?,?,?,?,?)').run(id, term, term, meaning, '/ipa/', 'example', 'private note', '2026-10-01T12:00:00', '2026-11-01T12:00:00');
    db.prepare('INSERT INTO word_progress VALUES(?,?,?,?,?,?,?,?)').run(id, count, level, '2026-10-30', next, completed, '2026-11-06', frozen);
  }
  db.exec("INSERT INTO words VALUES(100,'deleted','deleted','đã xóa','','','','2026-01-01','2026-01-01'); DELETE FROM words WHERE id=100;");
  if (empty) db.exec('DELETE FROM words');
  const rows = db.prepare('SELECT * FROM words ORDER BY id').all();
  const progress = db.prepare('SELECT * FROM word_progress ORDER BY word_id').all();
  db.close();
  return { rows, progress };
}

(async () => {
  const h = open(temp());
  const { repo } = h;
  const results = await Promise.allSettled(drafts.map((draft) => repo.saveWord(draft)));
  assert.ok(
    results.every((result) => result.status === 'fulfilled'),
    'Different senses of one English word all save',
  );
  let words = await repo.listWords();
  assert.equal(words.length, 3);
  const a = words.find((word) => word.dictionarySenseId === 7);
  const b = words.find((word) => word.dictionarySenseId === 8);
  const c = words.find((word) => word.dictionarySenseId === 9);
  assert.equal(new Set(words.map((word) => word.id)).size, 3);
  assert.ok(words.every((word) => word.level === 1 && word.reviewCount === 0));
  assert.ok(sameWordSense(a, drafts[0]));
  assert.ok(!sameWordSense(a, drafts[1]));
  await assert.rejects(repo.saveWord(drafts[0]), /nghĩa.*đã có/);
  await repo.recordReview(a.id, true, 0);
  words = await repo.listWords();
  assert.equal(words.find((word) => word.id === a.id).level, 2);
  assert.deepEqual(
    words.find((word) => word.id === b.id),
    b,
    'Grading one meaning leaves another untouched',
  );
  await repo.setWordFrozen(a.id, true);
  assert.deepEqual(
    (await repo.listWords()).find((word) => word.id === b.id),
    b,
  );
  await repo.recordReview(b.id, false, 0);
  const bAfter = (await repo.listWords()).find((word) => word.id === b.id);
  assert.equal(bAfter.reviewCount, 1);
  assert.equal(bAfter.level, 1);
  assert.equal((await repo.listWords()).find((word) => word.id === a.id).frozen, true);
  const edited = {
    term: b.term,
    meaning: 'Nghĩa tự chỉnh',
    ipa: b.ipa,
    example: b.example,
    note: b.note,
  };
  await repo.saveWord(edited, b.id);
  const bEdited = (await repo.listWords()).find((word) => word.id === b.id);
  assert.equal(bEdited.dictionaryEntryId, 42);
  assert.equal(bEdited.dictionarySenseId, 8);
  assert.equal(bEdited.reviewCount, bAfter.reviewCount);
  await assert.rejects(repo.saveWord(drafts[1]), /đã có/, 'Edited source sense is still the same saved sense');
  await repo.deleteWord(a.id);
  assert.deepEqual(
    (await repo.listWords()).find((word) => word.id === b.id),
    bEdited,
  );
  assert.deepEqual(
    (await repo.listWords()).find((word) => word.id === c.id),
    c,
  );
  await repo.saveWord({ ...drafts[2], dictionarySenseId: 99 });
  assert.ok(!sameWordSense(drafts[2], { ...drafts[2], dictionarySenseId: 99 }), 'Distinct source senses remain distinct even if glosses coincide');
  const manual = { term: 'go', meaning: 'đi', ipa: '', example: '', note: '' };
  await repo.saveWord(manual);
  await repo.saveWord({ ...manual, meaning: 'lượt chơi' });
  await assert.rejects(repo.saveWord({ ...manual, term: ' GO ', meaning: ' ĐI ' }), /đã có/);
  const go = (await repo.listWords()).find((word) => word.term === 'go' && word.meaning === 'đi');
  await assert.rejects(repo.saveWord({ ...manual, meaning: 'lượt chơi' }, go.id), /đã có/);
  const raced = await Promise.allSettled([repo.saveWord({ ...drafts[2], dictionarySenseId: 100 }), repo.saveWord({ ...drafts[2], dictionarySenseId: 100 })]);
  assert.equal(raced.filter((result) => result.status === 'fulfilled').length, 1);
  assert.deepEqual(h.db.prepare('PRAGMA foreign_key_check').all(), []);
  const persisted = await repo.listWords();
  h.db.close();
  assert.deepEqual(await open(roots[0]).repo.listWords(), persisted);

  const legacyRoot = temp(),
    before = legacy(legacyRoot),
    upgraded = open(legacyRoot);
  const old = await upgraded.repo.listWords();
  assert.equal(old.length, 3, 'Migration does not split or invent unsaved meanings');
  assert.deepEqual(
    upgraded.db
      .prepare(
        `SELECT word_id, level, completed, review_count, last_reviewed_on,
          learned_on,
          next_review_on, frozen FROM word_progress ORDER BY word_id`,
      )
      .all(),
    before.progress,
  );
  for (const previous of before.rows) {
    const current = upgraded.db.prepare('SELECT * FROM words WHERE id=?').get(previous.id);
    for (const key of Object.keys(previous)) assert.equal(current[key], previous[key], `Preserve legacy ${key}`);
  }
  assert.equal(upgraded.db.prepare('PRAGMA user_version').get().user_version, 10);
  assert.deepEqual(upgraded.db.prepare('PRAGMA foreign_key_check').all(), []);
  await assert.rejects(upgraded.repo.saveWord(drafts[0]), /đã có/, 'Exact legacy meaning is already saved');
  await upgraded.repo.saveWord(drafts[1]);
  assert.ok((await upgraded.repo.listWords()).find((word) => word.dictionarySenseId === 8).id > 100);
  assert.deepEqual(
    upgraded.db
      .prepare(
        `SELECT word_id, level, completed, review_count, last_reviewed_on,
          learned_on, next_review_on, frozen
         FROM word_progress WHERE word_id=7`,
      )
      .get(),
    before.progress[0],
  );

  const rollbackRoot = temp(),
    rollbackBefore = legacy(rollbackRoot);
  const broken = open(rollbackRoot, {
    afterExec(sql) {
      if (sql.includes('ALTER TABLE words_next RENAME')) throw Error('injected migration failure');
    },
  });
  await assert.rejects(broken.repo.listWords(), /injected/);
  const check = new DatabaseSync(join(rollbackRoot, 'vocabflow.db'));
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 4);
  assert.deepEqual(check.prepare('SELECT * FROM words ORDER BY id').all(), rollbackBefore.rows);
  assert.deepEqual(check.prepare('SELECT * FROM word_progress ORDER BY word_id').all(), rollbackBefore.progress);
  assert.deepEqual(check.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%_next'").all(), []);
  check.close();
  assert.equal((await open(rollbackRoot).repo.listWords()).length, 3);
  const emptyRoot = temp();
  legacy(emptyRoot, true);
  const empty = open(emptyRoot);
  await empty.repo.saveWord(manual);
  assert.ok((await empty.repo.listWords())[0].id > 100, 'Preserve AUTOINCREMENT even with no surviving legacy rows');
  console.log(
    'PASS: independent sense rows/SRS/freeze/edit/delete; source and manual duplicate guards; concurrent saves; persistent IDs; exact legacy content/progress preservation; transactional migration rollback/retry; empty-table sequence.',
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const handle of handles) {
      try {
        handle.db?.close();
      } catch {}
    }
    roots.forEach((root) => rmSync(root, { recursive: true, force: true }));
  });
