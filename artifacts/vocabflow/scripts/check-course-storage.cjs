const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository, loadTs, courseCatalog } = require('./test-support.cjs');

const root = mkdtempSync(join(tmpdir(), 'vocabflow-course-'));
const { BASIC_COURSE_ATTRIBUTION, BASIC_COURSE_LESSONS, displayCourseMeaning } = loadTs(join(__dirname, '../data/basic-course.ts'));
const lesson = BASIC_COURSE_LESSONS[0];
let first = createRepository(root, '2026-11-07T12:00:00');
let second;

(async () => {
  const { repo } = first;
  assert.deepEqual(await repo.listWords(), [], 'A new app must not seed personal words.');
  assert.deepEqual(await repo.listCourseProgress(), [], 'A new app must not seed course progress.');

  const [selectedOne, notSelected, selectedTwo] = lesson.words;
  await repo.saveCourseProgress(lesson.id, 1, 'answer');
  await repo.saveCourseSelection(lesson.id, selectedOne.id, true);
  await repo.saveCourseSelection(lesson.id, selectedTwo.id, true);
  assert.deepEqual((await repo.getCourseSelections(lesson.id)).sort(), [selectedOne.id, selectedTwo.id].sort());
  const inProgress = await repo.getCourseProgress(lesson.id);
  assert.equal(inProgress.stage, 'answer');
  assert.equal(inProgress.currentIndex, 1);
  assert.equal(inProgress.completedAt, null);

  first.db.close();
  second = createRepository(root, '2026-11-07T12:00:00');
  const resumed = await second.repo.getCourseProgress(lesson.id);
  assert.equal(resumed.stage, 'answer');
  assert.equal(resumed.currentIndex, 1);
  assert.deepEqual((await second.repo.getCourseSelections(lesson.id)).sort(), [selectedOne.id, selectedTwo.id].sort());

  const added = await second.repo.finishCourseLesson(lesson.id, [selectedOne.id, selectedTwo.id]);
  assert.equal(added, 2);
  const personalWords = await second.repo.listWords();
  assert.equal(personalWords.length, 2, 'Only explicitly checked senses should be added.');
  assert.deepEqual(
    personalWords.map(word => `${word.term}|${word.meaning}`).sort(),
    [selectedOne, selectedTwo].map(word => `${word.term}|${displayCourseMeaning(word)}`).sort(),
  );
  for (const source of [selectedOne, selectedTwo]) {
    const saved = personalWords.find(word => word.term === source.term);
    assert.equal(saved.dictionaryEntryId, source.dictionaryEntryId);
    assert.equal(saved.dictionarySenseId, source.dictionarySenseId);
    assert.ok(source.example.trim(), `Ví dụ khóa học phải lấy từ từ điển offline: ${source.term}`);
    assert.equal(saved.example, source.example);
    assert.ok(saved.note.includes(BASIC_COURSE_ATTRIBUTION), 'Nguồn từ điển phải được giữ khi lưu khóa học.');
  }
  assert.ok(personalWords.every(word => word.level === 1 && word.reviewCount === 0 && word.nextReviewOn === '2026-11-07'));
  assert.ok(!personalWords.some(word => word.term === notSelected.term && word.meaning === notSelected.meaning));
  const completed = await second.repo.getCourseProgress(lesson.id);
  assert.equal(completed.stage, 'completed');
  assert.ok(completed.completedAt);
  assert.equal((await second.repo.listCourseProgress()).length, 1);

  assert.equal(await second.repo.finishCourseLesson(lesson.id, [selectedOne.id, selectedTwo.id]), 0, 'Re-finishing must not create duplicates.');
  assert.equal((await second.repo.listWords()).length, 2);

  for (const courseId of ['vocab-c1-v1', 'vocab-c2-v1', 'collocation-1-v1']) {
    const course = courseCatalog.COURSE_CATALOGS.find(item => item.id === courseId);
    assert.ok(course, `Thiếu khóa mới trong catalog: ${courseId}.`);
    const courseLesson = course.lessons[0];
    const courseWord = courseLesson.words[0];
    assert.equal(await second.repo.finishCourseLesson(courseLesson.id, [courseWord.id]), 1);
    const saved = (await second.repo.listWords()).find(word =>
      word.dictionaryEntryId === courseWord.dictionaryEntryId &&
      word.dictionarySenseId === courseWord.dictionarySenseId);
    assert.ok(saved, `Không lưu được mục ${courseWord.term} từ ${course.title}.`);
    assert.equal(saved.example, courseWord.example);
    assert.equal((await second.repo.getCourseProgress(courseLesson.id)).stage, 'completed');
  }

  const allWordsLesson = BASIC_COURSE_LESSONS[1];
  const allWordIds = allWordsLesson.words.map(word => word.id);
  assert.equal(
    await second.repo.finishCourseLesson(allWordsLesson.id, allWordIds),
    allWordsLesson.words.length,
    'Thêm tất cả phải lưu mọi mục từ-nghĩa trong bài.',
  );
  const afterAddAll = await second.repo.listWords();
  for (const source of allWordsLesson.words) {
    const saved = afterAddAll.find(word =>
      word.dictionaryEntryId === source.dictionaryEntryId &&
      word.dictionarySenseId === source.dictionarySenseId);
    assert.ok(saved, `Thiếu mục đã chọn tất cả: ${source.term}.`);
    assert.equal(saved.example, source.example);
  }

  const manualSource = BASIC_COURSE_LESSONS[2].words[0];
  await second.repo.saveWord({
    term: manualSource.term,
    meaning: displayCourseMeaning(manualSource),
    ipa: manualSource.ipa,
    example: '',
    note: 'Ví dụ do người dùng quản lý',
    dictionaryEntryId: manualSource.dictionaryEntryId,
    dictionarySenseId: manualSource.dictionarySenseId,
  });
  const legacyCourseWord = afterAddAll.find(word => word.dictionarySenseId === selectedOne.dictionarySenseId);
  const progressBeforeMigration = {
    level: legacyCourseWord.level,
    reviewCount: legacyCourseWord.reviewCount,
    nextReviewOn: legacyCourseWord.nextReviewOn,
  };
  second.db.prepare("UPDATE words SET example = '' WHERE id = ?").run(legacyCourseWord.id);
  second.db.exec('PRAGMA user_version = 7;');
  second.db.close();
  second = createRepository(root, '2026-11-07T12:00:00');
  const afterMigration = await second.repo.listWords();
  const restoredCourseWord = afterMigration.find(word => word.id === legacyCourseWord.id);
  assert.equal(restoredCourseWord.example, selectedOne.example, 'Migration bổ sung ví dụ cho từ khóa học cũ.');
  assert.deepEqual({
    level: restoredCourseWord.level,
    reviewCount: restoredCourseWord.reviewCount,
    nextReviewOn: restoredCourseWord.nextReviewOn,
  }, progressBeforeMigration, 'Migration không đổi tiến độ SRS.');
  const manualWord = afterMigration.find(word => word.dictionarySenseId === manualSource.dictionarySenseId);
  assert.equal(manualWord.example, '', 'Migration không ghi đè mục người dùng tự quản lý.');
  assert.equal(second.db.prepare('PRAGMA user_version').get().user_version, 8);
  const lessonScreen = readFileSync(join(__dirname, '../app/course/[lessonId].tsx'), 'utf8');
  assert.match(lessonScreen, /testID="course-flip-example"/, 'Bài học cần có nút lật thẻ xem ví dụ.');
  assert.match(lessonScreen, /testID="course-add-all"/, 'Bài học cần có nút thêm tất cả mục từ.');
  console.log('PASS: source examples from offline SQLite; lesson flip/add-all controls; selected and all-word saves; old course-example migration without overwriting personal data or SRS; persistence and duplicate protection.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  for (const handle of [first, second]) { try { handle?.db?.close(); } catch {} }
  rmSync(root, { recursive: true, force: true });
});
