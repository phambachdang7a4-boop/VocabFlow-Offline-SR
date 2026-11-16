const assert = require("node:assert/strict");
const { join } = require("node:path");
const { readFileSync } = require("node:fs");
const { loadTs, loadDictionaryDomain } = require("./test-support.cjs");

const domain = loadTs(
  join(__dirname, "../domain/regional-pronunciations.ts"),
);
const {
  buildRegionalIpaSupplement,
  normalizeRegionalIpaTerm,
  parseRegionalIpaSource,
  REGIONAL_IPA_DICTIONARY,
  REGIONAL_IPA_ATTRIBUTION,
} = domain;
const dictionaryDomain = loadDictionaryDomain();

assert.equal(
  REGIONAL_IPA_DICTIONARY.sourceBytes,
  REGIONAL_IPA_DICTIONARY.us.bytes +
    REGIONAL_IPA_DICTIONARY.uk.bytes +
    REGIONAL_IPA_DICTIONARY.ukSupplement.bytes,
);
assert.match(REGIONAL_IPA_DICTIONARY.us.sha256, /^[a-f0-9]{64}$/);
assert.match(REGIONAL_IPA_DICTIONARY.uk.sha256, /^[a-f0-9]{64}$/);
assert.match(REGIONAL_IPA_DICTIONARY.ukSupplement.sha256, /^[a-f0-9]{64}$/);
assert.equal(REGIONAL_IPA_DICTIONARY.us.license, "MIT");
assert.equal(REGIONAL_IPA_DICTIONARY.uk.license, "GPL-3.0");
assert.equal(REGIONAL_IPA_DICTIONARY.ukSupplement.entryCount, 104_738);
assert.match(REGIONAL_IPA_DICTIONARY.ukSupplement.source, /mục từ lấy từ tệp từ điển đã có/);
assert.match(REGIONAL_IPA_DICTIONARY.ukSupplement.source, /Claude/);
assert.match(REGIONAL_IPA_DICTIONARY.ukSupplement.license, /chưa có giấy phép riêng/);
assert.match(REGIONAL_IPA_ATTRIBUTION, /commercial|phân phối/i);
assert.match(REGIONAL_IPA_ATTRIBUTION, /GPL-3\.0/);
assert.match(REGIONAL_IPA_ATTRIBUTION, /MIT/);
assert.match(REGIONAL_IPA_ATTRIBUTION, /không phải giấy phép/i);
assert.match(REGIONAL_IPA_ATTRIBUTION, /chưa có giấy phép riêng/i);

