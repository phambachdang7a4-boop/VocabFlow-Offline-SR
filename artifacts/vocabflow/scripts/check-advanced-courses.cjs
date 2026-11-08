const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { resolve, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { advancedCourses, courseCatalog, loadTs } = require('./test-support.cjs');

const root = resolve(__dirname, '..');
const dataDir = join(root, 'data');
const dictionaryPath = resolve(root, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const manifest = JSON.parse(fs.readFileSync(join(dataDir, 'advanced-course-manifest.json'), 'utf8'));
const basicManifest = JSON.parse(fs.readFileSync(join(dataDir, 'basic-course-manifest.json'), 'utf8'));
const cefrManifest = JSON.parse(fs.readFileSync(join(dataDir, 'cefr-course-manifest.json'), 'utf8'));
const { ADVANCED_COURSES } = advancedCourses;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && !field) quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const [headers, ...values] = rows;
  return values.filter(value => value.some(Boolean)).map(value =>
    Object.fromEntries(headers.map((header, index) => [header, value[index]])),
  );
}

const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(ADVANCED_COURSES.map(course => course.level), ['C1', 'C2']);
assert.deepEqual(ADVANCED_COURSES.map(course => course.id), ['vocab-c1-v1', 'vocab-c2-v1']);
assert.deepEqual(ADVANCED_COURSES.map(course => course.title), ['Từ Vựng C1', 'Từ Vựng C2']);
assert.equal(manifest.sources.lexicore.commit, '47460d26346380cc2bfcd399699cad6c391d8412');
assert.equal(manifest.sources.lexicore.license, 'CC BY 4.0');
assert.equal(manifest.sources.octanove.commit, 'd4e45b75b38f27b30dfc5c44d8c571aec7e7092f');
assert.equal(manifest.sources.octanove.license, 'CC BY-SA 4.0');
assert.equal(manifest.dictionary.commit, '388adc0826300912e5b0311c089e0e70494b065f');
assert.equal(manifest.dictionary.license, 'CC BY-SA 4.0');

const lexicoreBytes = fs.readFileSync(resolve(root, '../../generated-artifacts/cefr/LexiCore_5000.csv'));
const octanoveBytes = fs.readFileSync(resolve(root, '../../generated-artifacts/cefr/octanove-vocabulary-profile-c1c2-1.0.csv'));
const dictionaryBytes = fs.readFileSync(dictionaryPath);
assert.equal(sha256(lexicoreBytes), manifest.sources.lexicore.sha256);
assert.equal(sha256(octanoveBytes), manifest.sources.octanove.sha256);
assert.equal(sha256(dictionaryBytes), manifest.dictionary.sha256);
const sourceRows = {
  C1: parseCsv(lexicoreBytes.toString('utf8')).filter(row => row.cefr_level === 'C1'),
  C2: parseCsv(octanoveBytes.toString('utf8')).filter(row => row.CEFR === 'C2'),
};
assert.equal(sourceRows.C1.length, 1000);
assert.equal(sourceRows.C2.length, manifest.levels.C2.sourceCount);

