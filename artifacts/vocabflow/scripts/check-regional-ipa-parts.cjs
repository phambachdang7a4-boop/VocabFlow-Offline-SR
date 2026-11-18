const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { loadTs } = require("./test-support.cjs");

const domain = loadTs(join(__dirname, "../domain/regional-pronunciations.ts"));
const { REGIONAL_IPA_DICTIONARY } = domain;
const sources = [
  ["us", REGIONAL_IPA_DICTIONARY.us],
  ["uk", REGIONAL_IPA_DICTIONARY.uk],
  ["ukSupplement", REGIONAL_IPA_DICTIONARY.ukSupplement],
];
const hashBytesBySize = new Map(
  sources.map(([, source]) => [
    source.bytes,
    Uint8Array.from(
      source.sha256.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)),
    ),
  ]),
);
const scratchDir = mkdtempSync(join(tmpdir(), "vocabflow-ipa-parts-"));
const databasePath = join(scratchDir, "regional-ipa.db");
let failUkOnce = true;
function createRuntime() {
  let native;
  const publicDataAssetUrls = loadTs(
    join(__dirname, "../domain/public-data-asset-url.ts"),
    { "react-native": { Platform: { OS: "android" } } },
    { process: { env: {} } },
  );
  const runtime = loadTs(
    join(__dirname, "../data/offline-regional-pronunciations.ts"),
    {
      "expo-sqlite": {
        openDatabaseAsync: async () => {
          native = new DatabaseSync(databasePath);
          return {
            execAsync: async (sql) => native.exec(sql),
            getFirstAsync: async (sql, ...params) =>
              native.prepare(sql).get(...params),
            getAllAsync: async (sql, ...params) =>
              native.prepare(sql).all(...params),
            runAsync: async (sql, ...params) =>
              native.prepare(sql).run(...params),
            closeAsync: async () => native.close(),
            withTransactionAsync: async (callback) => {
              native.exec("BEGIN");
              try {
                await callback();
                native.exec("COMMIT");
              } catch (error) {
                native.exec("ROLLBACK");
                throw error;
              }
            },
          };
        },
        deleteDatabaseAsync: async () => {},
      },
      "@noble/hashes/sha2.js": {
        sha256: (bytes) =>
          hashBytesBySize.get(bytes.byteLength) ??
          Uint8Array.from(createHash("sha256").update(bytes).digest()),
      },
      "./sqlite-connection": { openDatabaseSafely: (open) => open() },
      "../domain/dictionary": {
        DICTIONARY: { wordCount: 100 },
        pronunciationAccent: () => null,
      },
      "../domain/regional-pronunciations": domain,
      "../domain/public-data-asset-url": publicDataAssetUrls,
    },
    { process: { env: { EXPO_PUBLIC_DOMAIN: "vocabflow.test" } } },
  );
  return { ...runtime, closeDatabase: () => native?.close() };
}
let runtime = createRuntime();
global.fetch = async (url) => {
  const isUk = String(url).includes("en_UK.txt");
  if (isUk && failUkOnce) {
    failUkOnce = false;
    return { ok: false, status: 503 };
  }
  const urlText = String(url);
  const source = sources.find(([, entry]) => urlText.includes(entry.file))?.[1]
    ?? (urlText.includes("/api/dictionary/ipa-uk")
      ? REGIONAL_IPA_DICTIONARY.ukSupplement
      : undefined);
  assert.ok(source, `unexpected IPA URL: ${url}`);
  const bytes = new Uint8Array(source.bytes).fill(0x78);
  let offset = 0;
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer,
    body: {
      getReader: () => ({
        read: async () => {
          if (offset >= bytes.byteLength) return { done: true };
          const end = Math.min(offset + 128 * 1024, bytes.byteLength);
          const value = bytes.subarray(offset, end);
          offset = end;
          return { done: false, value };
        },
      }),
    },
  };
};

async function run() {
  const dictionary = { getAllAsync: async () => [] };
  const progress = [];
  assert.deepEqual(
    await runtime.downloadOfflineRegionalIpaPart(
      dictionary,
      "us",
      (stage, bytesWritten, totalBytes) =>
        progress.push({ stage, bytesWritten, totalBytes }),
    ),
    { complete: false },
  );
  assert.ok(progress.some((item) => item.bytesWritten > 0 && item.bytesWritten < item.totalBytes));
  assert.equal(progress.at(-1).bytesWritten, REGIONAL_IPA_DICTIONARY.us.bytes);
  await assert.rejects(
    runtime.downloadOfflineRegionalIpaPart(dictionary, "uk"),
    /HTTP 503/,
  );
  assert.deepEqual(await runtime.getOfflineRegionalIpaPartsStatus(), {
    us: "verified",
    uk: "missing",
    ukSupplement: "missing",
  });

  // A process restart drops module state and opens the same on-disk SQLite file.
  runtime.closeDatabase();
  runtime = createRuntime();
  assert.deepEqual(
    await runtime.getOfflineRegionalIpaPartsStatus(),
    { us: "verified", uk: "missing", ukSupplement: "missing" },
    "A verified IPA part remains visible after closing and reopening the app.",
  );

  assert.deepEqual(
    await runtime.downloadOfflineRegionalIpaPart(dictionary, "uk"),
    { complete: false },
  );
  await assert.rejects(
    runtime.downloadOfflineRegionalIpaPart(dictionary, "ukSupplement"),
    /Từ điển chưa sẵn sàng/,
  );
  assert.deepEqual(await runtime.getOfflineRegionalIpaPartsStatus(), {
    us: "verified",
    uk: "verified",
    ukSupplement: "verified",
  });
  assert.equal(
    (await runtime.getOfflineRegionalIpaStatus()).state,
    "missing",
    "IPA must not be reported as installed when final dictionary assembly fails.",
  );
  console.log(
    "Verified IPA parts survive a failed source download and app restart, retry independently, and remain unpublished until assembly succeeds.",
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      runtime.closeDatabase();
    } catch {
      // The test may already have closed the connection to simulate a restart.
    }
    rmSync(scratchDir, { recursive: true, force: true });
  });
