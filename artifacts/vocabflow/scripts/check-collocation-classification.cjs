const assert = require('node:assert/strict');
const {
  classifySupplementalTerm,
  mapCollocations,
  validateSupplementalRows,
} = require('./generate-collocation-course.cjs');

const componentPos = new Map([
  ['look', new Set(['verb'])],
  ['after', new Set(['other'])],
  ['make', new Set(['verb'])],
  ['decision', new Set(['noun'])],
  ['heavy', new Set(['adjective'])],
  ['rain', new Set(['noun'])],
]);

assert.deepEqual(
  classifySupplementalTerm('look after', new Set(['v']), componentPos),
  { type: 'VERB+ADP', sourcePos: 'verb' },
  'Cụm động từ + giới từ phải được phân loại theo cấu trúc.',
);
assert.deepEqual(
  classifySupplementalTerm('make decision', new Set(['v']), componentPos),
  { type: 'VERB+NOUN', sourcePos: 'verb' },
  'Cụm động từ + danh từ phải được phân loại theo POS của thành phần.',
);
assert.deepEqual(
  classifySupplementalTerm('heavy rain', new Set(['n']), componentPos),
  { type: 'ADJ+NOUN', sourcePos: 'noun' },
  'Cụm tính từ + danh từ phải được phân loại theo POS của thành phần.',
);

assert.equal(
  classifySupplementalTerm('make decision', new Set(['n']), componentPos),
  null,
  'Không được nhận cụm động từ + danh từ khi WordNet không xác nhận POS động từ.',
);
assert.equal(
  classifySupplementalTerm('heavy rain today', new Set(['n']), componentPos),
  null,
  'Không được nhận cụm có ít hoặc nhiều hơn đúng hai từ.',
);

const mismatched = mapCollocations(
  [{ lang: 'en', type: 'VERB+ADP', bigram: 'look after' }],
  () => [{
    entryId: 101,
    senseId: 202,
    term: 'look after',
    definition: 'trông nom',
    pos: 'noun',
    example: 'She looks after her brother.',
  }],
  new Set(),
  new Set(),
  'oewn-2025',
  true,
);
assert.deepEqual(mismatched.mismatchedPosWords, ['look after'],
  'Cụm có POS SQLite lệch với loại nguồn phải được ghi nhận là không khớp.');
assert.deepEqual(mismatched.words, []);

assert.throws(
  () => validateSupplementalRows([
    { bigram: 'look after' },
    { bigram: ' LOOK   AFTER ' },
  ]),
  /Cụm nguồn bổ sung bị trùng/,
  'Cụm trùng sau chuẩn hóa phải bị phát hiện.',
);
assert.throws(
  () => validateSupplementalRows([{ bigram: 'look after today' }]),
  /phải có đúng hai từ/,
  'Cụm không đúng hai từ phải bị phát hiện.',
);
validateSupplementalRows([
  { bigram: 'look after' },
  { bigram: 'make decision' },
  { bigram: 'heavy rain' },
]);

console.log('PASS: Phân loại cụm cố định, POS lệch, cụm trùng và cụm không đủ hai từ.');
