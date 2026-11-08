const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { resolve, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { basicCourse, cefrCourses, advancedCourses, collocationCourses, courseCatalog } = require('./test-support.cjs');
const {
  createSupplementalRows,
  compareFrequencyRows,
  supplementalSource,
  frequencySource,
  frequencyOrdering,
  readVerifiedPhraseFrequency,
} = require('./generate-collocation-course.cjs');

const root = resolve(__dirname, '..');
const dataDir = join(root, 'data');
const lessonScreen = fs.readFileSync(join(root, 'app/course/[lessonId].tsx'), 'utf8');
const courseListScreen = fs.readFileSync(join(root, 'app/course-list/[courseId].tsx'), 'utf8');
const dictionaryPath = resolve(root, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const sourcePath = resolve(root, '../../generated-artifacts/collocations/opensubs-en.jsonl');
const wordnetPath = resolve(root, '../../generated-artifacts/collocations/english-wordnet-2025-json.zip');
const phraseFrequencyPath = join(dataDir, frequencySource.countFile);
const manifest = JSON.parse(fs.readFileSync(join(dataDir, 'collocation-course-manifest.json'), 'utf8'));
const { COLLOCATION_COURSES } = collocationCourses;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

assert.match(
  lessonScreen,
  /testID=\{`course-select-collocation-type-\$\{word\.id\}`\}[\s\S]*?\{collocationType\}/,
  'Danh sách chọn từ phải hiển thị nhãn loại cụm từ dữ liệu của từng mục.',
);
assert.doesNotMatch(lessonScreen, /course-frequency|course-select-frequency|displayCollocationFrequency/,
  'Màn học và danh sách chọn từ không hiển thị số đếm hoặc corpus.');
assert.match(courseListScreen, /testID="collocation-frequency-context"/,
  'Trang khóa học phải giải thích nguồn và giới hạn so sánh số đếm.');
assert.equal(basicCourse.displayCollocationFrequency({
  count: 408628, source: 'opensubs-v2018',
}), 'Số lần xuất hiện: 408.628 · OpenSubtitles v2018');
assert.equal(basicCourse.displayCollocationFrequency({
  count: 0, source: 'wikitext-103-raw-v1',
}), 'Số lần xuất hiện: 0 · WikiText-103 Raw v1 (tập huấn luyện)');
assert.equal(basicCourse.displayCollocationFrequency({
  count: null, source: 'opensubs-v2018',
}), 'Số đếm trực tiếp: Chưa có · OpenSubtitles v2018');
assert.equal(basicCourse.displayCollocationFrequency(undefined), null);

assert.equal(COLLOCATION_COURSES.length, 1);
const course = COLLOCATION_COURSES[0];
assert.equal(course.id, 'collocation-1-v1');
assert.equal(course.title, 'Collocation 1');
assert.equal(manifest.source.name, 'OpenSubtitles Collocations');
assert.equal(manifest.source.commit, 'd051fefa5b85c9ffe6882eace8a1abe5543ee730');
assert.equal(manifest.source.license, 'CC BY 4.0');
assert.equal(manifest.source.originalCorpus, 'OpenSubtitles v2018');
assert.equal(manifest.source.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
assert.equal(manifest.supplementalSource.name, supplementalSource.name);
assert.equal(manifest.supplementalSource.version, supplementalSource.version);
assert.equal(manifest.supplementalSource.url, supplementalSource.url);
assert.equal(manifest.supplementalSource.releaseUrl, supplementalSource.releaseUrl);
assert.equal(manifest.supplementalSource.license, supplementalSource.license);
assert.equal(manifest.supplementalSource.licenseUrl, supplementalSource.licenseUrl);
assert.equal(manifest.supplementalSource.upstreamLicense, supplementalSource.upstreamLicense);
assert.equal(manifest.supplementalSource.upstreamLicenseUrl, supplementalSource.upstreamLicenseUrl);
assert.equal(manifest.supplementalSource.fileUrl, supplementalSource.fileUrl);
assert.equal(manifest.supplementalSource.bytes, supplementalSource.bytes);
assert.equal(manifest.supplementalSource.sha256, supplementalSource.sha256);
assert.deepEqual(manifest.frequencySource, frequencySource);
assert.deepEqual(manifest.frequencyOrdering, frequencyOrdering);
assert.equal(manifest.frequencyOrdering.primarySourceCommit, manifest.source.commit);
assert.equal(manifest.frequencyOrdering.primarySourceSha256, manifest.source.sha256);
assert.equal(manifest.dictionary.commit, '388adc0826300912e5b0311c089e0e70494b065f');
assert.equal(manifest.dictionary.license, 'CC BY-SA 4.0');

const sourceBytes = fs.readFileSync(sourcePath);
const wordnetBytes = fs.readFileSync(wordnetPath);
const dictionaryBytes = fs.readFileSync(dictionaryPath);
const phraseFrequencyBytes = fs.readFileSync(phraseFrequencyPath);
assert.equal(sha256(sourceBytes), manifest.source.sha256);
assert.equal(wordnetBytes.byteLength, manifest.supplementalSource.bytes);
assert.equal(sha256(wordnetBytes), manifest.supplementalSource.sha256);
assert.equal(sha256(dictionaryBytes), manifest.dictionary.sha256);
assert.equal(phraseFrequencyBytes.byteLength, manifest.frequencySource.countFileBytes);
assert.equal(sha256(phraseFrequencyBytes), manifest.frequencySource.countFileSha256);
const sourceRows = sourceBytes.toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
const phraseFrequencyRows = readVerifiedPhraseFrequency();
assert.equal(sourceRows.length, 15000);
assert.equal(manifest.sourceCount, sourceRows.length);
assert.equal(manifest.words.filter(item => item.sourceId === 'opensubs').length +
  manifest.missingWords.length + manifest.noExampleWords.length +
  manifest.mismatchedPosWords.length + manifest.skippedDuplicateWords.length, sourceRows.length);
assert.equal(course.sourceCount, manifest.sourceCount + manifest.supplementalSourceCount);
assert.equal(course.missingWords.length, manifest.missingWords.length + manifest.noExampleWords.length + manifest.mismatchedPosWords.length);
assert.equal(course.skippedDuplicateCount, manifest.skippedDuplicateWords.length + manifest.supplementalSkippedDuplicateCount);
assert.equal(course.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0), manifest.words.length);
const firstUnrankedIndex = manifest.words.findIndex(item => item.count === null);
assert.ok(manifest.words.every(item => item.count === null ||
  (Number.isSafeInteger(item.count) && item.count >= 0)),
'Mỗi mục phải có count trực tiếp hợp lệ hoặc null nếu nguồn không có số đếm.');
assert.ok(firstUnrankedIndex === -1 ||
  manifest.words.slice(firstUnrankedIndex).every(item => item.count === null),
'Các cụm không có count trực tiếp phải đứng sau mọi cụm có tần suất quan sát được.');
assert.equal(course.lessons.length, Math.ceil(manifest.words.length / 20));
assert.ok(course.lessons.every(lesson => lesson.words.length > 0 && lesson.words.length <= 20));
assert.ok(course.lessons.slice(0, -1).every(lesson => lesson.words.length === 20));
assert.match(course.attribution, /OpenSubtitles Collocations/);
assert.match(course.attribution, /CC BY 4\.0/);
assert.match(course.attribution, /CC BY-SA 4\.0/);
assert.match(course.attribution, /Open English WordNet 2025 Edition/);
assert.match(course.attribution, /WordNet 3\.1, Copyright 2011 Princeton University/);
assert.match(course.attribution, /WikiText-103 Raw Bigram Counts/);
assert.match(course.attribution, /CC BY-SA 3\.0/);

const sourceByRank = [...sourceRows].sort(compareFrequencyRows);
assert.ok(sourceByRank.every((item, index) => Number.isSafeInteger(item.count) &&
  item.count >= 0 && (index === 0 || compareFrequencyRows(sourceByRank[index - 1], item) <= 0)),
'Nguồn tần suất phải có count trực tiếp và thứ tự ổn định.');
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
  const supplementalRows = createSupplementalRows(
    db,
    wordnetPath,
    new Set(sourceRows.map(row => normalize(row.bigram))),
    phraseFrequencyRows,
  );
  assert.ok(supplementalRows.every((row, index) =>
    index === 0 || compareFrequencyRows(supplementalRows[index - 1], row) <= 0),
  'Các cụm WordNet phải xếp theo count trực tiếp và thứ tự phụ ổn định.');
  assert.equal(manifest.supplementalSourceCount, supplementalRows.length);
  assert.equal(phraseFrequencyRows.length, supplementalRows.length);
  assert.ok(supplementalRows.every(row => Number.isSafeInteger(row.count) && row.count >= 0),
    'Mọi cụm WordNet phải có số đếm trực tiếp từ WikiText-103, kể cả số đếm 0.');
  const supplementalAcceptedCount = manifest.words.filter(item => item.sourceId === 'oewn-2025').length;
  assert.equal(supplementalAcceptedCount +
    manifest.supplementalMissingCount +
    manifest.supplementalNoExampleCount +
    manifest.supplementalMismatchedPosCount +
    manifest.supplementalSkippedDuplicateCount, supplementalRows.length);
  assert.ok(manifest.words.length > 862, 'Collocation 1 cần lớn hơn phiên bản chỉ có OpenSubtitles.');
  assert.ok(supplementalAcceptedCount > 0, 'Chưa có mục nào được thêm từ nguồn bổ sung.');
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
  const acceptedTerms = new Set();
  for (const sourceId of ['opensubs', 'oewn-2025']) {
    const rankedWords = manifest.words.filter(item => item.sourceId === sourceId);
    assert.ok(rankedWords.every((item, index) =>
      index === 0 || rankedWords[index - 1].sourceRank < item.sourceRank),
    `Thứ tự hạng nguồn không được giữ nguyên: ${sourceId}.`);
  }
  const acceptedSupplementalRows = manifest.words.filter(item => item.sourceId === 'oewn-2025');
  assert.ok(acceptedSupplementalRows.every((item, index) =>
    index === 0 || compareFrequencyRows(acceptedSupplementalRows[index - 1], item) <= 0),
  'Các cụm WordNet trong manifest phải xếp theo count trực tiếp, null cuối cùng.');
  const manifestWordsBySense = new Map(manifest.words.map(item => [
    `${item.entryId}:${item.senseId}`,
    item,
  ]));
  const primarySourceTerms = new Set(sourceRows.map(row => normalize(row.bigram)));
  for (const item of manifest.words) {
    assert.ok(['opensubs', 'oewn-2025'].includes(item.sourceId), `Nguồn không hợp lệ: ${item.sourceId}.`);
    assert.ok(Number.isInteger(item.sourceRank) && item.sourceRank > 0);
    const normalizedTerm = normalize(item.bigram);
    assert.ok(!acceptedTerms.has(normalizedTerm), `Cụm bị lặp trong Collocation 1: ${item.bigram}.`);
    acceptedTerms.add(normalizedTerm);
    if (item.sourceId === 'opensubs') {
      const source = sourceByRank[item.sourceRank - 1];
      assert.equal(source.bigram, item.bigram);
      assert.equal(source.type, item.type);
      assert.equal(source.lang, 'en');
      assert.equal(item.count, source.count);
    } else {
      assert.ok(!primarySourceTerms.has(normalizedTerm), `Cụm WordNet đã có trong nguồn OpenSubtitles: ${item.bigram}.`);
      const source = supplementalRows[item.sourceRank - 1];
      assert.ok(source, `Không tìm thấy mục WordNet hạng ${item.sourceRank}.`);
      assert.equal(source.bigram, item.bigram);
      assert.equal(source.type, item.type);
      assert.equal(item.count, source.count);
      assert.ok(['VERB+ADP', 'VERB+NOUN'].includes(item.type)
        ? source.sourcePos === 'verb'
        : source.sourcePos === 'noun');
    }
    acceptedKeys.add(`${item.entryId}:${item.senseId}`);
  }
  const words = course.lessons.flatMap(lesson => lesson.words);
  assert.equal(words.length, manifest.words.length);
  assert.ok(words.every((word, index) =>
    word.frequency?.count === manifest.words[index].count &&
    word.frequency?.source === (manifest.words[index].sourceId === 'opensubs'
      ? 'opensubs-v2018'
      : 'wikitext-103-raw-v1')),
  'Số đếm trực tiếp và corpus phải được giữ trên từng mục từ trong bài học.');
  assert.deepEqual(
    words.map(word => `${word.dictionaryEntryId}:${word.dictionarySenseId}`),
    manifest.words.map(item => `${item.entryId}:${item.senseId}`),
    'Thứ tự từ trong bài học không khớp thứ tự xếp hạng trong manifest.',
  );
  const seenCollocationTypes = new Set();
  for (const lesson of course.lessons) {
    assert.ok(lesson.id.startsWith('collocation-1-v1-'));
    for (const word of lesson.words) {
      const key = `${word.dictionaryEntryId}:${word.dictionarySenseId}`;
      assert.ok(acceptedKeys.has(key), `Mục không nằm trong manifest: ${word.term}.`);
      const manifestWord = manifestWordsBySense.get(key);
      assert.ok(manifestWord, `Không tìm thấy loại cụm trong manifest: ${word.term}.`);
      assert.equal(word.collocationType, manifestWord.type, `Loại cụm không khớp nguồn đã ghim: ${word.term}.`);
      const expectedLabel = {
        'VERB+ADP': 'Động từ + giới từ',
        'ADJ+NOUN': 'Tính từ + danh từ',
        'VERB+NOUN': 'Động từ + danh từ',
      }[manifestWord.type];
      assert.ok(expectedLabel, `Loại cụm không được hỗ trợ: ${manifestWord.type}.`);
      assert.equal(basicCourse.displayCollocationType(word), expectedLabel);
      seenCollocationTypes.add(word.collocationType);
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
  assert.deepEqual(seenCollocationTypes, new Set(['VERB+ADP', 'ADJ+NOUN', 'VERB+NOUN']));
  assert.equal(basicCourse.displayCollocationType(basicCourse.BASIC_COURSE_LESSONS[0].words[0]), null);
  assert.ok(courseCatalog.COURSE_CATALOGS.some(item => item.id === 'collocation-1-v1'));
} finally {
  db.close();
}

console.log(`PASS: Collocation 1 có ${manifest.words.length} mục, bài 20 từ, ví dụ/IPA/nghĩa khớp SQLite, không trùng các khóa khác.`);
