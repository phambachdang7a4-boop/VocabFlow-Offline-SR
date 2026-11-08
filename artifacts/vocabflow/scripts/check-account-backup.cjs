const assert = require('node:assert/strict');
const { join } = require('node:path');
const { loadTs } = require('./test-support.cjs');

const {
  ACCOUNT_BACKUP_FORMAT,
  ACCOUNT_BACKUP_VERSION,
  MAX_ACCOUNT_BACKUP_BYTES,
  parseAccountBackup,
  serializeAccountBackup,
  summarizeAccountBackup,
} = loadTs(join(__dirname, '../data/account-backup.ts'));

const payload = {
  revision: 0,
  words: [
    {
      syncId: 'manual:go:di',
      term: 'go',
      meaning: 'Đi',
      ipa: '/ɡəʊ/',
      example: 'We go to school.',
      note: '',
      dictionaryEntryId: null,
      dictionarySenseId: null,
      createdAt: '2026-11-01T10:00:00.000Z',
      contentUpdatedAt: '2026-11-01T10:00:00.000Z',
      reviewCount: 2,
      level: 2,
      learnedOn: '2026-11-01',
      nextReviewOn: '2026-11-09',
      completed: false,
      lastReviewedOn: '2026-11-08',
      frozen: false,
      progressUpdatedAt: '2026-11-08T10:00:00.000Z',
    },
  ],
  deletedWords: [{ syncId: 'manual:old:word', deletedAt: '2026-11-07T12:00:00.000Z' }],
  courseProgress: [
    {
      lessonId: 'basic-lesson-1',
      currentIndex: 3,
      stage: 'answer',
      completedAt: null,
      updatedAt: '2026-11-08T10:00:00.000Z',
    },
  ],
  courseSelections: [
    {
      lessonId: 'basic-lesson-1',
      wordId: 'dict:1:2',
      selected: true,
      updatedAt: '2026-11-08T10:00:00.000Z',
    },
  ],
  reviewStats: [
    {
      deviceId: 'device-test',
      day: '2026-11-08',
      reviewedCount: 4,
      correctCount: 3,
      sessionCount: 2,
      updatedAt: '2026-11-08T10:00:00.000Z',
    },
  ],
};

const serialized = serializeAccountBackup(payload);
const restored = parseAccountBackup(serialized);
assert.equal(restored.format, ACCOUNT_BACKUP_FORMAT);
assert.equal(restored.version, ACCOUNT_BACKUP_VERSION);
assert.deepEqual(restored.payload, payload, 'All learning data round-trips without account credentials.');
assert.equal(Object.hasOwn(restored, 'userId'), false);
const olderBackup = JSON.parse(serialized);
delete olderBackup.payload.reviewStats[0].sessionCount;
assert.equal(parseAccountBackup(JSON.stringify(olderBackup)).payload.reviewStats[0].sessionCount, 0, 'Backups without session history start at zero instead of fabricating data.');

const preview = summarizeAccountBackup({
  ...restored,
  payload: {
    ...restored.payload,
    words: [
      ...restored.payload.words,
      { ...restored.payload.words[0], syncId: "manual:frozen:word", frozen: true },
    ],
    courseSelections: [
      ...restored.payload.courseSelections,
      {
        ...restored.payload.courseSelections[0],
        wordId: "dict:3:4",
      },
    ],
    reviewStats: [
      ...restored.payload.reviewStats,
      {
        ...restored.payload.reviewStats[0],
        deviceId: "another-device",
      },
      {
        ...restored.payload.reviewStats[0],
        day: "2026-11-07",
      },
    ],
  },
});
assert.deepEqual(preview, {
  personalWordCount: 2,
  frozenWordCount: 1,
  courseRecordCount: 3,
  reviewStatDayCount: 2,
});

assert.throws(() => parseAccountBackup("not JSON"), /JSON/);
assert.throws(
  () =>
    parseAccountBackup(
      JSON.stringify({
        format: ACCOUNT_BACKUP_FORMAT,
        version: ACCOUNT_BACKUP_VERSION + 1,
        exportedAt: '2026-11-08T10:00:00.000Z',
        payload,
      }),
    ),
  /không phải gói sao lưu/,
);
assert.throws(() => parseAccountBackup('x'.repeat(MAX_ACCOUNT_BACKUP_BYTES + 1)), /4 MiB/);
assert.throws(() => parseAccountBackup('ế'.repeat(Math.ceil(MAX_ACCOUNT_BACKUP_BYTES / 2))), /4 MiB/, 'Multibyte Vietnamese text is measured by its UTF-8 size.');
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      words: [{ ...payload.words[0], level: 7 }],
    }),
  /không hợp lệ/,
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      words: Array.from({ length: 1024 }, (_, index) => ({
        ...payload.words[0],
        syncId: `manual:large-${index}`,
        note: 'é'.repeat(2000),
      })),
    }),
  /4 MiB/,
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      revision: -1,
    }),
  /sai cấu trúc/,
);
assert.throws(
  () =>
    serializeAccountBackup({
      ...payload,
      deletedWords: [
        {
          syncId: payload.words[0].syncId,
          deletedAt: '2026-11-08T10:00:00.000Z',
        },
      ],
    }),
  /mâu thuẫn/,
);

console.log('PASS: versioned backup round-trip, supported-version and size checks, record validation, and conflicting data rejection.');