const db = new DatabaseSync(dictionaryPath, { readOnly: true });
const dictionarySense = db.prepare(`
  SELECT w.word AS term, wd.id AS senseId, d.definition, d.pos, d.sub_pos AS subPos, wd.example,
    COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
  FROM words w
  JOIN word_definitions wd ON wd.word_id = w.id
  JOIN definitions d ON d.id = wd.definition_id
  WHERE w.id = ? AND wd.id = ? AND d.definition_lang = 'vi'
`);
const usedSenses = new Set();
const usedMeanings = new Set();
try {
  const seedManifests = [
    basicManifest.lessons.flatMap(lesson => lesson.words),
    ...Object.values(cefrManifest.levels).map(level => level.words),
  ];
  for (const words of seedManifests) {
    for (const word of words) {
      const sense = dictionarySense.get(word.entryId, word.senseId);
      assert.ok(sense, `Không tìm thấy sense khóa hiện có: ${word.term}.`);
      usedSenses.add(`${word.entryId}:${word.senseId}`);
      usedMeanings.add(`${normalize(sense.term)}|${normalize(sense.definition)}`);
    }
  }

  for (const course of ADVANCED_COURSES) {
    const level = manifest.levels[course.level];
    const sourceName = course.level === 'C1' ? 'word' : 'headword';
    const sourcePos = 'pos';
    const levelRows = sourceRows[course.level];
    const count = course.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0);
    assert.equal(level.sourceCount, levelRows.length);
    assert.equal(count, level.words.length);
    assert.ok(count > 900, `${course.level} cần hơn 900 mục tra được offline.`);
    assert.equal(course.missingWords.length, level.missingWords.length + level.noExampleWords.length);
    assert.equal(course.skippedDuplicateCount, level.skippedDuplicateWords.length);
    assert.equal(level.words.length + level.missingWords.length + level.noExampleWords.length + level.skippedDuplicateWords.length, level.sourceCount);
    assert.ok(course.lessons.length > 40);
    assert.ok(course.lessons.every(lesson => lesson.words.length > 0 && lesson.words.length <= 20));
    assert.ok(course.lessons.slice(0, -1).every(lesson => lesson.words.length === 20));
    assert.match(course.attribution, /Skypedia/);
    assert.match(course.attribution, course.level === 'C1' ? /CC BY 4\.0/ : /CC BY-SA 4\.0/);
    const acceptedByKey = new Map(level.words.map(word => [`${word.entryId}:${word.senseId}`, word]));

    for (const lesson of course.lessons) {
      assert.ok(lesson.id.startsWith(`${course.id}-`));
      for (const word of lesson.words) {
        const source = acceptedByKey.get(`${word.dictionaryEntryId}:${word.dictionarySenseId}`);
        assert.ok(source, `Mục khóa học không nằm trong manifest nguồn: ${word.term}.`);
        assert.ok(levelRows.some(row =>
          normalize(row[sourceName]) === normalize(source.sourceWord) && row[sourcePos] === source.sourcePos),
        `Mục ${source.sourceWord} không có trong danh sách ${course.level}.`);
        assert.equal(word.term, source.term);
        assert.equal(word.id, `dict:${word.dictionaryEntryId}:${word.dictionarySenseId}`);
        assert.ok(word.example.trim(), `Thiếu ví dụ: ${word.term}.`);
        const exact = dictionarySense.get(word.dictionaryEntryId, word.dictionarySenseId);
        assert.ok(exact, `Không khớp SQLite: ${word.term}.`);
        assert.equal(word.term, exact.term);
        assert.equal(word.definition, exact.definition);
        assert.equal(word.pos, exact.pos);
        assert.equal(word.subPos, exact.subPos);
        assert.equal(word.ipa, exact.ipa);
        assert.equal(word.example, exact.example);
        const senseKey = `${word.dictionaryEntryId}:${word.dictionarySenseId}`;
        const meaningKey = `${normalize(word.term)}|${normalize(word.definition)}`;
        assert.ok(!usedSenses.has(senseKey), `Sense bị trùng giữa các khóa: ${word.term}.`);
        assert.ok(!usedMeanings.has(meaningKey), `Nghĩa bị trùng giữa các khóa: ${word.term}.`);
        usedSenses.add(senseKey);
        usedMeanings.add(meaningKey);
      }
    }
  }

  for (const id of ['vocab-c1-v1', 'vocab-c2-v1']) {
    assert.ok(courseCatalog.COURSE_CATALOGS.some(course => course.id === id), `Thiếu ${id} trong catalog.`);
  }
} finally {
  db.close();
}

console.log(`PASS: C1 ${manifest.levels.C1.words.length}, C2 ${manifest.levels.C2.words.length}; nguồn đã ghim, nghĩa/IPA/ví dụ khớp SQLite và không trùng khóa hiện có.`);
