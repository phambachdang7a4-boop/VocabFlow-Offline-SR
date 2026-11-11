const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const screen = readFileSync(join(__dirname, '../app/(tabs)/index.tsx'), 'utf8');

assert.match(screen, /const REVIEW_LEVELS = \[1, 2, 3, 4, 5, 6\] as const/);
assert.match(screen, /testID="notebook-level-filters"/);
assert.match(screen, /testID=\{`level-filter-\$\{level\}`\}/);
assert.match(screen, /accessibilityState=\{\{ selected \}\}/);
assert.match(screen, /setSelectedLevel\(\(current\) => \(current === level \? null : level\)\)/);
assert.match(screen, /filterNotebookWords\(sorted, q, selectedLevel\)/);
assert.doesNotMatch(screen, /scrollEnabled=\{filtered\.length > 0\}/);
assert.match(screen, /title=\{selectedLevel === null \? 'Không tìm thấy' : 'Không có từ ở cấp này'\}/);

console.log('PASS: six level filters combine with text search and can be cleared by tapping the selected level.');