assert.equal(normalizeRegionalIpaTerm("  MOTHER'S   "), "mother's");
const us = parseRegionalIpaSource(
  "mother's\t/ˈmʌðərz/\r\nchild\t/tʃaɪld/\nchild\t/tʃaɪld/\nnot valid\n",
);
const uk = parseRegionalIpaSource(
  "mother's\t/ˈmʌðəz/\nchild\t/tʃaɪld/\nnot-in-dictionary\t/ˌnɑtɪnˈdɪkʃənɛri/\n",
);
assert.deepEqual(us, [
  { term: "mother's", ipa: "/ˈmʌðərz/" },
  { term: "child", ipa: "/tʃaɪld/" },
]);
const verifiedUkExamples = parseRegionalIpaSource(
  "about\t/ɐbˈaʊt/\neither\t/ˈaɪðɐ/\nfamily\t/fˈæmɪli/\nhello\t/həlˈəʊ/\nimportant\t/ɪmpˈɔːtənt/\nlearn\t/lˈɜːn/\npeople\t/pˈiːpəl/\nschedule\t/ʃˈɛdjuːl/\ntomato\t/təmˈɑːtəʊ/\nwater\t/wˈɔːtɐ/\nword\t/wˈɜːd/\n",
);
assert.deepEqual(
  verifiedUkExamples,
  [
    { term: "about", ipa: "/ɐbˈaʊt/" },
    { term: "either", ipa: "/ˈaɪðɐ/" },
    { term: "family", ipa: "/fˈæmɪli/" },
    { term: "hello", ipa: "/həlˈəʊ/" },
    { term: "important", ipa: "/ɪmpˈɔːtənt/" },
    { term: "learn", ipa: "/lˈɜːn/" },
    { term: "people", ipa: "/pˈiːpəl/" },
    { term: "schedule", ipa: "/ʃˈɛdjuːl/" },
    { term: "tomato", ipa: "/təmˈɑːtəʊ/" },
    { term: "water", ipa: "/wˈɔːtɐ/" },
    { term: "word", ipa: "/wˈɜːd/" },
  ],
  "Keep exact British IPA for representative common words parseable.",
);
const supplement = buildRegionalIpaSupplement(
  new Set(["Mother's", "child", "grandmother"]),
  new Set(["mother's|uk"]),
  [
    { region: "us", records: us },
    { region: "uk", records: uk },
  ],
);
assert.deepEqual(
  supplement.map((record) => `${record.term}|${record.region}`),
  ["mother's|us", "child|us", "child|uk"],
  "Only exact dictionary terms missing that regional accent are added.",
);
assert.equal(
  supplement.some((record) => record.term === "not-in-dictionary"),
  false,
);
const layeredUkSupplement = buildRegionalIpaSupplement(
  new Set(["hello", "new word"]),
  new Set(),
  [
    { region: "uk", records: [{ term: "hello", ipa: "/first/" }] },
    {
      region: "uk",
      records: [
        { term: "hello", ipa: "/second/" },
        { term: "new word", ipa: "/njuː wɜːd/" },
      ],
    },
  ],
);
assert.deepEqual(
  layeredUkSupplement,
  [
    { term: "hello", ipa: "/first/", region: "uk" },
    { term: "new word", ipa: "/njuː wɜːd/", region: "uk" },
  ],
  "The supplemental database fills UK gaps without overwriting existing IPA.",
);
const verifiedUkSupplement = buildRegionalIpaSupplement(
  new Set(verifiedUkExamples.map((entry) => entry.term)),
  new Set(),
  [{ region: "uk", records: verifiedUkExamples }],
);
assert.equal(verifiedUkSupplement.length, verifiedUkExamples.length);
assert.ok(
  verifiedUkSupplement.every((record) => record.region === "uk"),
  "Representative source-verified British pronunciations stay marked as UK rows.",
);
assert.equal(
  dictionaryDomain.formatDictionaryPronunciations([
    { ipa: "/ˈwɜːrk/", region: "NAmE" },
    { ipa: "/ˈwɜːk/", region: "BrE" },
  ]),
  "Anh-Mỹ: /ˈwɜːrk/ · Anh-Anh: /ˈwɜːk/",
);
assert.equal(
  dictionaryDomain.formatDictionaryPronunciations([
    { ipa: "/tɛst/", region: "NAmE" },
    { ipa: "/tɛst/", region: "BrE" },
  ]),
  "Anh-Mỹ/Anh-Anh: /tɛst/",
  "A shared single reading is stored once rather than duplicated.",
);
assert.equal(
  dictionaryDomain.formatDictionaryPronunciations([
    { ipa: "/teɪk/", region: null },
  ]),
  "/teɪk/",
);
assert.deepEqual(
  dictionaryDomain.mergeDictionaryPronunciations(
    [{ ipa: "/wɜːrk/", region: "NAmE" }],
    [
      { ipa: "/wɜːrk/", region: "US" },
      { ipa: "/wɜːk/", region: "BrE" },
    ],
  ),
  [
    { ipa: "/wɜːrk/", region: "NAmE" },
    { ipa: "/wɜːk/", region: "BrE" },
  ],
  "Existing regional readings are preserved and equivalent source rows are not duplicated.",
);

