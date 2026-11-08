const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { resolve, join } = require('node:path');

const appRoot = resolve(__dirname, '..');
const dataDir = join(appRoot, 'data');
const cacheDir = resolve(appRoot, '../../generated-artifacts/cefr');
const sourcePath = join(cacheDir, 'LexiCore_5000.csv');
const manifestPath = join(dataDir, 'cefr-course-manifest.json');
const outputPath = join(dataDir, 'cefr-courses.ts');
const basicManifestPath = join(dataDir, 'basic-course-manifest.json');
const dictionaryPath = resolve(appRoot, '../../generated-artifacts/dictionary/dictionary_en_vi.db');
const lexicore = {
  commit: '47460d26346380cc2bfcd399699cad6c391d8412',
  url: 'https://github.com/X-Trivle/LexiCore',
  csvUrl: 'https://raw.githubusercontent.com/X-Trivle/LexiCore/47460d26346380cc2bfcd399699cad6c391d8412/data/LexiCore_5000.csv',
  sha256: '49ae7a92ef5a9301286a6607f2f2e1e4b8a0f381784ad65996c36af187854de4',
  bytes: 303824,
};
const dictionary = {
  commit: '388adc0826300912e5b0311c089e0e70494b065f',
  sha256: '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a',
  bytes: 44212224,
};

function normalize(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function downloadSource() {
  fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(sourcePath)) {
    execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', lexicore.csvUrl, '-o', sourcePath]);
  }
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(bytes.byteLength, lexicore.bytes, 'LexiCore CSV có kích thước khác bản đã ghim.');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), lexicore.sha256, 'LexiCore CSV không khớp SHA-256.');
  return bytes.toString('utf8').replace(/^\uFEFF/, '');
}

