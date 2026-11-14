const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const wordScreen = readFileSync(join(__dirname, '../app/word.tsx'), 'utf8');
const notebookScreen = readFileSync(join(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
const frozenScreen = readFileSync(join(__dirname, '../app/frozen.tsx'), 'utf8');
const savedWordMetadata = loadTs(join(__dirname, '../domain/saved-word-metadata.ts'));

assert.match(wordScreen, /title: existing \? 'Chi tiết từ' : 'Từ mới'/);
assert.match(wordScreen, /testID="word-info-card"/,
  'Opening a saved word shows its details inside one blue card.');
assert.match(wordScreen, /backgroundColor: c\.vocabCard/);
assert.match(wordScreen, /testID="word-info-ipa-us"/);
assert.match(wordScreen, /testID="word-info-ipa-uk"/);
assert.match(wordScreen, /testID="word-info-speak"/);
assert.match(wordScreen, /testID="word-info-meaning"/);
assert.match(wordScreen, /testID="word-info-example"/);
assert.match(wordScreen, /testID="word-info-example-translation"/);
assert.match(wordScreen, /testID="word-info-part-of-speech"/);
assert.match(wordScreen, /getSavedWordPartOfSpeech\(word\.note\)/);
assert.match(wordScreen, /\{partOfSpeech \? \(/,
  'A part-of-speech label is rendered only when a value is available.');
assert.equal(
  savedWordMetadata.getSavedWordPartOfSpeech('Từ loại: Cụm danh từ'),
  'Cụm danh từ',
);
assert.equal(savedWordMetadata.getSavedWordPartOfSpeech('Từ loại:   '), null);
assert.equal(savedWordMetadata.getSavedWordPartOfSpeech('Ghi chú cũ'), null);
assert.equal(
  savedWordMetadata.getSavedWordPartOfSpeech('Ghi chú cũ: Từ loại: không liên quan'),
  null,
  'Legacy notes that merely mention the label are not exposed as part of speech.',
);
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

console.log('PASS: saved words show only a nonempty course part-of-speech label; creation and freeze/delete actions remain; other notes stay hidden.');
