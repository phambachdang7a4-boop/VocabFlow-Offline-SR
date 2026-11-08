const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { resolve, join } = require('node:path');

const appRoot = resolve(__dirname, '..');
const dataDir = join(appRoot, 'data');
const cacheDir = resolve(appRoot, '../../generated-artifacts/collocations');
const sourcePath = join(cacheDir, 'opensubs-en.jsonl');
const wordnetPath = join(cacheDir, 'english-wordnet-2025-json.zip');
const dictionaryPath = resolve(appRoot, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const basicManifestPath = join(dataDir, 'basic-course-manifest.json');
const cefrManifestPath = join(dataDir, 'cefr-course-manifest.json');
const advancedManifestPath = join(dataDir, 'advanced-course-manifest.json');
const outputManifestPath = join(dataDir, 'collocation-course-manifest.json');
const outputTypeScriptPath = join(dataDir, 'collocation-courses.ts');

const source = {
  name: 'OpenSubtitles Collocations',
  url: 'https://huggingface.co/datasets/vladvlasov256/opensubs-collocations',
  commit: 'd051fefa5b85c9ffe6882eace8a1abe5543ee730',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  originalCorpus: 'OpenSubtitles v2018',
  file: 'data/en.jsonl',
  fileUrl: 'https://huggingface.co/datasets/vladvlasov256/opensubs-collocations/resolve/d051fefa5b85c9ffe6882eace8a1abe5543ee730/data/en.jsonl',
  bytes: 1781069,
  sha256: '0dd34e1644cbf84808a2566e445653ce0428f16b437b7515ecb518b65459ed6c',
};
const supplementalSource = {
  name: 'Open English WordNet',
  version: '2025 Edition',
  url: 'https://github.com/globalwordnet/english-wordnet',
  releaseUrl: 'https://github.com/globalwordnet/english-wordnet/releases/tag/2025-edition',
  file: 'english-wordnet-2025-json.zip',
  fileUrl: 'https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025-json.zip',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  upstreamLicense: 'WordNet 3.1 License',
  upstreamLicenseUrl: 'https://github.com/globalwordnet/english-wordnet/blob/2025-edition/WNDB_License.txt',
  bytes: 9986555,
  sha256: '7d749f6e2c39e6970e4997839dcf6e42fd281f3c2fae0171d2192bae8cfa4b51',
};
const supplementalOrdering = {
  name: 'OpenSubtitles component-frequency proxy',
  sourceName: source.name,
  sourceCommit: source.commit,
  sourceFile: source.file,
  sourceSha256: source.sha256,
  metric: 'minimum of the summed source bigram counts for the two components',
  direction: 'descending',
  tieBreak: 'bigram ascending (English locale), then type ascending',
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

function downloadVerified() {
  fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(sourcePath)) {
    execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', source.fileUrl, '-o', sourcePath]);
  }
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(bytes.byteLength, source.bytes, 'Tệp collocation có kích thước khác bản đã ghim.');
  assert.equal(sha256(bytes), source.sha256, 'Tệp collocation không khớp SHA-256.');
  return bytes.toString('utf8').trim().split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`Tệp collocation có JSONL không hợp lệ tại dòng ${index + 1}.`);
    }
  });
}

