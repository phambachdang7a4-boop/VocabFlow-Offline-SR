const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { resolve, join } = require('node:path');

const appRoot = resolve(__dirname, '..');
const dataDir = join(appRoot, 'data');
const coursePath = join(dataDir, 'basic-course.ts');
const manifestPath = join(dataDir, 'basic-course-manifest.json');
const dictionaryPath = resolve(appRoot, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const source = {
  commit: '388adc0826300912e5b0311c089e0e70494b065f',
  sha256: '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a',
  bytes: 44212224,
};

const titles = {
  family: 'Gia đình',
  home: 'Nhà cửa',
  numbers: 'Số đếm',
  time: 'Thời gian',
  food: 'Đồ ăn',
  cooking: 'Nấu ăn',
  clothes: 'Quần áo',
  health: 'Sức khỏe',
  school: 'Trường học',
  work: 'Công việc',
  travel: 'Du lịch',
  places: 'Thành phố',
  shopping: 'Mua sắm',
  weather: 'Thời tiết',
  animals: 'Động vật',
  'daily-routine': 'Sinh hoạt hằng ngày',
  technology: 'Công nghệ',
  emotions: 'Cảm xúc',
  'verbs-one': 'Động từ 1',
  'verbs-two': 'Động từ 2',
  adjectives: 'Tính từ',
  directions: 'Phương hướng',
  objects: 'Đồ vật',
  connectors: 'Từ nối',
};

const replacements = {
  'family|grandpa': ['granddaughter', 78723, 162296],
  'family|grandparent': ['grandson', 78732, 162312],
  'home|living room': ['parlor', 84233, 172156],
  'home|dining room': ['pantry', 84139, 171971],
  'home|air conditioner': ['radiator', 85956, 175202],
  'home|garage': ['balcony', 69152, 145478],
  'home|stairs': ['stair', 213507, 418595],
  'cooking|stove': ['cooker', 73760, 153509],
  'cooking|blender': ['mixer', 113977, 247573],
  'cooking|cutting board': ['grater', 156873, 336128],
  'cooking|kitchen towel': ['napkin', 153140, 327835],
  'cooking|tablecloth': ['sieve', 118627, 257935],
  'clothes|shoes': ['shoe', 219891, 430459],
  'clothes|sandals': ['sandal', 219931, 430661],
  'clothes|white': ['violet', 106727, 230430],
  'clothes|socks': ['sock', 153580, 330467],
  'clothes|boots': ['boot', 152255, 322919],
  'clothes|gloves': ['glove', 152836, 326281],
  'clothes|gray': ['grey', 175202, 362501],
  'health|clinic': ['pharmacy', 84657, 172939],
  'school|exam': ['examination', 75895, 157238],
  'school|schoolbag': ['satchel', 86945, 177179],
  'work|office': ['workplace', 371280, 634373],
  'work|resume': ['employment', 75415, 156485],
  'work|police officer': ['policeman', 85061, 173611],
  'places|post office': ['mailbox', 82223, 168604],
  'places|police station': ['jail', 203917, 404570],
  'places|fire station': ['court', 152517, 324374],
  'places|parking lot': ['garage', 100322, 215632],
  'places|cafe': ['café', 120731, 264723],
  'shopping|small change': ['change', 96130, 206932],
  'shopping|checkout': ['counter', 201770, 399486],
  'shopping|fitting room': ['fitting', 158349, 339630],
  'shopping|online order': ['order', 153213, 328159],
  'animals|fur': ['mane', 82338, 168809],
  'daily-routine|alarm clock': ['clock', 152427, 323919],
  'daily-routine|toothbrush': ['brush', 152295, 323189],
  'daily-routine|washing machine': ['washer', 206436, 408586],
  'daily-routine|go to bed': ['retire', 118917, 258993],
  'daily-routine|fall asleep': ['slumber', 153559, 330289],
  'daily-routine|vacuum': ['duster', 75136, 156009],
  'technology|app': ['software', 115424, 250277],
  'technology|username': ['user', 116673, 252420],
  'technology|wi-fi': ['wireless', 117252, 253499],
  'technology|social media': ['media', 203561, 403772],
  'technology|photo': ['photograph', 119540, 261319],
  'technology|speaker': ['loudspeaker', 81974, 168134],
  'emotions|shy': ['timid', 115617, 250627],
  'verbs-two|fly': ['soar', 115422, 250269],
  'adjectives|best': ['excellent', 69033, 145285],
  'directions|in front of': ['ahead', 152103, 322219],
  'objects|machine': ['machinery', 150846, 319852],
  'connectors|quite': ['rather', 153384, 329179],
};

const senseOverrides = {
  'clothes|take off': [373230, 637674],
  'places|neighborhood': [215076, 420946],
  'daily-routine|shower': [87632, 178370],
  'technology|link': [64163, 136910],
  'technology|file': [64161, 136907],
  'emotions|excited': [154827, 332380],
  'emotions|relaxed': [164353, 348249],
};

const colorSenses = [
  { entryId: 153208, senseId: 328143, term: 'orange' },
  { entryId: 119528, senseId: 261258, term: 'pink' },
  { entryId: 85774, senseId: 174877, term: 'purple' },
  { entryId: 175202, senseId: 362508, term: 'grey' },
  { entryId: 106727, senseId: 230431, term: 'violet' },
  { entryId: 69533, senseId: 146156, term: 'beige' },
  { entryId: 78578, senseId: 162029, term: 'gold' },
  { entryId: 153534, senseId: 330147, term: 'silver' },
  { entryId: 119971, senseId: 262754, term: 'maroon' },
  { entryId: 218184, senseId: 425757, term: 'turquoise' },
  { entryId: 229092, senseId: 442131, term: 'cyan' },
  { entryId: 82179, senseId: 168519, term: 'magenta' },
  { entryId: 204008, senseId: 404774, term: 'indigo' },
];

function normalize(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function scoreDefinition(oldMeaning, definition) {
  const fold = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('vi')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const old = fold(oldMeaning);
  const sourceMeaning = fold(definition);
  if (!old || !sourceMeaning) return 0;
  const oldWords = new Set(old.split(' '));
  const sourceWords = new Set(sourceMeaning.split(' '));
  let overlap = 0;
  for (const word of oldWords) if (sourceWords.has(word)) overlap += 1;
  return overlap * 10 + (sourceMeaning.includes(old) || old.includes(sourceMeaning) ? 3 : 0);
}

function readLegacyTerms() {
  let text = fs.readFileSync(coursePath, 'utf8');
  let start = text.indexOf('const rawLessons');
  if (start < 0) {
    text = execFileSync('git', ['show', 'HEAD:artifacts/vocabflow/data/basic-course.ts'], { encoding: 'utf8' });
    start = text.indexOf('const rawLessons');
  }
  const end = text.indexOf('\n];', start);
  assert.ok(start >= 0 && end > start, 'Không tìm thấy dữ liệu khóa học cũ để chuyển đổi.');
  const lessonMatches = [...text.slice(start, end).matchAll(
    /id: '([^']+)'[\s\S]*?entries: `([\s\S]*?)`/g,
  )];
  return lessonMatches
    .map(([, id, entries]) => ({
      id,
      words: entries.trim().split('\n').filter(Boolean).map(row => {
        const divider = row.indexOf('|');
        assert.ok(divider > 0, `Dòng dữ liệu cũ không hợp lệ trong bài ${id}.`);
        return {
          term: row.slice(0, divider).trim(),
          oldMeaning: row.slice(divider + 1).trim(),
        };
      }),
    }))
    .filter(lesson => lesson.id !== 'greetings');
}

