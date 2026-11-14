export const REGIONAL_IPA_DICTIONARY = {
  commit: "972cd67dd5f96bc5660e28070cde26e3928abcd7",
  repository: "https://github.com/open-dict-data/ipa-dict",
  filename: "vocabflow-regional-ipa.db",
  sourceBytes: 7_887_890,
  version: "ipa-dict-2026-11-12-v2-uk-supplement-b3ae7040",
  us: {
    accent: "us",
    label: "Anh-Mỹ",
    file: "data/en_US.txt",
    bytes: 3_180_267,
    sha256: "2af6f154a5c363275f052d1f85acedef38ed185ca9745aa4314be77f6b70de67",
    license: "MIT",
  },
  uk: {
    accent: "uk",
    label: "Anh-Anh",
    file: "data/en_UK.txt",
    bytes: 1_684_124,
    sha256: "221394caef0cf723b4f2df81a98ac33191293257b88aed5b1fb89466d3a0dc77",
    license: "GPL-3.0",
  },
  ukSupplement: {
    accent: "uk",
    label: "Anh-Anh bổ sung",
    file: "dictionary_en_uk_slim.tsv",
    endpoint: "/api/dictionary/ipa-uk",
    bytes: 3_023_499,
    sha256: "b3ae7040c0a2c7a479a93cd8be2cb0ae5c8d7dd58f84d54ad4d212d9983c9d9c",
    entryCount: 104_738,
    source:
      "Các mục từ lấy từ tệp từ điển đã có; phiên âm UK được tra cứu bổ sung bằng Claude.",
    license:
      "Bản từ điển được ghi công trước đó chỉ có IPA Mỹ; chưa có giấy phép riêng được xác nhận cho IPA UK bổ sung.",
  },
} as const;

export type RegionalIpaAccent = "us" | "uk";
export type RegionalIpaSource =
  | (typeof REGIONAL_IPA_DICTIONARY)["us"]
  | (typeof REGIONAL_IPA_DICTIONARY)["uk"]
  | (typeof REGIONAL_IPA_DICTIONARY)["ukSupplement"];
export interface RegionalIpaSourceEntry {
  term: string;
  ipa: string;
}
export interface RegionalIpaRecord extends RegionalIpaSourceEntry {
  region: RegionalIpaAccent;
}

export function normalizeRegionalIpaTerm(term: string): string {
  return term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

/** Parse the pinned IPA-Dict text format and retain alternate readings verbatim. */
export function parseRegionalIpaSource(text: string): RegionalIpaSourceEntry[] {
  const entries = new Map<string, RegionalIpaSourceEntry>();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const separator = line.indexOf("\t");
    if (separator <= 0) continue;
    const term = line.slice(0, separator).trim();
    const ipa = line.slice(separator + 1).trim();
    const key = normalizeRegionalIpaTerm(term);
    if (!key || !ipa) continue;
    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, { term, ipa });
      continue;
    }
    const alternatives = new Set(existing.ipa.split(" · "));
    if (!alternatives.has(ipa)) {
      entries.set(key, { term: existing.term, ipa: [...alternatives, ipa].join(" · ") });
    }
  }
  return [...entries.values()];
}

export function buildRegionalIpaSupplement(
  dictionaryTerms: ReadonlySet<string>,
  existingAccents: ReadonlySet<string>,
  sources: {
    region: RegionalIpaAccent;
    records: RegionalIpaSourceEntry[];
  }[],
): RegionalIpaRecord[] {
  const normalizedDictionary = new Set(
    [...dictionaryTerms].map(normalizeRegionalIpaTerm),
  );
  const added = new Set<string>();
  const result: RegionalIpaRecord[] = [];
  for (const source of sources) {
    for (const record of source.records) {
      const term = normalizeRegionalIpaTerm(record.term);
      const key = `${term}|${source.region}`;
      if (
        !normalizedDictionary.has(term) ||
        existingAccents.has(key) ||
        added.has(key)
      ) {
        continue;
      }
      added.add(key);
      result.push({ ...record, term, region: source.region });
    }
  }
  return result;
}

export const REGIONAL_IPA_ATTRIBUTION = [
  "IPA Anh-Mỹ lấy từ open-dict-data/ipa-dict, tệp en_US.txt, phiên bản commit 972cd67dd5f96bc5660e28070cde26e3928abcd7. Dữ liệu dựa trên modified cmudict-ipa; giấy phép MIT, bản quyền Lingliang Zhang.",
  "IPA Anh-Anh lấy từ open-dict-data/ipa-dict, tệp en_UK.txt, cùng phiên bản commit. Dữ liệu dựa trên ipacards và được phân phối theo GPL-3.0; giữ nguyên điều kiện của giấy phép khi phân phối.",
  "IPA Anh-Anh bổ sung dùng các mục từ từ tệp từ điển đã có; phiên âm UK được tra cứu bằng Claude vì bản từ điển được ghi công trước đó chỉ có IPA Mỹ. Đây là mô tả quy trình, không phải giấy phép; chưa có giấy phép riêng được xác nhận cho dữ liệu IPA UK bổ sung.",
  "Nguồn: https://github.com/open-dict-data/ipa-dict/tree/972cd67dd5f96bc5660e28070cde26e3928abcd7",
  "Giấy phép MIT: https://opensource.org/license/mit",
  "Giấy phép GPL-3.0: https://www.gnu.org/licenses/gpl-3.0.html",
  "Dữ liệu IPA được cài thành kho SQLite riêng trên thiết bị. Cơ sở dữ liệu từ điển gốc không bị thay đổi; chỉ các mục khớp chính xác với từ điển được thêm vào kho IPA.",
].join("\n\n");