function downloadVerifiedWordNet() {
  fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(wordnetPath)) {
    execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', supplementalSource.fileUrl, '-o', wordnetPath]);
  }
  const bytes = fs.readFileSync(wordnetPath);
  assert.equal(bytes.byteLength, supplementalSource.bytes, 'Tệp Open English WordNet có kích thước khác bản đã ghim.');
  assert.equal(sha256(bytes), supplementalSource.sha256, 'Tệp Open English WordNet không khớp SHA-256.');
  return wordnetPath;
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
  const advanced = JSON.parse(fs.readFileSync(advancedManifestPath, 'utf8'));
  for (const level of Object.values(advanced.levels)) {
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
  db.exec('CREATE TEMP TABLE collocation_source_terms (term TEXT PRIMARY KEY COLLATE NOCASE);');
  const insert = db.prepare('INSERT OR IGNORE INTO collocation_source_terms(term) VALUES (?)');
  for (const term of terms) insert.run(term);
  const rows = db.prepare(`
    SELECT w.id AS entryId, w.word AS term, wd.id AS senseId,
      d.definition, d.pos, d.sub_pos AS subPos, wd.example,
      COALESCE((SELECT ipa FROM pronunciations WHERE word_id = w.id ORDER BY id LIMIT 1), '') AS ipa
    FROM collocation_source_terms s
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

const particlesAndPrepositions = new Set(
  'about above across after against along around away back before behind below beneath beside between beyond by down for forth forward from in inside into off on onto out outside over past round through to together toward towards under underneath up upon with within without'.split(' '),
);

function isComponentPos(componentPos, term, expected) {
  return componentPos.get(normalize(term))?.has(expected) ?? false;
}

function createComponentFrequency(sourceRows) {
  const frequencies = new Map();
  for (const row of sourceRows) {
    const count = Number(row.count);
    if (!Number.isFinite(count) || count < 0) {
      throw new Error(`Tần suất không hợp lệ trong nguồn: ${row.bigram}.`);
    }
    for (const component of new Set(normalize(row.bigram).split(' '))) {
      frequencies.set(component, (frequencies.get(component) ?? 0) + count);
    }
  }
  return frequencies;
}

function createSupplementalRows(db, wordnetPath, excludedTerms = new Set(), frequencyRows) {
  assert.ok(Array.isArray(frequencyRows) && frequencyRows.length > 0,
    'Cần danh sách collocation OpenSubtitles đã xác minh để xếp hạng cụm WordNet.');
  const fileNames = execFileSync('unzip', ['-Z1', wordnetPath], { encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(name => /^entries-[a-z0-9]+\.json$/.test(name));
  assert.ok(fileNames.length > 0, 'Không tìm thấy danh sách mục trong Open English WordNet.');

  const lexicalPosByTerm = new Map();
  for (const fileName of fileNames) {
    const json = execFileSync('unzip', ['-p', wordnetPath, fileName], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const entries = JSON.parse(json);
    for (const [term, partsOfSpeech] of Object.entries(entries)) {
      if (!/^[a-z]+ [a-z]+$/i.test(term)) continue;
      const key = normalize(term);
      if (excludedTerms.has(key)) continue;
      if (!lexicalPosByTerm.has(key)) lexicalPosByTerm.set(key, new Set());
      for (const pos of Object.keys(partsOfSpeech)) lexicalPosByTerm.get(key).add(pos);
    }
  }

  const componentPos = new Map();
  const componentFrequency = createComponentFrequency(frequencyRows);
  const componentRows = db.prepare(`
    SELECT w.word AS term, d.pos
    FROM words w
    JOIN word_definitions wd ON wd.word_id = w.id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE d.definition_lang = 'vi'
  `).all();
  for (const row of componentRows) {
    const term = normalize(row.term);
    if (!componentPos.has(term)) componentPos.set(term, new Set());
    componentPos.get(term).add(posGroup(row.pos));
  }

  const rows = [];
  for (const [term, lexicalPos] of lexicalPosByTerm) {
    const [first, second] = term.split(' ');
    let type;
    let sourcePos;
    if (lexicalPos.has('v')) {
      if (particlesAndPrepositions.has(second)) {
        type = 'VERB+ADP';
        sourcePos = 'verb';
      } else if (
        isComponentPos(componentPos, first, 'verb') &&
        isComponentPos(componentPos, second, 'noun')
      ) {
        type = 'VERB+NOUN';
        sourcePos = 'verb';
      }
    }
    if (
      !type &&
      lexicalPos.has('n') &&
      isComponentPos(componentPos, first, 'adjective') &&
      isComponentPos(componentPos, second, 'noun')
    ) {
      type = 'ADJ+NOUN';
      sourcePos = 'noun';
    }
    if (!type) continue;
    rows.push({
      bigram: term,
      type,
      sourcePos,
      lang: 'en',
      count: null,
      npmi: null,
      score: null,
      popularityScore: Math.min(
        componentFrequency.get(normalize(first)) ?? 0,
        componentFrequency.get(normalize(second)) ?? 0,
      ),
    });
  }

  rows.sort((left, right) =>
    right.popularityScore - left.popularityScore ||
    left.bigram.localeCompare(right.bigram, 'en') ||
    left.type.localeCompare(right.type));
  return rows;
}

function expectedPos(type) {
  if (type === 'VERB+ADP' || type === 'VERB+NOUN') return 'verb';
  if (type === 'ADJ+NOUN') return 'noun';
  return 'other';
}

function mapCollocations(rows, lookup, usedSenses, usedMeanings, sourceId, strictPos = false) {
  const words = [];
  const missingWords = [];
  const skippedDuplicateWords = [];
  const noExampleWords = [];
  const mismatchedPosWords = [];
  for (const [index, row] of rows.entries()) {
    assert.equal(row.lang, 'en', `Sai ngôn ngữ ở collocation ${row.bigram}.`);
    assert.ok(['VERB+ADP', 'VERB+NOUN', 'ADJ+NOUN'].includes(row.type), `Loại collocation không hỗ trợ: ${row.type}.`);
    const candidates = lookup(row.bigram);
    if (!candidates.length) {
      missingWords.push(row.bigram);
      continue;
    }
    const preferredPos = expectedPos(row.type);
    const samePos = preferredPos === 'other'
      ? candidates
      : candidates.filter(candidate => posGroup(candidate.pos) === preferredPos);
    const matchingPos = strictPos
      ? candidates.filter(candidate =>
        candidate.pos?.toLocaleLowerCase('en') === 'idiom' || posGroup(candidate.pos) === preferredPos)
      : samePos;
    if (strictPos && matchingPos.length === 0) {
      mismatchedPosWords.push(row.bigram);
      continue;
    }
    const ordered = [...samePos, ...candidates.filter(candidate => !samePos.includes(candidate))];
    const posOrdered = strictPos ? matchingPos : ordered;
    const withExamples = posOrdered.filter(candidate => candidate.example?.trim());
    if (!withExamples.length) {
      noExampleWords.push(row.bigram);
      continue;
    }
    const selected = withExamples.find(candidate => {
      const senseKey = `${candidate.entryId}:${candidate.senseId}`;
      const meaningKey = `${normalize(candidate.term)}|${normalize(candidate.definition)}`;
      return !usedSenses.has(senseKey) && !usedMeanings.has(meaningKey);
    });
    if (!selected) {
      skippedDuplicateWords.push(row.bigram);
      continue;
    }
    usedSenses.add(`${selected.entryId}:${selected.senseId}`);
    usedMeanings.add(`${normalize(selected.term)}|${normalize(selected.definition)}`);
    words.push({
      rank: index + 1,
      sourceId,
      sourceRank: index + 1,
      bigram: row.bigram,
      type: row.type,
      count: row.count,
      npmi: row.npmi,
      score: row.score,
      ...(row.popularityScore === undefined ? {} : { popularityScore: row.popularityScore }),
      entryId: selected.entryId,
      senseId: selected.senseId,
      term: selected.term,
    });
  }
  return { sourceCount: rows.length, missingWords, noExampleWords, mismatchedPosWords, skippedDuplicateWords, words };
}

function attribution() {
  return `${source.name}, ${source.originalCorpus}, ${source.license}, ` +
    `${source.url}/tree/${source.commit}. Nghĩa, IPA và ví dụ: Skypedia / MinhQND, ` +
    `${dictionary.license}, ${dictionary.url}/tree/${dictionary.commit}. ` +
    `${supplementalSource.name} ${supplementalSource.version}, ${supplementalSource.license}, ` +
    `${supplementalSource.releaseUrl}; based on WordNet 3.1, Copyright 2011 Princeton University, ` +
    `${supplementalSource.upstreamLicenseUrl}. Supplemental phrase ordering uses the pinned ` +
    `${supplementalOrdering.sourceName} component-frequency proxy (${supplementalOrdering.sourceCommit}).`;
}

function buildLessons(manifest, lookup) {
  const words = manifest.words.map(item => {
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
      collocationType: item.type,
      pos: sense.pos,
      subPos: sense.subPos,
      ipa: sense.ipa,
      example: sense.example,
    };
  });
  const lessons = [];
  for (let offset = 0, number = 1; offset < words.length; offset += 20, number += 1) {
    lessons.push({
      id: `collocation-1-v1-${String(number).padStart(3, '0')}`,
      title: `Collocation 1 ${number}`,
      words: words.slice(offset, offset + 20),
    });
  }
  return lessons;
}

function renderTypeScript(manifest, lookup) {
  const course = {
    id: 'collocation-1-v1',
    title: 'Collocation 1',
    sourceCount: manifest.sourceCount + manifest.supplementalSourceCount,
    missingWords: [...manifest.missingWords, ...manifest.noExampleWords, ...manifest.mismatchedPosWords],
    skippedDuplicateCount: manifest.skippedDuplicateWords.length + manifest.supplementalSkippedDuplicateCount,
    attribution: attribution(),
    lessons: buildLessons(manifest, lookup),
  };
  return `import type { BasicCourseLesson } from './basic-course';

export const COLLOCATION_COURSES: {
  id: string; title: string; sourceCount: number;
  missingWords: string[]; skippedDuplicateCount: number; attribution: string;
  lessons: BasicCourseLesson[];
}[] = ${JSON.stringify([course])};

export const COLLOCATION_COURSE_LESSONS: BasicCourseLesson[] = COLLOCATION_COURSES.flatMap(course => course.lessons);
`;
}

function main() {
  const rows = downloadVerified();
  assert.equal(rows.length, 15000, 'Nguồn cần đúng 15.000 collocation tiếng Anh.');
  const verifiedWordNetPath = downloadVerifiedWordNet();
  const dictionaryBytes = fs.readFileSync(dictionaryPath);
  assert.equal(dictionaryBytes.byteLength, dictionary.bytes, 'Kho từ điển có kích thước khác bản đã ghim.');
  assert.equal(sha256(dictionaryBytes), dictionary.sha256, 'Kho từ điển không khớp SHA-256.');
  const db = new DatabaseSync(dictionaryPath, { readOnly: true });
  try {
    const { usedSenses, usedMeanings } = seedUsedSets(db);
    const supplementalRows = createSupplementalRows(
      db,
      verifiedWordNetPath,
      new Set(rows.map(row => normalize(row.bigram))),
      rows,
    );
    const lookup = createLookup(db, [...rows, ...supplementalRows].map(row => row.bigram));
    const primary = mapCollocations(rows, lookup, usedSenses, usedMeanings, 'opensubs');
    const supplemental = mapCollocations(
      supplementalRows,
      lookup,
      usedSenses,
      usedMeanings,
      'oewn-2025',
      true,
    );
    const words = [...primary.words, ...supplemental.words].map((word, index) => ({
      ...word,
      rank: index + 1,
    }));
    assert.ok(words.length > primary.words.length, 'Open English WordNet không thêm được mục khớp từ điển offline.');
    const manifest = {
      source: { ...source },
      supplementalSource: { ...supplementalSource },
      supplementalOrdering: { ...supplementalOrdering },
      dictionary: { ...dictionary },
      sourceCount: primary.sourceCount,
      missingWords: primary.missingWords,
      noExampleWords: primary.noExampleWords,
      mismatchedPosWords: primary.mismatchedPosWords,
      skippedDuplicateWords: primary.skippedDuplicateWords,
      supplementalSourceCount: supplemental.sourceCount,
      supplementalMissingCount: supplemental.missingWords.length,
      supplementalNoExampleCount: supplemental.noExampleWords.length,
      supplementalMismatchedPosCount: supplemental.mismatchedPosWords.length,
      supplementalSkippedDuplicateCount: supplemental.skippedDuplicateWords.length,
      words,
    };
    fs.writeFileSync(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(outputTypeScriptPath, renderTypeScript(manifest, lookup));
    console.log(
      `Collocation 1: ${words.length} mục offline ` +
      `(${primary.words.length} OpenSubtitles + ${supplemental.words.length} Open English WordNet); ` +
      `cụm nguồn bổ sung ${supplemental.sourceCount}, khớp mới ${supplemental.words.length}.`,
    );
  } finally {
    db.close();
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { createSupplementalRows, supplementalSource, supplementalOrdering };
