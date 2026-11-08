const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository, loadTs, courseCatalog } = require('./test-support.cjs');

const root = mkdtempSync(join(tmpdir(), 'vocabflow-auth-sync-'));
const harness = createRepository(root);
const values = new Map();
const asyncStorage = {
  getItem: async key => values.get(key) ?? null,
  setItem: async (key, value) => { values.set(key, value); },
};
const sync = loadTs(join(__dirname, '../data/vocabulary-sync.ts'), {
  './vocabulary': harness.repo,
  '@react-native-async-storage/async-storage': asyncStorage,
});

(async () => {
  const { repo } = harness;
  assert.equal((await repo.listWords()).length, 0);
  await repo.saveWord({ term: 'guest word', meaning: 'Từ khách', ipa: '', example: '', note: '' });

  await sync.initializeAccountDatabase('user_A');
  assert.equal(repo.getDatabaseScope(), 'user_A');
  assert.equal((await repo.listWords()).length, 1, 'Existing local data imports into the first account.');
  await repo.saveWord({ term: 'account A word', meaning: 'Từ tài khoản A', ipa: '', example: '', note: '' });

  let snapshot = await sync.exportSyncSnapshot();
  assert.equal(snapshot.payload.words.length, 2);
  assert.equal(Object.hasOwn(snapshot.payload, 'userId'), false, 'Client payload never chooses its owner.');
  assert.equal(snapshot.pending, true, 'Local writes stay queued until the server acknowledges them.');

  const generationBeforeEdit = snapshot.generation;
  await repo.saveWord({ term: 'new offline word', meaning: 'Từ ngoại tuyến', ipa: '', example: '', note: '' });
  assert.equal(await repo.markSyncClean(generationBeforeEdit), false, 'An old acknowledgement cannot clear newer edits.');
  snapshot = await sync.exportSyncSnapshot();
  assert.equal(await repo.markSyncClean(snapshot.generation), true);
  assert.equal((await sync.getLocalSyncState()).pending, false);

  const lesson = courseCatalog.ALL_COURSE_LESSONS[0];
  await repo.saveCourseProgress(lesson.id, 0, 'flashcard');
  await repo.saveCourseSelection(lesson.id, lesson.words[0].id, true);
  const progressSnapshot = await sync.exportSyncSnapshot();
  assert.equal(progressSnapshot.payload.courseProgress[0].lessonId, lesson.id);
  assert.equal(progressSnapshot.payload.courseSelections[0].selected, true);

  const newest = progressSnapshot.payload.words[0];
  await sync.mergeSyncSnapshot({
    words: [{
      ...newest,
      meaning: 'Nghĩa cũ không được ghi đè',
      contentUpdatedAt: '2000-01-01T00:00:00.000Z',
    }],
    deletedWords: [],
    courseProgress: [],
    courseSelections: [],
    reviewStats: [],
  });
  assert.notEqual(
    (await repo.listWords()).find(word => word.term === newest.term)?.meaning,
    'Nghĩa cũ không được ghi đè',
    'An older remote edit cannot overwrite a newer local record.',
  );

  const wordToDelete = (await repo.listWords()).find(word => word.term === 'account A word');
  await repo.deleteWord(wordToDelete.id);
  snapshot = await sync.exportSyncSnapshot();
  assert.ok(snapshot.payload.deletedWords.some(deleted => deleted.syncId === 'manual:account%20a%20word:t%E1%BB%AB%20t%C3%A0i%20kho%E1%BA%A3n%20a'));

  await sync.activateGuestDatabase();
  assert.equal((await repo.listWords()).length, 1, 'Guest data remains intact after switching accounts.');
  await sync.initializeAccountDatabase('user_B');
  assert.equal((await repo.listWords()).length, 0, 'A new account cannot see another account or guest data.');
  await repo.saveWord({ term: 'account B word', meaning: 'Từ tài khoản B', ipa: '', example: '', note: '' });
  await sync.initializeAccountDatabase('user_A');
  const accountAWords = await repo.listWords();
  assert.equal(accountAWords.length, 2, 'The original account keeps its own local cache.');
  assert.equal(accountAWords.some(word => word.term === 'account B word'), false);

  const serverSource = readFileSync(join(__dirname, '../../api-server/src/routes/sync.ts'), 'utf8');
  assert.match(serverSource, /const \{ userId \} = getAuth\(req\)/, 'Server owner comes from verified Clerk auth.');
  assert.match(serverSource, /res\.locals\.userId/, 'The trusted Clerk user ID scopes server writes.');
  assert.doesNotMatch(serverSource, /req\.body\.userId|snapshot\.userId/, 'Request data cannot set an owner.');
  const rootLayout = readFileSync(join(__dirname, '../app/_layout.tsx'), 'utf8');
  const signIn = readFileSync(join(__dirname, '../app/(auth)/sign-in.tsx'), 'utf8');
  const signUp = readFileSync(join(__dirname, '../app/(auth)/sign-up.tsx'), 'utf8');
  const settings = readFileSync(join(__dirname, '../app/settings.tsx'), 'utf8');
  assert.match(rootLayout, /ClerkProvider[\s\S]*tokenCache/, 'Clerk sessions use the Expo secure token cache.');
  assert.match(rootLayout, /Platform\.OS !== 'web' && isSignedIn/, 'Native API calls use bearer tokens while web uses same-origin Clerk cookies.');
  assert.match(signIn, /useSignIn[\s\S]*oauth_google/, 'Email/password and Google sign-in are wired.');
  assert.match(signUp, /useSignUp[\s\S]*verifyEmailCode/, 'Account creation verifies the email address.');
  assert.match(signIn, /StyleSheet\.flatten\(\[styles\.textLink/, 'Router Link children flatten styles for web.');
  assert.match(signUp, /StyleSheet\.flatten\(\[styles\.textLink/, 'Router Link children flatten styles for web.');
  assert.match(settings, /useSyncStatus/, 'Settings exposes sync status.');
  assert.match(settings, /signOut\(/, 'Settings exposes sign-out.');

  const persisted = new DatabaseSync(join(root, 'vocabflow-account-user_A.db'));
  assert.equal(persisted.prepare('SELECT COUNT(*) AS n FROM words').get().n, 2);
  persisted.close();
  harness.db.close();
  console.log('PASS: legacy import, account-scoped SQLite, queued offline edits, stale acknowledgements, merge conflict handling, tombstones and trusted server ownership.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  try { harness.db.close(); } catch {}
  rmSync(root, { recursive: true, force: true });
});
