const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { resolve, join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const root = resolve(__dirname, '..');
const dictionaryPath = resolve(root, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const manifest = JSON.parse(fs.readFileSync(join(root, 'data/basic-course-manifest.json'), 'utf8'));
const { BASIC_COURSE_ID, BASIC_COURSE_TITLE, BASIC_COURSE_ATTRIBUTION, BASIC_COURSE_LESSONS, BASIC_COURSE_WORD_COUNT } =
  loadTs(join(root, 'data/basic-course.ts'));
const sourceBytes = fs.readFileSync(dictionaryPath);
assert.equal(sourceBytes.byteLength, 44212224, 'Kho từ điển không đúng kích thước đã ghim.');
assert.equal(
  createHash('sha256').update(sourceBytes).digest('hex'),
  manifest.sourceSha256,
  'Kho từ điển không khớp SHA-256 trong manifest.',
);
assert.equal(BASIC_COURSE_ID, 'basic-965-v2');
assert.equal(BASIC_COURSE_TITLE, '978 từ cơ bản');
assert.match(BASIC_COURSE_ATTRIBUTION, /CC BY-SA 4\.0/);
assert.equal(manifest.courseId, BASIC_COURSE_ID);
assert.equal(manifest.lessons.length, 49);
assert.equal(BASIC_COURSE_LESSONS.length, 49, 'Khóa cơ bản cần đúng 49 bài.');
assert.equal(BASIC_COURSE_WORD_COUNT, 978, `Cần đúng 978 mục từ-nghĩa, hiện có ${BASIC_COURSE_WORD_COUNT}.`);

const titleGroups = new Map();
for (const lesson of BASIC_COURSE_LESSONS.filter(lesson => lesson.id !== 'basic-965-v2-colors-1')) {
  assert.match(lesson.title, / [12]$/, `Tên bài phải có số phần: ${lesson.title}.`);
  const group = lesson.title.replace(/ [12]$/, '');
  titleGroups.set(group, [...(titleGroups.get(group) ?? []), lesson.title.slice(-1)]);
}
assert.equal(titleGroups.size, 24, 'Cần chia thành 24 chủ đề, mỗi chủ đề có 2 bài.');
assert.ok([...titleGroups.values()].every(parts => parts.length === 2 && parts.includes('1') && parts.includes('2')));
const colorLesson = BASIC_COURSE_LESSONS.find(lesson => lesson.id === 'basic-965-v2-colors-1');
assert.ok(colorLesson, 'Thiếu bài Màu sắc.');
assert.equal(colorLesson.title, 'Màu sắc');
assert.equal(colorLesson.words.length, 13);
assert.deepEqual(colorLesson.words.map(word => word.term), [
  'orange', 'pink', 'purple', 'grey', 'violet', 'beige', 'gold',
  'silver', 'maroon', 'turquoise', 'cyan', 'magenta', 'indigo',
]);
assert.ok(BASIC_COURSE_LESSONS.every(lesson => lesson.words.length > 0 && lesson.words.length <= 25));
assert.equal(new Set(BASIC_COURSE_LESSONS.map(lesson => lesson.id)).size, 49, 'ID bài học bị trùng.');

const byId = new Map(manifest.lessons.map(lesson => [lesson.id, lesson]));
const exactSense = new (require('node:sqlite').DatabaseSync)(dictionaryPath, { readOnly: true });
const query = exactSense.prepare(`
  SELECT w.word AS term, wd.id AS senseId, d.definition, d.pos, d.sub_pos AS subPos,
    COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
  FROM words w
  JOIN word_definitions wd ON wd.word_id = w.id
  JOIN definitions d ON d.id = wd.definition_id
  WHERE w.id = ? AND wd.id = ? AND d.definition_lang = 'vi'
`);
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const usedSenses = new Set();
const usedMeanings = new Set();
try {
  for (const lesson of BASIC_COURSE_LESSONS) {
    const manifestLesson = byId.get(lesson.id);
    assert.ok(manifestLesson, `Thiếu bài trong manifest: ${lesson.id}.`);
    assert.equal(manifestLesson.words.length, lesson.words.length);
    for (const [index, word] of lesson.words.entries()) {
      const manifestWord = manifestLesson.words[index];
      assert.equal(word.dictionaryEntryId, manifestWord.entryId);
      assert.equal(word.dictionarySenseId, manifestWord.senseId);
      assert.equal(normalize(word.term), normalize(manifestWord.term));
      assert.equal(word.id, `dict:${word.dictionaryEntryId}:${word.dictionarySenseId}`);
      const source = query.get(word.dictionaryEntryId, word.dictionarySenseId);
      assert.ok(source, `Không tìm thấy nguồn từ-nghĩa: ${word.term}.`);
      assert.equal(word.term, source.term, `Từ không trùng nguồn: ${word.term}.`);
      assert.equal(word.definition, source.definition, `Nghĩa không được chép nguyên văn: ${word.term}.`);
      assert.equal(word.pos, source.pos);
      assert.equal(word.subPos, source.subPos);
      assert.equal(word.ipa, source.ipa);
      const senseKey = `${word.dictionaryEntryId}:${word.dictionarySenseId}`;
      const meaningKey = `${normalize(word.term)}|${normalize(word.definition)}`;
      assert.ok(!usedSenses.has(senseKey), `Nghĩa bị lặp: ${word.term}.`);
      assert.ok(!usedMeanings.has(meaningKey), `Cặp từ-nghĩa bị lặp: ${word.term}.`);
      usedSenses.add(senseKey);
      usedMeanings.add(meaningKey);
    }
  }
} finally {
  exactSense.close();
}

console.log(`OK: ${BASIC_COURSE_LESSONS.length} bài, ${BASIC_COURSE_WORD_COUNT} mục; mọi nghĩa/ID khớp nguyên văn với SQLite từ điển đã ghim.`);
