const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { resolve, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { loadTs } = require('./test-support.cjs');

const root = resolve(__dirname, '..');
const dictionaryPath = resolve(root, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const manifest = JSON.parse(fs.readFileSync(join(root, 'data/cefr-course-manifest.json'), 'utf8'));
const basicManifest = JSON.parse(fs.readFileSync(join(root, 'data/basic-course-manifest.json'), 'utf8'));
const { CEFR_COURSE_ATTRIBUTION, CEFR_COURSES } = loadTs(join(root, 'data/cefr-courses.ts'));
assert.equal(CEFR_COURSES.length, 2);
assert.deepEqual(CEFR_COURSES.map(course => course.level), ['B1', 'B2']);
assert.match(CEFR_COURSE_ATTRIBUTION, /LexiCore-5000/);
assert.match(CEFR_COURSE_ATTRIBUTION, /CC BY 4\.0/);
assert.match(CEFR_COURSE_ATTRIBUTION, /CEFR-J v1\.5/);
assert.match(CEFR_COURSE_ATTRIBUTION, /Skypedia/);
assert.equal(manifest.source.name, 'LexiCore-5000');
assert.equal(manifest.source.license, 'CC BY 4.0');
assert.equal(manifest.source.commit, '47460d26346380cc2bfcd399699cad6c391d8412');
assert.equal(manifest.dictionary.commit, '388adc0826300912e5b0311c089e0e70494b065f');

const dictionaryBytes = fs.readFileSync(dictionaryPath);
assert.equal(dictionaryBytes.byteLength, 44212224);
assert.equal(
  createHash('sha256').update(dictionaryBytes).digest('hex'),
  manifest.dictionary.sha256,
  'Kho từ điển không khớp SHA-256 trong manifest.',
);

const cachePath = resolve(root, '../../generated-artifacts/cefr/LexiCore_5000.csv');
if (fs.existsSync(cachePath)) {
  const sourceBytes = fs.readFileSync(cachePath);
  assert.equal(sourceBytes.byteLength, 303824);
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), manifest.source.csvSha256);
  const lines = sourceBytes.toString('utf8').trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  const sourceRows = lines.slice(1).map(line => Object.fromEntries(
    line.split(',').map((value, index) => [headers[index], value]),
  ));
  for (const level of ['B1', 'B2']) {
    const entries = sourceRows.filter(row => row.cefr_level === level);
    const accepted = new Set(manifest.levels[level].words.map(word => word.sourceWord));
    const unavailable = new Set(manifest.levels[level].missing);
    const duplicates = new Set(manifest.levels[level].skippedDuplicateWords);
    assert.equal(entries.length, 1000);
    assert.equal(accepted.size + unavailable.size + duplicates.size, 1000);
    assert.ok(entries.every(row => accepted.has(row.word) || unavailable.has(row.word) || duplicates.has(row.word)));
    assert.ok(manifest.levels[level].words.every(word =>
      entries.some(row => row.word === word.sourceWord && Number(row.rank_in_level) === word.rank && row.pos === word.sourcePos),
    ));
  }
}

const db = new DatabaseSync(dictionaryPath, { readOnly: true });
const query = db.prepare(`
  SELECT w.word AS term, wd.id AS senseId, d.definition, d.pos, d.sub_pos AS subPos,
    COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
  FROM words w
  JOIN word_definitions wd ON wd.word_id = w.id
  JOIN definitions d ON d.id = wd.definition_id
  WHERE w.id = ? AND wd.id = ? AND d.definition_lang = 'vi'
`);
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const usedSenseKeys = new Set(basicManifest.lessons.flatMap(lesson =>
  lesson.words.map(word => `${word.entryId}:${word.senseId}`),
));
const usedMeanings = new Set();
try {
  for (const lesson of basicManifest.lessons) {
    for (const word of lesson.words) {
      const sense = query.get(word.entryId, word.senseId);
      assert.ok(sense, `Không tìm thấy nghĩa khóa cơ bản ${word.term}.`);
      usedMeanings.add(`${normalize(sense.term)}|${normalize(sense.definition)}`);
    }
  }
  for (const course of CEFR_COURSES) {
    const levelManifest = manifest.levels[course.level];
    const wordCount = course.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0);
    assert.equal(levelManifest.sourceCount, 1000);
    assert.equal(wordCount, levelManifest.words.length);
    assert.equal(course.missingWords.length, levelManifest.missing.length);
    assert.equal(course.skippedDuplicateCount, levelManifest.skippedDuplicate);
    assert.equal(levelManifest.skippedDuplicateWords.length, course.skippedDuplicateCount);
    assert.ok(course.lessons.length >= 45 && course.lessons.length <= 55, `${course.level}: số bài không hợp lý.`);
    assert.ok(course.lessons.every(lesson => lesson.words.length > 0 && lesson.words.length <= 20));
    assert.ok(course.lessons.slice(0, -1).every(lesson => lesson.words.length === 20));

    const sourceBySense = new Map(levelManifest.words.map(word => [`${word.entryId}:${word.senseId}`, word]));
    for (const lesson of course.lessons) {
      assert.ok(lesson.id.startsWith(`vocab-${course.level.toLocaleLowerCase('en')}-v1-`));
      assert.ok(/^B[12] \d+$/.test(lesson.title));
      for (const word of lesson.words) {
        const source = sourceBySense.get(`${word.dictionaryEntryId}:${word.dictionarySenseId}`);
        assert.ok(source, `Thiếu manifest cho ${word.term}.`);
        assert.equal(word.term, source.term);
        assert.equal(word.id, `dict:${word.dictionaryEntryId}:${word.dictionarySenseId}`);
        const dictionarySense = query.get(word.dictionaryEntryId, word.dictionarySenseId);
        assert.ok(dictionarySense, `Không tìm thấy nghĩa từ điển: ${word.term}.`);
        assert.equal(word.term, dictionarySense.term);
        assert.equal(word.definition, dictionarySense.definition, `Nghĩa không trùng nguồn: ${word.term}.`);
        assert.equal(word.pos, dictionarySense.pos);
        assert.equal(word.subPos, dictionarySense.subPos);
        assert.equal(word.ipa, dictionarySense.ipa);
        const senseKey = `${word.dictionaryEntryId}:${word.dictionarySenseId}`;
        assert.ok(!usedSenseKeys.has(senseKey), `Nghĩa trùng giữa các khóa: ${word.term}.`);
        const meaningKey = `${normalize(word.term)}|${normalize(word.definition)}`;
        assert.ok(!usedMeanings.has(meaningKey), `Cặp từ-nghĩa bị trùng: ${word.term}.`);
        usedSenseKeys.add(senseKey);
        usedMeanings.add(meaningKey);
      }
    }
  }
} finally {
  db.close();
}

console.log(`OK: ${CEFR_COURSES.map(course => `${course.level} ${course.lessons.reduce((n, lesson) => n + lesson.words.length, 0)} mục`).join(' · ')}; bài tối đa 20 mục, không trùng nghĩa với khóa cơ bản, mọi nghĩa khớp SQLite.`);
