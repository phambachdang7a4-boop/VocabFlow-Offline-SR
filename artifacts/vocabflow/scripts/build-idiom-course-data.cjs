const { createHash } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const DATABASE_PATH = join(
  __dirname,
  "../../../generated-artifacts/dictionary/dictionary_en_vi.db",
);
const DICTIONARY_DOMAIN_PATH = join(
  __dirname,
  "../domain/dictionary.ts",
);
const OUTPUT_PATH = join(
  __dirname,
  "../domain/idiom-course-data.json",
);

function normalizeTerm(term) {
  return term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function containsExactHeadword(term, example) {
  const pattern = term
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, "iu")
    .test(example);
}

function entryScore(row) {
  const definition = String(row.definition ?? "").trim();
  const example = String(row.example ?? "").trim();
  return (
    (definition ? 10 : 0) +
    (example ? 3 : 0) +
    (containsExactHeadword(row.term, example) ? 100 : 0) +
    Math.min(example.length, 240) / 1000
  );
}

function main() {
  if (!existsSync(DATABASE_PATH)) {
    throw new Error(
      `Không tìm thấy từ điển nguồn tại ${DATABASE_PATH}. Hãy chuẩn bị dữ liệu từ điển trước.`,
    );
  }
  const source = readFileSync(DICTIONARY_DOMAIN_PATH, "utf8");
  const expectedHash = source.match(/sha256:\s*'([a-f0-9]{64})'/i)?.[1];
  if (!expectedHash) throw new Error("Không đọc được mã kiểm tra từ điển đã ghim.");
  const actualHash = createHash("sha256").update(readFileSync(DATABASE_PATH)).digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(
      "Tệp từ điển không khớp phiên bản đã ghim; dừng tạo khóa học để tránh lấy sai dữ liệu.",
    );
  }

  const db = new DatabaseSync(DATABASE_PATH, { readOnly: true });
  try {
    const rows = db.prepare(`
      SELECT w.word AS term, d.definition, wd.example
      FROM words w
      JOIN word_definitions wd ON wd.word_id = w.id
      JOIN definitions d ON d.id = wd.definition_id
      WHERE w.lang_code = 'en'
        AND d.definition_lang = 'vi'
        AND LOWER(TRIM(COALESCE(d.pos, ''))) IN ('idiom', 'idioms')
        AND TRIM(w.word) <> ''
        AND TRIM(COALESCE(d.definition, '')) <> ''
      ORDER BY w.word COLLATE NOCASE, wd.id
    `).all();

    const unique = new Map();
    for (const row of rows) {
      const term = String(row.term ?? "").trim().replace(/\s+/g, " ");
      const definition = String(row.definition ?? "").trim();
      const example = String(row.example ?? "").trim();
      const key = normalizeTerm(term);
      if (!key || !definition) continue;
      const candidate = { term, definition, example };
      const previous = unique.get(key);
      if (!previous || entryScore(candidate) > entryScore(previous))
        unique.set(key, candidate);
    }
    const entries = Object.fromEntries(
      [...unique.values()]
        .sort((left, right) =>
          left.term.localeCompare(right.term, "en", { sensitivity: "base" }) ||
          left.term.localeCompare(right.term, "en"),
        )
        .map((entry) => [entry.term, {
          definition: entry.definition,
          example: entry.example,
        }]),
    );
    if (!Object.keys(entries).length)
      throw new Error("Từ điển không có mục idiom hợp lệ để tạo khóa học.");

    const output = {
      generatedFrom: "dictionary_en_vi.db",
      sourceSha256: actualHash,
      sourceRows: rows.length,
      uniqueTerms: Object.keys(entries).length,
      entries,
    };
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");
    const exactExamples = Object.entries(entries)
      .filter(([term, entry]) => containsExactHeadword(term, entry.example))
      .length;
    console.log(
      `Built Idioms course: ${output.uniqueTerms} unique idioms from ${rows.length} dictionary rows; ${exactExamples} examples contain the exact headword.`,
    );
  } finally {
    db.close();
  }
}

if (require.main === module) main();

module.exports = { containsExactHeadword, normalizeTerm };
