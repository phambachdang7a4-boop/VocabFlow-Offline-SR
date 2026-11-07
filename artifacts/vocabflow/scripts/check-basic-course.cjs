const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../data/basic-course.ts'), 'utf8');
const start = source.indexOf('const rawLessons');
const end = source.indexOf('\n];', start);
assert.notEqual(start, -1, 'Không tìm thấy danh sách bài học.');
assert.notEqual(end, -1, 'Danh sách bài học chưa kết thúc.');

const lessonSource = source.slice(start, end);
const lessons = [...lessonSource.matchAll(/id: '([^']+)'[\s\S]*?title: '([^']+)'[\s\S]*?entries: `([\s\S]*?)`/g)]
  .map(([, id, title, entries]) => ({
    id,
    title,
    words: entries.trim().split('\n').filter(Boolean).map((row, index) => {
      const divider = row.indexOf('|');
      assert.ok(divider > 0, `${id}, dòng ${index + 1}: thiếu dấu |.`);
      const term = row.slice(0, divider).trim();
      const meaning = row.slice(divider + 1).trim();
      assert.ok(term && meaning, `${id}, dòng ${index + 1}: thiếu từ hoặc nghĩa.`);
      return { term, meaning };
    }),
  }));

assert.equal(lessons.length, 25, `Cần 25 bài, hiện có ${lessons.length}.`);
assert.equal(new Set(lessons.map(({ id }) => id)).size, lessons.length, 'ID bài học bị trùng.');
assert.equal(new Set(lessons.map(({ title }) => title)).size, lessons.length, 'Tên bài học bị trùng.');

const total = lessons.reduce((sum, lesson) => sum + lesson.words.length, 0);
assert.equal(total, 1000, `Cần đúng 1.000 mục từ-nghĩa, hiện có ${total}.`);
assert.ok(new Set(lessons.map(({ words }) => words.length)).size > 1, 'Số từ các bài cần được linh hoạt.');

const senses = lessons.flatMap(({ id, words }) => words.map(({ term, meaning }) => ({
  lessonId: id,
  key: `${term.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')}|${meaning.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')}`,
})));
assert.equal(new Set(senses.map(({ key }) => key)).size, total, 'Có cặp từ-nghĩa trùng lặp.');

console.log(`OK: ${lessons.length} bài, ${total} mục từ-nghĩa, ${new Set(lessons.map(({ words }) => words.length)).size} kích cỡ bài, không trùng cặp từ-nghĩa.`);
