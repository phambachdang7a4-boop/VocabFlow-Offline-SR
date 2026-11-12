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
  REGIONAL_IPA_DICTIONARY.us.bytes + REGIONAL_IPA_DICTIONARY.uk.bytes,
);
assert.match(REGIONAL_IPA_DICTIONARY.us.sha256, /^[a-f0-9]{64}$/);
assert.match(REGIONAL_IPA_DICTIONARY.uk.sha256, /^[a-f0-9]{64}$/);
assert.equal(REGIONAL_IPA_DICTIONARY.us.license, "MIT");
assert.equal(REGIONAL_IPA_DICTIONARY.uk.license, "GPL-3.0");
assert.match(REGIONAL_IPA_ATTRIBUTION, /commercial|phân phối/i);
assert.match(REGIONAL_IPA_ATTRIBUTION, /GPL-3\.0/);
assert.match(REGIONAL_IPA_ATTRIBUTION, /MIT/);

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
assert.match(settings, /deleteOfflineRegionalIpa/);
assert.match(dictionary, /getRegionalIpaForTerm/);
assert.match(sources, /sources-regional-ipa/);
console.log("PASS: pinned commercial-use IPA sources, exact-match import, offline controls, and attribution.");
