const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const wordScreen = readFileSync(join(__dirname, '../app/word.tsx'), 'utf8');
const notebookScreen = readFileSync(join(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
const frozenScreen = readFileSync(join(__dirname, '../app/frozen.tsx'), 'utf8');

assert.match(wordScreen, /title: existing \? 'Chi tiết từ' : 'Từ mới'/);
assert.match(wordScreen, /testID="word-readonly-details"/);
assert.match(wordScreen, /if \(existing \|\| busyRef\.current\) return;/,
  'An existing word cannot be submitted through the create form.');
assert.doesNotMatch(wordScreen, /Sửa từ|Chỉnh lại trang này|field-note|Ghi chú riêng|existing\.note|Lưu thay đổi/);
assert.doesNotMatch(wordScreen, /saveWord\(form,\s*existing\?\.id\)/);
assert.match(wordScreen, /note: ''/,
  'New words keep the storage field empty without exposing a notes control.');
assert.doesNotMatch(notebookScreen, /w\.note/,
  'Hidden legacy notes do not influence notebook search.');
assert.match(frozenScreen, /Đã đóng băng · Xem từ/);
assert.doesNotMatch(frozenScreen, /Xem hoặc sửa từ/);

console.log('PASS: saved words are read-only; creation and freeze/delete actions remain; note field is not exposed.');