function parseRows(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line, index) => {
    const values = line.split(',');
    assert.equal(values.length, headers.length, `CSV LexiCore dòng ${index + 2} không hợp lệ.`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function posGroup(value) {
  const pos = String(value ?? '').toLocaleLowerCase('en').replace(/[^a-z]/g, '');
  if (pos === 'n' || pos === 'noun') return 'noun';
  if (pos === 'v' || pos === 'verb') return 'verb';
  if (pos === 'a' || pos === 'adj' || pos === 'adjective') return 'adjective';
  if (pos === 'd' || pos === 'adv' || pos === 'adverb') return 'adverb';
  return 'other';
}

function dictionaryPos(value) {
  const pos = String(value ?? '').toLocaleLowerCase('en').replace(/[^a-z]/g, '');
  if (pos === 'n' || pos === 'noun') return 'noun';
  if (pos === 'v' || pos === 'verb') return 'verb';
  if (pos === 'a' || pos === 'adj' || pos === 'adjective') return 'adjective';
  if (pos === 'd' || pos === 'adv' || pos === 'adverb') return 'adverb';
  return 'other';
}

function loadDictionary(db) {
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
  return word => candidates.all(word);
}

function getBasicSenseKeys(lookup) {
  const manifest = JSON.parse(fs.readFileSync(basicManifestPath, 'utf8'));
  const senses = new Set();
  const meanings = new Set();
  for (const lesson of manifest.lessons) {
    for (const word of lesson.words) {
      senses.add(`${word.entryId}:${word.senseId}`);
      const source = lookup(word.term).find(item => item.entryId === word.entryId && item.senseId === word.senseId);
      assert.ok(source, `Không tìm thấy nghĩa khóa cơ bản ${word.term}.`);
      meanings.add(`${normalize(source.term)}|${normalize(source.definition)}`);
    }
  }
  return { senses, meanings };
}

function createManifest(rows, lookup) {
  const basic = getBasicSenseKeys(lookup);
  const usedSenseKeys = new Set(basic.senses);
  const usedMeaningKeys = new Set(basic.meanings);
  const levels = {};

  for (const level of ['B1', 'B2']) {
    const sourceWords = rows.filter(row => row.cefr_level === level)
      .sort((a, b) => Number(a.rank_in_level) - Number(b.rank_in_level));
    assert.equal(sourceWords.length, 1000, `LexiCore cần đúng 1.000 mục ${level}.`);
    const words = [];
    const missing = [];
    const skippedDuplicateWords = [];
    let skippedDuplicate = 0;

    for (const sourceWord of sourceWords) {
      const candidates = lookup(sourceWord.word);
      if (!candidates.length) {
        missing.push(sourceWord.word);
        continue;
      }

      const expectedPos = posGroup(sourceWord.pos);
      const samePos = expectedPos === 'other'
        ? candidates
        : candidates.filter(item => dictionaryPos(item.pos) === expectedPos);
      const ordered = [...samePos, ...candidates.filter(item => !samePos.includes(item))];
      const selected = ordered.find(item => {
        const senseKey = `${item.entryId}:${item.senseId}`;
        const meaningKey = `${normalize(item.term)}|${normalize(item.definition)}`;
        return !usedSenseKeys.has(senseKey) && !usedMeaningKeys.has(meaningKey);
      });
      if (!selected) {
        skippedDuplicate += 1;
        skippedDuplicateWords.push(sourceWord.word);
        continue;
      }

      const senseKey = `${selected.entryId}:${selected.senseId}`;
      const meaningKey = `${normalize(selected.term)}|${normalize(selected.definition)}`;
      usedSenseKeys.add(senseKey);
      usedMeaningKeys.add(meaningKey);
      words.push({
        rank: Number(sourceWord.rank_in_level),
        sourceWord: sourceWord.word,
        sourcePos: sourceWord.pos,
        entryId: selected.entryId,
        senseId: selected.senseId,
        term: selected.term,
      });
    }
    levels[level] = { sourceCount: sourceWords.length, missing, skippedDuplicate, skippedDuplicateWords, words };
  }

  return {
    source: {
      name: 'LexiCore-5000',
      url: lexicore.url,
      commit: lexicore.commit,
      license: 'CC BY 4.0',
      csvSha256: lexicore.sha256,
    },
    dictionary: { commit: dictionary.commit, sha256: dictionary.sha256 },
    levels,
  };
}

function buildLessons(level, levelManifest, lookup) {
  const words = levelManifest.words.map(item => {
    const sense = lookup(item.sourceWord).find(candidate =>
      candidate.entryId === item.entryId && candidate.senseId === item.senseId);
    assert.ok(sense, `Không còn nghĩa từ điển ${item.entryId}/${item.senseId}.`);
    assert.equal(normalize(sense.term), normalize(item.term), `Đầu mục từ điển đã đổi: ${item.term}.`);
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

function renderTypeScript(manifest, db) {
  const lookup = loadDictionary(db);
  const catalog = {};
  for (const level of ['B1', 'B2']) {
    catalog[level] = {
      sourceCount: manifest.levels[level].sourceCount,
      missingWords: manifest.levels[level].missing,
      skippedDuplicateCount: manifest.levels[level].skippedDuplicate,
      lessons: buildLessons(level, manifest.levels[level], lookup),
    };
  }
  const attribution =
    `Danh sách cấp độ: LexiCore-5000, X-Trivle, CC BY 4.0, ${lexicore.url}/tree/${lexicore.commit}; ` +
    `tham chiếu CEFR-J v1.5 của Tono Lab / TUFS, https://www.cefr-j.org/download.html. ` +
    `Nghĩa: Skypedia / MinhQND, CC BY-SA 4.0, https://github.com/skypediacode/english-vietnamese-dictionary/tree/${dictionary.commit}.`;
  return `import type { BasicCourseLesson } from './basic-course';

export const CEFR_COURSE_ATTRIBUTION = ${JSON.stringify(attribution)};
export const CEFR_COURSES: {
  id: string; level: 'B1' | 'B2'; title: string; sourceCount: number;
  missingWords: string[]; skippedDuplicateCount: number; attribution: string;
  lessons: BasicCourseLesson[];
}[] = ${JSON.stringify([
    {
      id: 'vocab-b1-v1',
      level: 'B1',
      title: 'Từ Vựng B1',
      ...catalog.B1,
      attribution,
    },
    {
      id: 'vocab-b2-v1',
      level: 'B2',
      title: 'Từ Vựng B2',
      ...catalog.B2,
      attribution,
    },
  ])};

export const CEFR_COURSE_LESSONS: BasicCourseLesson[] = CEFR_COURSES.flatMap(course => course.lessons);
`;
}

function main() {
  const csv = downloadSource();
  const rows = parseRows(csv);
  assert.equal(rows.length, 5000, 'LexiCore CSV cần đúng 5.000 mục.');
  const dictionaryBytes = fs.readFileSync(dictionaryPath);
  assert.equal(dictionaryBytes.byteLength, dictionary.bytes, 'Kho từ điển có kích thước khác bản đã ghim.');
  assert.equal(createHash('sha256').update(dictionaryBytes).digest('hex'), dictionary.sha256, 'Kho từ điển không khớp SHA-256.');
  const db = new DatabaseSync(dictionaryPath, { readOnly: true });
  try {
    const lookup = loadDictionary(db);
    const manifest = process.argv.includes('--rebuild-manifest') || !fs.existsSync(manifestPath)
      ? createManifest(rows, lookup)
      : JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.source.commit, lexicore.commit);
    assert.equal(manifest.dictionary.commit, dictionary.commit);
    for (const level of ['B1', 'B2']) {
      assert.equal(manifest.levels[level].sourceCount, 1000);
      assert.ok(manifest.levels[level].words.length > 900, `${level} cần trên 900 mục tra được.`);
    }
    if (process.argv.includes('--rebuild-manifest') || !fs.existsSync(manifestPath)) {
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    fs.writeFileSync(outputPath, renderTypeScript(manifest, db));
    for (const level of ['B1', 'B2']) {
      const count = manifest.levels[level].words.length;
      console.log(`${level}: ${count} mục offline; thiếu ${manifest.levels[level].missing.length}; trùng đã bỏ ${manifest.levels[level].skippedDuplicate}.`);
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