const settings = readFileSync(join(__dirname, "../app/settings.tsx"), "utf8");
const dictionary = readFileSync(join(__dirname, "../data/dictionary.ts"), "utf8");
const sources = readFileSync(
  join(__dirname, "../app/dictionary-sources.tsx"),
  "utf8",
);
assert.match(settings, /offline-regional-ipa-download/);
assert.match(settings, /offline-regional-ipa-delete/);
assert.match(settings, /getOfflineRegionalIpaPartsStatus/);
assert.match(settings, /Đã tải và xác minh · chờ đủ phần/);
assert.match(settings, /offline-regional-ipa-\$\{id\}-status/);
assert.match(
  settings,
  /label: "Anh-Anh",\s*sourceIds: \["uk", "ukSupplement"\]/,
  "The single Anh-Anh row downloads both the main and supplemental sources.",
);
assert.doesNotMatch(
  settings,
  /REGIONAL_IPA_DICTIONARY\.ukSupplement\.label/,
  "The supplemental source is not shown as a separate settings row.",
);
assert.match(settings, /handleDownloadRegionalIpaParts\(id, sourceIds\)/);
assert.match(settings, /deleteOfflineRegionalIpa/);
assert.match(dictionary, /getRegionalIpaForTerm/);
assert.match(sources, /sources-regional-ipa/);

async function checkOfflineLookupStates() {
  const loadOfflineData = (database) => loadTs(
    join(__dirname, "../data/offline-regional-pronunciations.ts"),
    {
      "expo-sqlite": {
        openDatabaseAsync: async () => database,
        deleteDatabaseAsync: async () => {},
      },
      "@noble/hashes/sha2.js": { sha256: () => new Uint8Array() },
      "./sqlite-connection": { openDatabaseSafely: (open) => open() },
      "../domain/dictionary": {
        DICTIONARY: { wordCount: 100 },
        pronunciationAccent: dictionaryDomain.pronunciationAccent,
      },
      "../domain/regional-pronunciations": domain,
    },
  );
  const validMetadata = {
    revision: REGIONAL_IPA_DICTIONARY.version,
    us_sha256: REGIONAL_IPA_DICTIONARY.us.sha256,
    uk_sha256: REGIONAL_IPA_DICTIONARY.uk.sha256,
    uk_supplement_sha256: REGIONAL_IPA_DICTIONARY.ukSupplement.sha256,
    entry_count: 1,
  };
  const database = ({
    hasTable = true,
    metadata = validMetadata,
    rows = [],
    failQuery = false,
  } = {}) => ({
    getFirstAsync: async (sql) => {
      if (sql.includes("sqlite_master")) {
        return hasTable ? { name: "vocabflow_regional_ipa_meta" } : null;
      }
      return metadata;
    },
    getAllAsync: async (sql, term) => {
      assert.match(sql, /CASE region WHEN 'us' THEN 'NAmE' ELSE 'BrE' END/);
      assert.equal(term, "water");
      if (failQuery) throw new Error("simulated local query failure");
      return rows;
    },
    execAsync: async () => {},
  });
  const found = loadOfflineData(database({
    rows: [{ ipa: "/wˈɔːtɐ/", region: "BrE" }],
  }));
  assert.deepEqual(await found.getRegionalIpaLookupForTerm(" Water "), {
    state: "found",
    pronunciations: [{ ipa: "/wˈɔːtɐ/", region: "BrE" }],
  });

  const absent = loadOfflineData(database({ hasTable: false }));
  assert.deepEqual(await absent.getRegionalIpaLookupForTerm("water"), {
    state: "not-installed",
  });
  const missingTerm = loadOfflineData(database());
  assert.deepEqual(await missingTerm.getRegionalIpaLookupForTerm("water"), {
    state: "not-found",
  });
  const damaged = loadOfflineData(database({
    metadata: { ...validMetadata, revision: "old-revision" },
  }));
  assert.deepEqual(await damaged.getRegionalIpaLookupForTerm("water"), {
    state: "damaged",
  });
  const failed = loadOfflineData(database({ failQuery: true }));
  assert.deepEqual(await failed.getRegionalIpaLookupForTerm("water"), {
    state: "failed",
  });
  const unavailable = loadOfflineData({
    getFirstAsync: async () => { throw new Error("simulated database open failure"); },
  });
  assert.deepEqual(await unavailable.getRegionalIpaLookupForTerm("water"), {
    state: "failed",
  });
}

checkOfflineLookupStates().then(() => {
  console.log("PASS: pinned British source rows, exact regional labels, distinct offline lookup states, and attribution.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