function queryDictionary(db) {
  const candidates = db.prepare(`
    SELECT w.id AS entryId, w.word AS term, wd.id AS senseId,
      d.definition, d.pos, d.sub_pos AS subPos, wd.example,
      COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
    FROM words w
    JOIN word_definitions wd ON wd.word_id = w.id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE w.word = ? COLLATE NOCASE AND d.definition_lang = 'vi'
    ORDER BY w.id, wd.id
  `);
  const exactSense = db.prepare(`
    SELECT w.id AS entryId, w.word AS term, wd.id AS senseId,
      d.definition, d.pos, d.sub_pos AS subPos, wd.example,
      COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
    FROM words w
    JOIN word_definitions wd ON wd.word_id = w.id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE w.id = ? AND wd.id = ? AND d.definition_lang = 'vi'
  `);
  return { candidates: term => candidates.all(term), exactSense: (entryId, senseId) => exactSense.get(entryId, senseId) };
}

function createManifest(db) {
  const lookup = queryDictionary(db);
  const usedSenses = new Set();
  const usedMeaningPairs = new Set();
  const manifestLessons = [];
  const replacementKeysUsed = new Set();

  for (const legacy of readLegacyTerms()) {
    const baseTitle = titles[legacy.id];
    assert.ok(baseTitle, `Thiếu chủ đề cho ${legacy.id}.`);
    const words = legacy.words.map(({ term: oldTerm, oldMeaning }) => {
      const replacementKey = `${legacy.id}|${normalize(oldTerm)}`;
      const replacement = replacements[replacementKey];
      const preferredSense = senseOverrides[replacementKey];
      if (replacement) replacementKeysUsed.add(replacementKey);
      const targetTerm = replacement?.[0] ?? oldTerm;
      let available = lookup.candidates(targetTerm);
      assert.ok(available.length, `Không có mục từ tiếng Việt trong từ điển: ${legacy.id}/${targetTerm}.`);

      if (replacement || preferredSense) {
        const [entryId, senseId] = replacement ? replacement.slice(1) : preferredSense;
        available = available.filter(item => item.entryId === entryId && item.senseId === senseId);
        assert.equal(available.length, 1, `ID từ điển thay thế sai: ${targetTerm}.`);
      } else {
        available = available
          .map(item => ({ ...item, score: scoreDefinition(oldMeaning, item.definition) }))
          .sort((a, b) => b.score - a.score || a.senseId - b.senseId);
      }

      const selected = available.find(item => {
        const sourceKey = `${item.entryId}:${item.senseId}`;
        const meaningKey = `${normalize(item.term)}|${normalize(item.definition)}`;
        return !usedSenses.has(sourceKey) && !usedMeaningPairs.has(meaningKey);
      });
      assert.ok(selected, `Không tìm được nghĩa từ điển riêng cho ${legacy.id}/${targetTerm}.`);
      const sourceKey = `${selected.entryId}:${selected.senseId}`;
      const meaningKey = `${normalize(selected.term)}|${normalize(selected.definition)}`;
      usedSenses.add(sourceKey);
      usedMeaningPairs.add(meaningKey);
      return selected;
    });

    const middle = Math.ceil(words.length / 2);
    for (const [part, partWords] of [[1, words.slice(0, middle)], [2, words.slice(middle)]]) {
      manifestLessons.push({
        id: `basic-965-v2-${legacy.id}-${part}`,
        title: `${baseTitle} ${part}`,
        words: partWords.map(({ entryId, senseId, term }) => ({ entryId, senseId, term })),
      });
    }
  }

  const colorWords = colorSenses.map(({ entryId, senseId, term }) => {
    const sense = lookup.exactSense(entryId, senseId);
    assert.ok(sense, `Không tìm thấy nghĩa màu sắc trong từ điển: ${term}.`);
    assert.equal(normalize(sense.term), normalize(term), `Đầu mục màu sắc không khớp: ${term}.`);
    return { entryId, senseId, term: sense.term };
  });
  const existingSenseKeys = new Set(manifestLessons.flatMap(lesson =>
    lesson.words.map(word => `${word.entryId}:${word.senseId}`),
  ));
  for (const word of colorWords) {
    assert.ok(!existingSenseKeys.has(`${word.entryId}:${word.senseId}`), `Nghĩa màu sắc đã có trong khóa: ${word.term}.`);
  }
  const clothesLessonIndex = manifestLessons.findIndex(lesson => lesson.id === 'basic-965-v2-clothes-2');
  assert.ok(clothesLessonIndex >= 0, 'Không tìm thấy vị trí để chèn bài Màu sắc.');
  manifestLessons.splice(clothesLessonIndex + 1, 0, {
    id: 'basic-965-v2-colors-1',
    title: 'Màu sắc',
    words: colorWords,
  });

  assert.equal(Object.keys(replacements).length, 53, 'Số mục thay thế không đúng dự kiến.');
  assert.equal(replacementKeysUsed.size, Object.keys(replacements).length, 'Có quy tắc thay thế không dùng hoặc bị bỏ quên.');
  assert.equal(manifestLessons.length, 49);
  assert.equal(manifestLessons.reduce((sum, lesson) => sum + lesson.words.length, 0), 978);
  return {
    courseId: 'basic-965-v2',
    sourceCommit: source.commit,
    sourceSha256: source.sha256,
    lessons: manifestLessons,
  };
}

