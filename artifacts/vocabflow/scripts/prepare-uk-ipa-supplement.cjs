const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { createRequire } = require("node:module");
const fs = require("node:fs/promises");
const { resolve, join } = require("node:path");
const ts = require("typescript");

const EXPECTED_INPUT_SHA256 =
  "8b3ec0853b0d21de4c1e91f84e709a72340041232b5f5d654333f6ea876a81b3";
const EXPECTED_INPUT_ROWS = 104_829;
const EXPECTED_OUTPUT_SHA256 =
  "b3ae7040c0a2c7a479a93cd8be2cb0ae5c8d7dd58f84d54ad4d212d9983c9d9c";
const EXPECTED_OUTPUT_BYTES = 3_023_499;
const EXPECTED_UNIQUE_TERMS = 104_738;
const EXPECTED_OUTPUT_ROWS = 104_743;
const OBJECT_KEY = "vocabflow/uk-ipa-supplement-b3ae7040c0a2c7a4.txt";
const root = resolve(__dirname, "../../..");
const inputPath =
  process.argv.slice(2).find((value) => value !== "--upload") ??
  join(root, "attached_assets/dictionary_en_uk_slim_1794679866437.db");
const outputPath = join(
  root,
  "generated-artifacts/dictionary/dictionary_en_uk_slim.tsv",
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeTerm(term) {
  return term
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function configFromTs(path, dependencies = {}) {
  const source = require("node:fs").readFileSync(path, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  new Function(
    "exports",
    "module",
    "require",
    "process",
    code,
  )(
    mod.exports,
    mod,
    (name) => {
      if (!(name in dependencies)) {
        throw new Error(`Unexpected dependency: ${name}`);
      }
      return dependencies[name];
    },
    process,
  );
  return mod.exports;
}

async function uploadAsset(bytes, inputSha256, outputSha256) {
  const publicPath = (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);
  if (!publicPath) {
    throw new Error("Public App Storage is not configured.");
  }
  const [bucket, ...prefix] = publicPath.replace(/^\/+/, "").split("/");
  const serverRequire = createRequire(
    resolve(root, "artifacts/api-server/package.json"),
  );
  const storageModule = configFromTs(
    resolve(root, "artifacts/api-server/src/lib/dictionary-storage.ts"),
    { "@google-cloud/storage": serverRequire("@google-cloud/storage") },
  );
  const file = storageModule.objectStorageClient
    .bucket(bucket)
    .file([...prefix, OBJECT_KEY].join("/"));
  await file.save(bytes, {
    resumable: false,
    metadata: {
      contentType: "text/plain; charset=utf-8",
      cacheControl: "public, max-age=86400",
      metadata: {
        sha256: outputSha256,
        sourceSha256: inputSha256,
        source:
          "Existing dictionary headwords; UK pronunciation researched with Claude",
        license:
          "The previously credited dictionary includes US IPA only; no separate license is confirmed for the supplemental UK IPA",
        entries: String(EXPECTED_UNIQUE_TERMS),
      },
    },
  });
}

async function main() {
  const inputBytes = await fs.readFile(inputPath);
  const inputSha256 = sha256(inputBytes);
  assert.equal(
    inputSha256,
    EXPECTED_INPUT_SHA256,
    "The SQLite source is not the verified attachment version.",
  );

  const db = new DatabaseSync(inputPath, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA quick_check").get()?.quick_check;
    assert.equal(integrity, "ok", "The source database failed SQLite quick_check.");
    const table = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get("words");
    assert.match(table?.sql ?? "", /word TEXT NOT NULL/i);
    assert.match(table?.sql ?? "", /ipa_uk TEXT NOT NULL/i);
    const rows = db
      .prepare("SELECT word, ipa_uk FROM words ORDER BY id")
      .all();
    assert.equal(rows.length, EXPECTED_INPUT_ROWS);

    const records = new Map();
    for (const row of rows) {
      const term = normalizeTerm(row.word);
      const ipa = row.ipa_uk.trim();
      if (
        !term ||
        !ipa ||
        /[\t\r\n]/.test(term) ||
        /[\t\r\n]/.test(ipa)
      ) {
        throw new Error("The source contains an invalid UK IPA row.");
      }
      const readings = records.get(term) ?? new Set();
      readings.add(ipa);
      records.set(term, readings);
    }

    assert.equal(records.size, EXPECTED_UNIQUE_TERMS);
    const lines = [];
    for (const [term, readings] of records) {
      for (const ipa of readings) lines.push(`${term}\t${ipa}`);
    }
    assert.equal(lines.length, EXPECTED_OUTPUT_ROWS);
    const output = Buffer.from(`${lines.join("\n")}\n`, "utf8");
    const outputSha256 = sha256(output);
    assert.equal(output.length, EXPECTED_OUTPUT_BYTES);
    assert.equal(outputSha256, EXPECTED_OUTPUT_SHA256);

    await fs.mkdir(resolve(outputPath, ".."), { recursive: true });
    await fs.writeFile(outputPath, output);

    if (process.argv.includes("--upload")) {
      await uploadAsset(output, inputSha256, outputSha256);
    }
    console.log(
      JSON.stringify(
        {
          sourceRows: rows.length,
          uniqueTerms: records.size,
          outputRows: lines.length,
          bytes: output.length,
          sha256: outputSha256,
          uploaded: process.argv.includes("--upload"),
        },
        null,
        2,
      ),
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "UK IPA processing failed.");
  process.exitCode = 1;
});
