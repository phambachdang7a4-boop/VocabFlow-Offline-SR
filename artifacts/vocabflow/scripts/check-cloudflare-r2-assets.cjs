const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { loadTs, loadLocalDictionaryAdditions } = require("./test-support.cjs");

const domainRoot = join(__dirname, "../domain");
const fallbackUrls = loadTs(
  join(domainRoot, "public-data-asset-url.ts"),
  { "react-native": { Platform: { OS: "android" } } },
  { process: { env: {} } },
);
const cloudflareUrls = loadTs(
  join(domainRoot, "public-data-asset-url.ts"),
  { "react-native": { Platform: { OS: "android" } } },
  {
    process: {
      env: {
        EXPO_PUBLIC_CLOUDFLARE_R2_PUBLIC_BASE_URL:
          "https://pub-test.r2.dev/",
      },
    },
  },
);
const webUrls = loadTs(
  join(domainRoot, "public-data-asset-url.ts"),
  { "react-native": { Platform: { OS: "web" } } },
  {
    process: {
      env: {
        EXPO_PUBLIC_CLOUDFLARE_R2_PUBLIC_BASE_URL:
          "https://pub-test.r2.dev",
      },
    },
  },
);
assert.equal(
  fallbackUrls.publicDataAssetUrl("vocabflow/file.db", "https://api.test/file"),
  "https://api.test/file",
  "Use the existing source until R2 packages have been verified and enabled.",
);
assert.equal(
  cloudflareUrls.publicDataAssetUrl(
    "/vocabflow/file with spaces.db",
    "https://api.test/file",
  ),
  "https://pub-test.r2.dev/vocabflow/file%20with%20spaces.db",
  "Resolve public object keys against the configured R2 base URL.",
);
assert.equal(
  webUrls.publicDataAssetUrl(
    "vocabflow/file.db",
    "https://api.test/file",
  ),
  "https://pub-test.r2.dev/vocabflow/file.db",
  "Use R2 in browsers once its CORS policy is confirmed.",
);
const webFallbackUrls = loadTs(
  join(domainRoot, "public-data-asset-url.ts"),
  { "react-native": { Platform: { OS: "web" } } },
  { process: { env: {} } },
);
assert.equal(
  webFallbackUrls.publicDataAssetUrl("vocabflow/file.db", "https://api.test/file"),
  "https://api.test/file",
  "Retain the existing fallback when the public R2 URL is not configured.",
);

const dictionary = loadTs(join(domainRoot, "dictionary.ts"), {
  "./dictionary-local-additions": loadLocalDictionaryAdditions(),
});
const dictionaryDownload = loadTs(
  join(domainRoot, "dictionary-download.ts"),
  {
    "./dictionary": dictionary,
    "./public-data-asset-url": cloudflareUrls,
  },
);
assert.equal(
  dictionaryDownload.dictionaryDownloadUrl(),
  "https://pub-test.r2.dev/vocabflow/dictionary-2b65bea9577c2a41.db",
);

const audio = loadTs(join(domainRoot, "offline-audio.ts"));
const courses = loadTs(join(domainRoot, "course-data-package.ts"));
const regionalIpa = loadTs(
  join(domainRoot, "regional-pronunciations.ts"),
);
assert.equal(
  audio.OFFLINE_AUDIO_DICTIONARY.objectKey,
  "vocabflow/audio-dictionary-b3821cbbe15ee0e4.db",
);
assert.equal(
  courses.OFFLINE_COURSE_DATA.objectKey,
  "vocabflow/course-data-v1-8cb5bc7796b11a6d.json",
);
assert.equal(
  regionalIpa.REGIONAL_IPA_DICTIONARY.ukSupplement.objectKey,
  "vocabflow/uk-ipa-supplement-b3ae7040c0a2c7a4.txt",
);

const workspaceRoot = resolve(__dirname, "../../..");
const migration = readFileSync(
  join(workspaceRoot, "artifacts/api-server/scripts/migrate-public-assets-to-r2.mjs"),
  "utf8",
);
for (const key of [
  dictionary.DICTIONARY.objectKey,
  audio.OFFLINE_AUDIO_DICTIONARY.objectKey,
  courses.OFFLINE_COURSE_DATA.objectKey,
  regionalIpa.REGIONAL_IPA_DICTIONARY.ukSupplement.objectKey,
]) {
  assert.ok(migration.includes(key), `R2 migration must include ${key}.`);
}
assert.match(migration, /Content-Range/u);
assert.match(migration, /actualSha256 !== asset\.sha256/u);
assert.match(migration, /App Storage remains unchanged/u);
assert.match(migration, /AllowedOrigins: \["\*"\]/u);
assert.match(migration, /"course-data-version": "1"/u);
assert.match(migration, /X-Amz-Meta-Course-Data-Version/u);

for (const relativePath of [
  "../data/offline-audio.ts",
  "../data/offline-course-data.ts",
  "../data/offline-regional-pronunciations.ts",
]) {
  assert.match(
    readFileSync(join(__dirname, relativePath), "utf8"),
    /publicDataAssetUrl/u,
    `${relativePath} must support direct R2 URLs.`,
  );
}

console.log("Cloudflare R2 asset routing and migration checks passed.");
