const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const { getLessonIconName } = loadTs(join(__dirname, '../data/lesson-icon.ts'));

const representativeMappings = [
  ['Gia đình 2', 'users'],
  ['Nhà cửa 1', 'home'],
  ['Số đếm 2', 'hash'],
  ['Thời gian 1', 'clock'],
  ['Đồ ăn 1', 'coffee'],
  ['Nấu ăn 2', 'coffee'],
  ['Quần áo 1', 'shopping-bag'],
  ['Màu sắc', 'droplet'],
  ['Sức khỏe 1', 'heart'],
  ['Trường học 1', 'book-open'],
  ['Công việc 2', 'briefcase'],
  ['Du lịch 1', 'map'],
  ['Thành phố 1', 'map-pin'],
  ['Mua sắm 2', 'shopping-cart'],
  ['Thời tiết 1', 'cloud'],
  ['Động vật 2', 'feather'],
  ['Sinh hoạt hằng ngày 1', 'sun'],
  ['Công nghệ 2', 'smartphone'],
  ['Cảm xúc 1', 'smile'],
  ['Động từ 2 1', 'play-circle'],
  ['Tính từ 2', 'type'],
  ['Phương hướng 1', 'compass'],
  ['Đồ vật 2', 'box'],
  ['Từ nối 1', 'link'],
  ['Lesson 4', 'book-open', 'B1'],
  ['Lesson 7', 'bookmark', 'B2'],
  ['Lesson 3', 'award', 'C1'],
  ['Lesson 2', 'star', 'C2'],
  ['Phrasal collocations', 'link', 'English Collocations'],
];

for (const [title, expected, courseTitle = ''] of representativeMappings) {
  assert.equal(getLessonIconName(title, courseTitle), expected, `Unexpected icon for "${title}"`);
}

const screen = readFileSync(join(__dirname, '../app/course-list/[courseId].tsx'), 'utf8');
const badge = screen.match(/<View style=\{\[styles\.lessonBadge[\s\S]*?<\/View>/)?.[0];
assert.ok(badge, 'Lesson badge should remain present.');
assert.match(badge, /complete[\s\S]*?name="check"/, 'Completed lesson badges retain the check icon.');
assert.match(
  badge,
  /getLessonIconName\(lesson\.title, course\.title\)/,
  'Incomplete lesson badges render the deterministic thematic icon.',
);
assert.doesNotMatch(badge, /lessonNumberText|index\s*\+\s*1/, 'Incomplete lesson badges must not show lesson numbers.');
assert.match(screen, /accessibilityLabel={`Bài \$\{index \+ 1\}:/, 'Lesson accessibility labels retain their numbering.');
assert.match(screen, /router\.push\(`\/course\/\$\{lesson\.id\}` as never\)/, 'Lesson navigation remains unchanged.');

console.log('PASS: thematic lesson-icon mappings and incomplete/completed badge rendering.');
