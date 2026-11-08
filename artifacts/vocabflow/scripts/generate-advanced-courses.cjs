const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { resolve, join } = require('node:path');

const appRoot = resolve(__dirname, '..');
const dataDir = join(appRoot, 'data');
const cacheDir = resolve(appRoot, '../../generated-artifacts/cefr');
const lexicorePath = join(cacheDir, 'LexiCore_5000.csv');
const octanovePath = join(cacheDir, 'octanove-vocabulary-profile-c1c2-1.0.csv');
const dictionaryPath = resolve(appRoot, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const basicManifestPath = join(dataDir, 'basic-course-manifest.json');
const cefrManifestPath = join(dataDir, 'cefr-course-manifest.json');
const outputManifestPath = join(dataDir, 'advanced-course-manifest.json');
const outputTypeScriptPath = join(dataDir, 'advanced-courses.ts');

const lexicore = {
  name: 'LexiCore-5000',
  url: 'https://github.com/X-Trivle/LexiCore',
  commit: '47460d26346380cc2bfcd399699cad6c391d8412',
  license: 'CC BY 4.0',
  csvUrl: 'https://raw.githubusercontent.com/X-Trivle/LexiCore/47460d26346380cc2bfcd399699cad6c391d8412/data/LexiCore_5000.csv',
  bytes: 303824,
  sha256: '49ae7a92ef5a9301286a6607f2f2e1e4b8a0f381784ad65996c36af187854de4',
};
const octanove = {
  name: 'Octanove Vocabulary Profile C1/C2 1.0',
  url: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
  commit: 'd4e45b75b38f27b30dfc5c44d8c571aec7e7092f',
  path: 'octanove-vocabulary-profile-c1c2-1.0.csv',
  license: 'CC BY-SA 4.0',
  csvUrl: 'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f/octanove-vocabulary-profile-c1c2-1.0.csv',
  bytes: 46462,
  sha256: '18c33a407f2f89f7b8de9671c6d45fe3ea0bce45e7d2d7dcaab48d73e0f7b380',
};
const dictionary = {
  url: 'https://github.com/skypediacode/english-vietnamese-dictionary',
  commit: '388adc0826300912e5b0311c089e0e70494b065f',
  license: 'CC BY-SA 4.0',
  bytes: 44212224,
  sha256: '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a',
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function downloadVerified(path, url, expectedBytes, expectedHash, label) {
  fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(path)) {
    execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', url, '-o', path]);
  }
  const bytes = fs.readFileSync(path);
  assert.equal(bytes.byteLength, expectedBytes, `${label}: kích thước không khớp bản đã ghim.`);
  assert.equal(sha256(bytes), expectedHash, `${label}: SHA-256 không khớp bản đã ghim.`);
  return bytes.toString('utf8').replace(/^\uFEFF/, '');
}

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
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  assert.ok(!quoted, 'CSV nguồn có dấu ngoặc kép chưa đóng.');
  const [headers, ...data] = rows;
  assert.ok(headers?.length, 'CSV nguồn thiếu tiêu đề.');
  return data.filter(values => values.some(Boolean)).map(values => {
    assert.equal(values.length, headers.length, 'CSV nguồn có số cột không hợp lệ.');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function normalize(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function posGroup(value) {
  const pos = String(value ?? '').toLocaleLowerCase('en').replace(/[^a-z]/g, '');
  if (pos === 'n' || pos === 'noun') return 'noun';
  if (pos === 'v' || pos === 'verb') return 'verb';
  if (pos === 'a' || pos === 'adj' || pos === 'adjective') return 'adjective';
  if (pos === 'd' || pos === 'adv' || pos === 'adverb') return 'adverb';
  return 'other';
}

function sourceTerms(value) {
  return [...new Set(String(value ?? '').split(/[\/|]/).map(term => term.trim()).filter(Boolean))];
}

function sourceCandidates(row, termField, posField, rank) {
  const sourceWord = String(row[termField] ?? '').trim();
  return {
    sourceWord,
    sourcePos: String(row[posField] ?? '').trim(),
    rank,
    terms: sourceTerms(sourceWord),
  };
}

function seedUsedSets(db) {
  const usedSenses = new Set();
  const usedMeanings = new Set();
  const senses = [];
  const basic = JSON.parse(fs.readFileSync(basicManifestPath, 'utf8'));
  for (const lesson of basic.lessons) {
    for (const word of lesson.words) senses.push([word.entryId, word.senseId]);
  }
  const cefr = JSON.parse(fs.readFileSync(cefrManifestPath, 'utf8'));
  for (const level of Object.values(cefr.levels)) {
    for (const word of level.words) senses.push([word.entryId, word.senseId]);
  }
  db.exec('CREATE TEMP TABLE seed_course_senses (entry_id INTEGER NOT NULL, sense_id INTEGER NOT NULL, PRIMARY KEY(entry_id, sense_id));');
  const insert = db.prepare('INSERT OR IGNORE INTO seed_course_senses(entry_id, sense_id) VALUES (?, ?)');
  for (const [entryId, senseId] of senses) insert.run(entryId, senseId);
  const existing = db.prepare(`
    SELECT w.id AS entryId, wd.id AS senseId, w.word AS term, d.definition
    FROM seed_course_senses s
    JOIN words w ON w.id = s.entry_id
    JOIN word_definitions wd ON wd.id = s.sense_id AND wd.word_id = w.id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE d.definition_lang = 'vi'
  `).all();
  assert.equal(existing.length, new Set(senses.map(([entryId, senseId]) => `${entryId}:${senseId}`)).size,
    'Không thể đọc đầy đủ các sense trong khóa hiện có.');
  for (const sense of existing) {
    usedSenses.add(`${sense.entryId}:${sense.senseId}`);
    usedMeanings.add(`${normalize(sense.term)}|${normalize(sense.definition)}`);
  }
  return { usedSenses, usedMeanings };
}

function createLookup(db, terms) {
  db.exec('CREATE TEMP TABLE advanced_source_terms (term TEXT PRIMARY KEY COLLATE NOCASE);');
  const insert = db.prepare('INSERT OR IGNORE INTO advanced_source_terms(term) VALUES (?)');
  for (const term of terms) insert.run(term);
  const rows = db.prepare(`
    SELECT w.id AS entryId, w.word AS term, wd.id AS senseId,
      d.definition, d.pos, d.sub_pos AS subPos, wd.example,
      COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
    FROM advanced_source_terms s
    JOIN words w ON w.word = s.term COLLATE NOCASE
    JOIN word_definitions wd ON wd.word_id = w.id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE d.definition_lang = 'vi'
    ORDER BY w.id, wd.id
  `).all();
  const byTerm = new Map();
  for (const row of rows) {
    const key = normalize(row.term);
    if (!byTerm.has(key)) byTerm.set(key, []);
    byTerm.get(key).push(row);
  }
  return term => byTerm.get(normalize(term)) ?? [];
}

function mapLevel(level, inputWords, lookup, usedSenses, usedMeanings) {
  const accepted = [];
  const missingWords = [];
  const skippedDuplicateWords = [];
  const noExampleWords = [];
  for (const input of inputWords) {
    const candidates = input.terms.flatMap(term => lookup(term));
    if (!candidates.length) {
      missingWords.push(input.sourceWord);
      continue;
    }
    const expectedPos = posGroup(input.sourcePos);
    const samePos = expectedPos === 'other'
      ? candidates
      : candidates.filter(candidate => posGroup(candidate.pos) === expectedPos);
    const ordered = [...samePos, ...candidates.filter(candidate => !samePos.includes(candidate))];
    const withExamples = ordered.filter(candidate => candidate.example?.trim());
    if (!withExamples.length) {
      noExampleWords.push(input.sourceWord);
      continue;
    }
    const selected = withExamples.find(candidate => {
      const senseKey = `${candidate.entryId}:${candidate.senseId}`;
      const meaningKey = `${normalize(candidate.term)}|${normalize(candidate.definition)}`;
      return !usedSenses.has(senseKey) && !usedMeanings.has(meaningKey);
    });
    if (!selected) {
      skippedDuplicateWords.push(input.sourceWord);
      continue;
    }
    usedSenses.add(`${selected.entryId}:${selected.senseId}`);
    usedMeanings.add(`${normalize(selected.term)}|${normalize(selected.definition)}`);
    accepted.push({
      rank: input.rank,
      sourceWord: input.sourceWord,
      sourcePos: input.sourcePos,
      entryId: selected.entryId,
      senseId: selected.senseId,
      term: selected.term,
    });
  }
  return {
    sourceCount: inputWords.length,
    missingWords,
    noExampleWords,
    skippedDuplicateWords,
    skippedDuplicate: skippedDuplicateWords.length,
    words: accepted,
  };
}

function buildLessons(level, levelManifest, lookup) {
  const words = levelManifest.words.map(item => {
    const sense = lookup(item.term).find(candidate =>
      candidate.entryId === item.entryId && candidate.senseId === item.senseId);
    assert.ok(sense, `Không còn nghĩa từ điển ${item.entryId}/${item.senseId}.`);
    assert.ok(sense.example?.trim(), `Thiếu ví dụ từ điển offline cho ${sense.term}.`);
    return {
      id: `dict:${item.entryId}:${item.senseId}`,
      dictionaryEntryId: item.entryId,
      dictionarySenseId: item.senseId,
      term: sense.term,
      definition: sense.definition,
      pos: sense.pos,
      subPos: sense.subPos,
      ipa: sense.ipa,
      example: sense.example,
    };
  });
  const lessons = [];
  for (let offset = 0, number = 1; offset < words.length; offset += 20, number += 1) {
    lessons.push({
      id: `vocab-${level.toLocaleLowerCase('en')}-v1-${String(number).padStart(3, '0')}`,
      title: `${level} ${number}`,
      words: words.slice(offset, offset + 20),
    });
  }
  return lessons;
}

function attributionFor(source) {
  const sourceLink = source === 'C1'
    ? `${lexicore.url}/tree/${lexicore.commit}`
    : `${octanove.url}/blob/${octanove.commit}/${octanove.path}`;
  const sourceName = source === 'C1' ? lexicore.name : octanove.name;
  const license = source === 'C1' ? lexicore.license : octanove.license;
  return `Danh sách ${source}: ${sourceName}, ${license}, ${sourceLink}. ` +
    `Nghĩa, IPA và ví dụ: Skypedia / MinhQND, ${dictionary.license}, ` +
    `${dictionary.url}/tree/${dictionary.commit}.`;
}

function renderTypeScript(levels, lookup) {
  const courses = ['C1', 'C2'].map(level => ({
    id: `vocab-${level.toLocaleLowerCase('en')}-v1`,
    level,
    title: `Từ Vựng ${level}`,
    sourceCount: levels[level].sourceCount,
    missingWords: [...levels[level].missingWords, ...levels[level].noExampleWords],
    skippedDuplicateCount: levels[level].skippedDuplicate,
    attribution: attributionFor(level),
    lessons: buildLessons(level, levels[level], lookup),
  }));
  return `import type { BasicCourseLesson } from './basic-course';

export const ADVANCED_COURSES: {
  id: string; level: 'C1' | 'C2'; title: string; sourceCount: number;
  missingWords: string[]; skippedDuplicateCount: number; attribution: string;
  lessons: BasicCourseLesson[];
}[] = ${JSON.stringify(courses)};

export const ADVANCED_COURSE_LESSONS: BasicCourseLesson[] = ADVANCED_COURSES.flatMap(course => course.lessons);
`;
}

function main() {
  const lexicoreRows = parseCsv(downloadVerified(
    lexicorePath, lexicore.csvUrl, lexicore.bytes, lexicore.sha256, lexicore.name,
  ));
  const octanoveRows = parseCsv(downloadVerified(
    octanovePath, octanove.csvUrl, octanove.bytes, octanove.sha256, octanove.name,
  ));
  const dictionaryBytes = fs.readFileSync(dictionaryPath);
  assert.equal(dictionaryBytes.byteLength, dictionary.bytes, 'Kho từ điển có kích thước khác bản đã ghim.');
  assert.equal(sha256(dictionaryBytes), dictionary.sha256, 'Kho từ điển không khớp SHA-256.');
  const c1 = lexicoreRows.filter(row => row.cefr_level === 'C1')
    .sort((a, b) => Number(a.rank_in_level) - Number(b.rank_in_level))
    .map((row, index) => sourceCandidates(row, 'word', 'pos', Number(row.rank_in_level) || index + 1));
  const c2 = octanoveRows.filter(row => row.CEFR === 'C2')
    .map((row, index) => sourceCandidates(row, 'headword', 'pos', index + 1));
  assert.equal(c1.length, 1000, 'LexiCore cần đúng 1.000 mục C1.');
  assert.ok(c2.length > 900, 'Danh sách Octanove C2 cần trên 900 mục.');

  const db = new DatabaseSync(dictionaryPath, { readOnly: true });
  try {
    const { usedSenses, usedMeanings } = seedUsedSets(db);
    const lookup = createLookup(db, [...c1, ...c2].flatMap(word => word.terms));
    const levels = {
      C1: mapLevel('C1', c1, lookup, usedSenses, usedMeanings),
      C2: mapLevel('C2', c2, lookup, usedSenses, usedMeanings),
    };
    for (const level of ['C1', 'C2']) {
      assert.ok(levels[level].words.length > 800, `${level} cần trên 800 mục khớp từ điển offline.`);
    }
    const manifest = {
      sources: { lexicore, octanove },
      dictionary: { ...dictionary },
      levels,
    };
    fs.writeFileSync(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(outputTypeScriptPath, renderTypeScript(levels, lookup));
    for (const level of ['C1', 'C2']) {
      console.log(
        `${level}: ${levels[level].words.length} mục offline; thiếu ${levels[level].missingWords.length}; ` +
        `thiếu ví dụ ${levels[level].noExampleWords.length}; trùng ${levels[level].skippedDuplicate}.`,
      );
    }
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
