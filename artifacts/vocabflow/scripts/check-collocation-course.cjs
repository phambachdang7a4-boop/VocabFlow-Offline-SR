const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { resolve, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { basicCourse, cefrCourses, advancedCourses, collocationCourses, courseCatalog } = require('./test-support.cjs');

const root = resolve(__dirname, '..');
const dataDir = join(root, 'data');
const dictionaryPath = resolve(root, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const sourcePath = resolve(root, '../../generated-artifacts/collocations/opensubs-en.jsonl');
const manifest = JSON.parse(fs.readFileSync(join(dataDir, 'collocation-course-manifest.json'), 'utf8'));
const { COLLOCATION_COURSES } = collocationCourses;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

assert.equal(COLLOCATION_COURSES.length, 1);
const course = COLLOCATION_COURSES[0];
assert.equal(course.id, 'collocation-1-v1');
assert.equal(course.title, 'Collocation 1');
assert.equal(manifest.source.name, 'OpenSubtitles Collocations');
assert.equal(manifest.source.commit, 'd051fefa5b85c9ffe6882eace8a1abe5543ee730');
assert.equal(manifest.source.license, 'CC BY 4.0');
assert.equal(manifest.source.originalCorpus, 'OpenSubtitles v2018');
assert.equal(manifest.dictionary.commit, '388adc0826300912e5b0311c089e0e70494b065f');
assert.equal(manifest.dictionary.license, 'CC BY-SA 4.0');

const sourceBytes = fs.readFileSync(sourcePath);
const dictionaryBytes = fs.readFileSync(dictionaryPath);
assert.equal(sha256(sourceBytes), manifest.source.sha256);
assert.equal(sha256(dictionaryBytes), manifest.dictionary.sha256);
const sourceRows = sourceBytes.toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.equal(sourceRows.length, 15000);
assert.equal(manifest.sourceCount, sourceRows.length);
assert.equal(manifest.words.length + manifest.missingWords.length + manifest.noExampleWords.length + manifest.skippedDuplicateWords.length, sourceRows.length);
assert.equal(course.sourceCount, sourceRows.length);
assert.equal(course.missingWords.length, manifest.missingWords.length + manifest.noExampleWords.length);
assert.equal(course.skippedDuplicateCount, manifest.skippedDuplicateWords.length);
assert.equal(course.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0), manifest.words.length);
assert.equal(course.lessons.length, Math.ceil(manifest.words.length / 20));
assert.ok(course.lessons.every(lesson => lesson.words.length > 0 && lesson.words.length <= 20));
assert.ok(course.lessons.slice(0, -1).every(lesson => lesson.words.length === 20));
assert.match(course.attribution, /OpenSubtitles Collocations/);
assert.match(course.attribution, /CC BY 4\.0/);
assert.match(course.attribution, /CC BY-SA 4\.0/);

const sourceByRank = sourceRows;
const db = new DatabaseSync(dictionaryPath, { readOnly: true });
const dictionarySense = db.prepare(`
  SELECT w.word AS term, wd.id AS senseId, d.definition, d.pos, d.sub_pos AS subPos, wd.example,
    COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
  FROM words w
  JOIN word_definitions wd ON wd.word_id = w.id
  JOIN definitions d ON d.id = wd.definition_id
  WHERE w.id = ? AND wd.id = ? AND d.definition_lang = 'vi'
`);
const seenSenses = new Set();
const seenMeanings = new Set();
try {
  for (const sourceCourse of [
    { lessons: basicCourse.BASIC_COURSE_LESSONS },
    ...cefrCourses.CEFR_COURSES,
    ...advancedCourses.ADVANCED_COURSES,
  ]) {
    for (const lesson of sourceCourse.lessons) {
      for (const word of lesson.words) {
        seenSenses.add(`${word.dictionaryEntryId}:${word.dictionarySenseId}`);
        seenMeanings.add(`${normalize(word.term)}|${normalize(word.definition)}`);
      }
    }
  }
  const acceptedKeys = new Set();
  for (const item of manifest.words) {
    const source = sourceByRank[item.rank - 1];
    assert.equal(source.bigram, item.bigram);
    assert.equal(source.type, item.type);
    assert.equal(source.lang, 'en');
    acceptedKeys.add(`${item.entryId}:${item.senseId}`);
  }
  const words = course.lessons.flatMap(lesson => lesson.words);
  assert.equal(words.length, manifest.words.length);
  for (const lesson of course.lessons) {
    assert.ok(lesson.id.startsWith('collocation-1-v1-'));
    for (const word of lesson.words) {
      const key = `${word.dictionaryEntryId}:${word.dictionarySenseId}`;
      assert.ok(acceptedKeys.has(key), `Mục không nằm trong manifest: ${word.term}.`);
      assert.equal(word.id, `dict:${word.dictionaryEntryId}:${word.dictionarySenseId}`);
      assert.ok(word.example.trim(), `Thiếu ví dụ từ điển offline: ${word.term}.`);
      const exact = dictionarySense.get(word.dictionaryEntryId, word.dictionarySenseId);
      assert.ok(exact, `Không khớp SQLite: ${word.term}.`);
      assert.equal(word.term, exact.term);
      assert.equal(word.definition, exact.definition);
      assert.equal(word.pos, exact.pos);
      assert.equal(word.subPos, exact.subPos);
      assert.equal(word.ipa, exact.ipa);
      assert.equal(word.example, exact.example);
      const meaningKey = `${normalize(word.term)}|${normalize(word.definition)}`;
      assert.ok(!seenSenses.has(key), `Sense bị trùng với khóa khác: ${word.term}.`);
      assert.ok(!seenMeanings.has(meaningKey), `Nghĩa bị trùng với khóa khác: ${word.term}.`);
      seenSenses.add(key);
      seenMeanings.add(meaningKey);
    }
  }
  assert.ok(courseCatalog.COURSE_CATALOGS.some(item => item.id === 'collocation-1-v1'));
} finally {
  db.close();
}

console.log(`PASS: Collocation 1 có ${manifest.words.length} mục, bài 20 từ, ví dụ/IPA/nghĩa khớp SQLite, không trùng các khóa khác.`);