function buildCourseData(db, manifest) {
  assert.equal(manifest.sourceCommit, source.commit, 'Manifest dùng commit từ điển khác.');
  assert.equal(manifest.sourceSha256, source.sha256, 'Manifest không khớp checksum từ điển.');
  const lookup = queryDictionary(db);
  const lessons = manifest.lessons.map(lesson => ({
    id: lesson.id,
    title: lesson.title,
    words: lesson.words.map(({ entryId, senseId, term }) => {
      const sense = lookup.exactSense(entryId, senseId);
      assert.ok(sense, `Không còn nghĩa từ điển ${entryId}/${senseId}.`);
      assert.equal(normalize(sense.term), normalize(term), `Đầu mục từ điển đã đổi: ${term}.`);
      return {
        id: `dict:${entryId}:${senseId}`,
        dictionaryEntryId: entryId,
        dictionarySenseId: senseId,
        term: sense.term,
        definition: sense.definition,
        pos: sense.pos,
        subPos: sense.subPos,
        ipa: sense.ipa,
        example: sense.example,
      };
    }),
  }));
  return lessons;
}

function renderTypeScript(lessons) {
  const specs = lessons.map(({ id, title }) => ({ id, title }));
  const rows = lessons.flatMap(lesson => lesson.words.map(word => [
    lesson.id, word.id, word.dictionaryEntryId, word.dictionarySenseId, word.term,
    word.definition, word.pos, word.subPos, word.ipa, word.example,
  ]));
  return `export interface BasicCourseWord {
  id: string;
  dictionaryEntryId: number;
  dictionarySenseId: number;
  term: string;
  definition: string;
  collocationType?: CollocationType;
  pos: string | null;
  subPos: string | null;
  ipa: string;
  example: string;
}

export type CollocationType = 'VERB+ADP' | 'ADJ+NOUN' | 'VERB+NOUN';

export interface BasicCourseLesson {
  id: string;
  title: string;
  words: BasicCourseWord[];
}

const lessonSpecs: { id: string; title: string }[] = ${JSON.stringify(specs)};
const courseRows: [string, string, number, number, string, string, string | null, string | null, string, string][] =
  ${JSON.stringify(rows)};

export const BASIC_COURSE_ID = 'basic-965-v2';
export const BASIC_COURSE_TITLE = '978 từ cơ bản';
export const BASIC_COURSE_SOURCE_COMMIT = '${source.commit}';
export const BASIC_COURSE_ATTRIBUTION = 'Nguồn: Skypedia / MinhQND, CC BY-SA 4.0. https://github.com/skypediacode/english-vietnamese-dictionary/tree/${source.commit}';

export const BASIC_COURSE_LESSONS: BasicCourseLesson[] = lessonSpecs.map(lesson => ({
  ...lesson,
  words: courseRows.filter(row => row[0] === lesson.id).map(([, id, dictionaryEntryId, dictionarySenseId, term, definition, pos, subPos, ipa, example]) => ({
    id, dictionaryEntryId, dictionarySenseId, term, definition, pos, subPos, ipa, example,
  })),
}));

export const BASIC_COURSE_WORD_COUNT = BASIC_COURSE_LESSONS.reduce((sum, lesson) => sum + lesson.words.length, 0);

export function displayCourseMeaning(word: BasicCourseWord): string {
  const kind = [word.pos, word.subPos].filter(Boolean).join(' · ');
  return \`\${kind ? \`(\${kind}) \` : ''}\${word.definition}\`;
}

export function displayCollocationType(word: BasicCourseWord): string | null {
  switch (word.collocationType) {
    case 'VERB+ADP': return 'Động từ + giới từ';
    case 'ADJ+NOUN': return 'Tính từ + danh từ';
    case 'VERB+NOUN': return 'Động từ + danh từ';
    default: return null;
  }
}
`;
}

function main() {
  const bytes = fs.readFileSync(dictionaryPath);
  assert.equal(bytes.byteLength, source.bytes, 'Kho từ điển không đúng kích thước đã ghim.');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, 'Kho từ điển không đúng SHA-256 đã ghim.');
  const db = new DatabaseSync(dictionaryPath, { readOnly: true });
  try {
    const refreshManifest = process.argv.includes('--rebuild-manifest');
    const manifest = !refreshManifest && fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : createManifest(db);
    const lessons = buildCourseData(db, manifest);
    assert.equal(lessons.length, 49);
    assert.equal(lessons.reduce((sum, lesson) => sum + lesson.words.length, 0), 978);
    if (refreshManifest || !fs.existsSync(manifestPath)) {
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    fs.writeFileSync(coursePath, renderTypeScript(lessons));
    console.log(`Đã tạo ${lessons.length} bài / ${lessons.reduce((sum, lesson) => sum + lesson.words.length, 0)} mục từ-nghĩa từ commit ${source.commit}.`);
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
