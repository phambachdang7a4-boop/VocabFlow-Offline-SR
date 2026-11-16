import {
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { sha256 } from "@noble/hashes/sha2.js";
import { openDatabaseSafely } from "./sqlite-connection";
import { DICTIONARY, pronunciationAccent } from "../domain/dictionary";
import {
  buildRegionalIpaSupplement,
  normalizeRegionalIpaTerm,
  parseRegionalIpaSource,
  REGIONAL_IPA_DICTIONARY,
  type RegionalIpaAccent,
  type RegionalIpaRecord,
  type RegionalIpaSource,
} from "../domain/regional-pronunciations";

const filename = REGIONAL_IPA_DICTIONARY.filename;
const metadataTable = "vocabflow_regional_ipa_meta";
const dataTable = "vocabflow_regional_ipa";
const sourceCacheTable = "vocabflow_regional_ipa_sources";
let databaseConnection: Promise<SQLiteDatabase> | undefined;
let activeDownload: AbortController | null = null;
let installedRevision: boolean | undefined;

export type RegionalIpaSourceId = "us" | "uk" | "ukSupplement";

const regionalSources: {
  id: RegionalIpaSourceId;
  source: RegionalIpaSource;
}[] = [
  { id: "us", source: REGIONAL_IPA_DICTIONARY.us },
  { id: "uk", source: REGIONAL_IPA_DICTIONARY.uk },
  { id: "ukSupplement", source: REGIONAL_IPA_DICTIONARY.ukSupplement },
];

function sha256Hex(bytes: Uint8Array): string {
  return Array.from(sha256(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function sourceUrl(source: RegionalIpaSource): string {
  if ("endpoint" in source) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
    if (!domain) throw new Error("Không xác định được máy chủ tải IPA.");
    return new URL(source.endpoint, `https://${domain}`).toString();
  }
  return `https://raw.githubusercontent.com/open-dict-data/ipa-dict/${REGIONAL_IPA_DICTIONARY.commit}/${source.file}`;
}

function openSupplementDatabase(): Promise<SQLiteDatabase> {
  if (!databaseConnection) {
    databaseConnection = openDatabaseSafely(() =>
      openDatabaseAsync(filename),
    ).catch((error) => {
      databaseConnection = undefined;
      throw error;
    });
  }
  return databaseConnection;
}

async function hasCurrentRevision(db: SQLiteDatabase): Promise<boolean> {
  try {
    const metadata = await db.getFirstAsync<{
      revision: string;
      us_sha256: string;
      uk_sha256: string;
      uk_supplement_sha256: string;
      entry_count: number;
    }>(
      `SELECT revision, us_sha256, uk_sha256, uk_supplement_sha256, entry_count
       FROM ${metadataTable} LIMIT 1`,
    );
    return (
      metadata?.revision === REGIONAL_IPA_DICTIONARY.version &&
      metadata.us_sha256 === REGIONAL_IPA_DICTIONARY.us.sha256 &&
      metadata.uk_sha256 === REGIONAL_IPA_DICTIONARY.uk.sha256 &&
      metadata.uk_supplement_sha256 ===
        REGIONAL_IPA_DICTIONARY.ukSupplement.sha256 &&
      metadata.entry_count > 0
    );
  } catch {
    return false;
  }
}

async function fetchSource(
  source: RegionalIpaSource,
  signal: AbortSignal,
  onByteProgress?: (bytesRead: number) => void,
): Promise<string> {
  const response = await fetch(sourceUrl(source), {
    credentials: "omit",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Không tải được IPA ${source.label} (HTTP ${response.status}). Hãy thử lại.`,
    );
  }
  let bytes: Uint8Array;
  const reader = response.body?.getReader();
  if (reader) {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
        onByteProgress?.(total);
      }
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
    onByteProgress?.(bytes.byteLength);
  }
  if (bytes.byteLength !== source.bytes) {
    throw new Error(
      `Tệp IPA ${source.label} chưa tải đủ. Hãy thử lại khi có mạng ổn định.`,
    );
  }
  if (sha256Hex(bytes) !== source.sha256) {
    throw new Error(
      `Tệp IPA ${source.label} không đúng phiên bản đã kiểm tra. Hãy thử lại.`,
    );
  }
  return new TextDecoder().decode(bytes);
}

async function ensureSourceCacheTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${sourceCacheTable} (
      source_id TEXT PRIMARY KEY,
      revision TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      byte_count INTEGER NOT NULL,
      contents TEXT NOT NULL
    );
  `);
}

async function getVerifiedCachedSource(
  db: SQLiteDatabase,
  id: RegionalIpaSourceId,
  source: RegionalIpaSource,
): Promise<string | null> {
  const table = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    sourceCacheTable,
  );
  if (!table) return null;
  const row = await db.getFirstAsync<{
    revision: string;
    sha256: string;
    byte_count: number;
    contents: string;
  }>(
    `SELECT revision, sha256, byte_count, contents
     FROM ${sourceCacheTable} WHERE source_id = ?`,
    id,
  );
  if (!row) return null;
  const bytes = new TextEncoder().encode(row.contents);
  if (
    row.revision !== REGIONAL_IPA_DICTIONARY.version ||
    row.sha256 !== source.sha256 ||
    row.byte_count !== source.bytes ||
    bytes.byteLength !== source.bytes ||
    sha256Hex(bytes) !== source.sha256
  ) {
    return null;
  }
  return row.contents;
}

async function cacheVerifiedSource(
  db: SQLiteDatabase,
  id: RegionalIpaSourceId,
  source: RegionalIpaSource,
  contents: string,
): Promise<void> {
  await ensureSourceCacheTable(db);
  await db.runAsync(
    `INSERT INTO ${sourceCacheTable}
       (source_id, revision, sha256, byte_count, contents)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(source_id) DO UPDATE SET
       revision = excluded.revision,
       sha256 = excluded.sha256,
       byte_count = excluded.byte_count,
       contents = excluded.contents`,
    id,
    REGIONAL_IPA_DICTIONARY.version,
    source.sha256,
    source.bytes,
    contents,
  );
}

async function getOrDownloadSource(
  db: SQLiteDatabase,
  id: RegionalIpaSourceId,
  source: RegionalIpaSource,
  signal: AbortSignal,
  onProgress?: (stage: string, bytesWritten: number) => void,
  bytesBefore = 0,
): Promise<{
  region: RegionalIpaAccent;
  records: RegionalIpaRecord[];
  text: string;
}> {
  const cached = await getVerifiedCachedSource(db, id, source);
  if (cached !== null) {
    onProgress?.(`Đã xác minh IPA ${source.label} trên thiết bị`, bytesBefore + source.bytes);
    return {
      region: source.accent,
      records: parseRegionalIpaSource(cached).map((entry) => ({
        ...entry,
        region: source.accent,
      })),
      text: cached,
    };
  }
  const result = await downloadAndParse(
    source,
    signal,
    onProgress,
    bytesBefore,
  );
  await cacheVerifiedSource(db, id, source, result.text);
  return result;
}

function progressYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function downloadAndParse(
  source: RegionalIpaSource,
  signal: AbortSignal,
  onProgress?: (stage: string, bytesWritten: number) => void,
  bytesBefore = 0,
): Promise<{
  region: RegionalIpaAccent;
  records: RegionalIpaRecord[];
  text: string;
}> {
  onProgress?.(`Đang tải IPA ${source.label}`, bytesBefore);
  const text = await fetchSource(source, signal, (bytesRead) => {
    onProgress?.(
      `Đang tải IPA ${source.label}`,
      bytesBefore + bytesRead,
    );
  });
  const entries = parseRegionalIpaSource(text);
  const records: RegionalIpaRecord[] = entries.map((entry) => ({
    ...entry,
    region: source.accent,
  }));
  onProgress?.(`Đã tải IPA ${source.label}`, bytesBefore + source.bytes);
  return { region: source.accent, records, text };
}

export async function getOfflineRegionalIpaStatus(): Promise<{
  state: "missing" | "installed" | "damaged";
  bytes: number;
  entryCount: number;
}> {
  try {
    const db = await openSupplementDatabase();
    const table = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      metadataTable,
    );
    if (!table) return { state: "missing", bytes: 0, entryCount: 0 };
    const metadata = await db.getFirstAsync<{
      revision: string;
      us_sha256: string;
      uk_sha256: string;
      uk_supplement_sha256: string;
      entry_count: number;
    }>(
      `SELECT revision, us_sha256, uk_sha256, uk_supplement_sha256, entry_count
       FROM ${metadataTable} LIMIT 1`,
    );
    if (
      metadata?.revision !== REGIONAL_IPA_DICTIONARY.version ||
      metadata.us_sha256 !== REGIONAL_IPA_DICTIONARY.us.sha256 ||
      metadata.uk_sha256 !== REGIONAL_IPA_DICTIONARY.uk.sha256 ||
      metadata.uk_supplement_sha256 !==
        REGIONAL_IPA_DICTIONARY.ukSupplement.sha256 ||
      metadata.entry_count <= 0
    ) {
      return { state: "damaged", bytes: 0, entryCount: 0 };
    }
    const integrity = await db.getFirstAsync<{ quick_check: string }>(
      "PRAGMA quick_check",
    );
    const actualCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT term_key) AS count FROM ${dataTable}`,
    );
    if (
      integrity?.quick_check !== "ok" ||
      actualCount?.count !== metadata.entry_count
    ) {
      return { state: "damaged", bytes: 0, entryCount: actualCount?.count ?? 0 };
    }
    return {
      state: "installed",
      bytes: REGIONAL_IPA_DICTIONARY.sourceBytes,
      entryCount: metadata.entry_count,
    };
  } catch {
    return { state: "damaged", bytes: 0, entryCount: 0 };
  }
}

export async function getOfflineRegionalIpaPartsStatus(): Promise<
  Record<RegionalIpaSourceId, "missing" | "verified" | "installed">
> {
  const status = await getOfflineRegionalIpaStatus();
  const db = await openSupplementDatabase();
  const results = {} as Record<
    RegionalIpaSourceId,
    "missing" | "verified" | "installed"
  >;
  for (const { id, source } of regionalSources) {
    results[id] =
      status.state === "installed"
        ? "installed"
        : (await getVerifiedCachedSource(db, id, source)) !== null
          ? "verified"
          : "missing";
  }
  return results;
}

export async function downloadOfflineRegionalIpaPart(
  dictionary: SQLiteDatabase,
  id: RegionalIpaSourceId,
  onProgress?: (stage: string, bytesWritten: number, totalBytes: number) => void,
): Promise<{ complete: boolean; entryCount?: number }> {
  if (activeDownload) {
    throw new Error("Đang tải dữ liệu IPA. Hãy đợi tải xong.");
  }
  const selected = regionalSources.find((item) => item.id === id);
  if (!selected) throw new Error("Không nhận diện được phần IPA cần tải.");
  const controller = new AbortController();
  activeDownload = controller;
  try {
    const db = await openSupplementDatabase();
    await db.execAsync("PRAGMA query_only = OFF;");
    const cached = await getVerifiedCachedSource(db, id, selected.source);
    if (!cached) {
      const result = await downloadAndParse(
        selected.source,
        controller.signal,
        (stage, bytesWritten) =>
          onProgress?.(stage, bytesWritten, selected.source.bytes),
      );
      await cacheVerifiedSource(db, id, selected.source, result.text);
    } else {
      onProgress?.(
        `Đã xác minh IPA ${selected.source.label} trên thiết bị`,
        selected.source.bytes,
        selected.source.bytes,
      );
    }
    await db.execAsync("PRAGMA query_only = ON;");
  } catch (error) {
    if (databaseConnection) {
      try {
        await (await databaseConnection).execAsync("PRAGMA query_only = ON;");
      } catch {
        // Keep a usable database connection after an interrupted source save.
      }
    }
    throw error;
  } finally {
    activeDownload = null;
  }

  const parts = await getOfflineRegionalIpaPartsStatus();
  if (regionalSources.some(({ id: sourceId }) => parts[sourceId] === "missing")) {
    return { complete: false };
  }
  const installed = await installOfflineRegionalIpa(dictionary, onProgress);
  return { complete: true, entryCount: installed.entryCount };
}

export async function installOfflineRegionalIpa(
  dictionary: SQLiteDatabase,
  onProgress?: (stage: string, bytesWritten: number, totalBytes: number) => void,
): Promise<{ entryCount: number; usCount: number; ukCount: number }> {
  if (activeDownload) {
    throw new Error("Đang tải dữ liệu IPA. Hãy đợi tải xong.");
  }
  const controller = new AbortController();
  activeDownload = controller;
  try {
    const db = await openSupplementDatabase();
    await db.execAsync("PRAGMA query_only = OFF;");
    await ensureSourceCacheTable(db);
    const us = await getOrDownloadSource(
      db,
      "us",
      REGIONAL_IPA_DICTIONARY.us,
      controller.signal,
      (stage, bytes) =>
        onProgress?.(stage, bytes, REGIONAL_IPA_DICTIONARY.sourceBytes),
    );
    const uk = await getOrDownloadSource(
      db,
      "uk",
      REGIONAL_IPA_DICTIONARY.uk,
      controller.signal,
      (stage, bytes) =>
        onProgress?.(stage, bytes, REGIONAL_IPA_DICTIONARY.sourceBytes),
      REGIONAL_IPA_DICTIONARY.us.bytes,
    );
    const ukSupplement = await getOrDownloadSource(
      db,
      "ukSupplement",
      REGIONAL_IPA_DICTIONARY.ukSupplement,
      controller.signal,
      (stage, bytes) =>
        onProgress?.(stage, bytes, REGIONAL_IPA_DICTIONARY.sourceBytes),
      REGIONAL_IPA_DICTIONARY.us.bytes +
        REGIONAL_IPA_DICTIONARY.uk.bytes,
    );

    onProgress?.(
      "Đang ghép IPA với từ điển",
      REGIONAL_IPA_DICTIONARY.sourceBytes,
      REGIONAL_IPA_DICTIONARY.sourceBytes,
    );
    const words = await dictionary.getAllAsync<{ word: string }>(
      "SELECT DISTINCT word FROM words",
    );
    const dictionaryTerms = new Set(
      words.map((row) => normalizeRegionalIpaTerm(row.word)),
    );
    if (dictionaryTerms.size < Math.floor(DICTIONARY.wordCount * 0.9)) {
      throw new Error("Từ điển chưa sẵn sàng để ghép dữ liệu IPA.");
    }

    const existingRows = await dictionary.getAllAsync<{
      term: string;
      region: string | null;
    }>(
      `SELECT DISTINCT words.word AS term, pronunciations.region AS region
       FROM pronunciations
       JOIN words ON words.id = pronunciations.word_id
       WHERE pronunciations.region IS NOT NULL`,
    );
    const existingAccents = new Set<string>();
    for (const row of existingRows) {
      const accent = pronunciationAccent(row.region);
      if (accent) {
        existingAccents.add(
          `${normalizeRegionalIpaTerm(row.term)}|${accent}`,
        );
      }
    }

    onProgress?.(
      "Đang ghép IPA với từ điển",
      REGIONAL_IPA_DICTIONARY.sourceBytes,
      REGIONAL_IPA_DICTIONARY.sourceBytes,
    );
    await progressYield();
    const records = buildRegionalIpaSupplement(
      dictionaryTerms,
      existingAccents,
      [us, uk, ukSupplement],
    );

    if (records.length < 50_000) {
      throw new Error(
        "Số mục IPA ghép được ít hơn dự kiến. Dữ liệu trên thiết bị chưa bị thay đổi.",
      );
    }

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${metadataTable} (
        revision TEXT NOT NULL,
        us_sha256 TEXT NOT NULL,
        uk_sha256 TEXT NOT NULL,
        uk_supplement_sha256 TEXT NOT NULL,
        entry_count INTEGER NOT NULL,
        us_count INTEGER NOT NULL,
        uk_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${dataTable} (
        term_key TEXT NOT NULL,
        region TEXT NOT NULL CHECK(region IN ('us', 'uk')),
        ipa TEXT NOT NULL,
        PRIMARY KEY (term_key, region)
      );
      CREATE INDEX IF NOT EXISTS idx_${dataTable}_term
        ON ${dataTable}(term_key COLLATE NOCASE);
    `);
    const metadataColumns = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${metadataTable})`,
    );
    if (!metadataColumns.some((column) => column.name === "uk_supplement_sha256")) {
      await db.execAsync(
        `ALTER TABLE ${metadataTable}
         ADD COLUMN uk_supplement_sha256 TEXT NOT NULL DEFAULT ''`,
      );
    }

    let usCount = 0;
    let ukCount = 0;
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `DELETE FROM ${dataTable}; DELETE FROM ${metadataTable};`,
      );
      for (let index = 0; index < records.length; index += 250) {
        const batch = records.slice(index, index + 250);
        const values = batch.map(() => "(?, ?, ?)").join(", ");
        const parameters = batch.flatMap((record) => [
          record.term,
          record.region,
          record.ipa,
        ]);
        await db.runAsync(
          `INSERT INTO ${dataTable} (term_key, region, ipa) VALUES ${values}`,
          ...parameters,
        );
        for (const record of batch) {
          if (record.region === "us") usCount += 1;
          else ukCount += 1;
        }
        if ((index + batch.length) % 2_000 === 0) {
          onProgress?.(
            `Đang lưu dữ liệu IPA (${(index + batch.length).toLocaleString("vi-VN")}/${records.length.toLocaleString("vi-VN")})`,
            REGIONAL_IPA_DICTIONARY.sourceBytes,
            REGIONAL_IPA_DICTIONARY.sourceBytes,
          );
          await progressYield();
        }
      }
      await db.runAsync(
        `INSERT INTO ${metadataTable}
         (revision, us_sha256, uk_sha256, uk_supplement_sha256,
          entry_count, us_count, uk_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        REGIONAL_IPA_DICTIONARY.version,
        REGIONAL_IPA_DICTIONARY.us.sha256,
        REGIONAL_IPA_DICTIONARY.uk.sha256,
        REGIONAL_IPA_DICTIONARY.ukSupplement.sha256,
        new Set(records.map((record) => record.term)).size,
        usCount,
        ukCount,
      );
    });
    await db.execAsync("PRAGMA query_only = ON;");
    const status = await getOfflineRegionalIpaStatus();
    if (status.state !== "installed") {
      throw new Error("Không thể xác minh dữ liệu IPA đã cài.");
    }
    installedRevision = true;
    onProgress?.(
      "Đã cài xong dữ liệu IPA",
      REGIONAL_IPA_DICTIONARY.sourceBytes,
      REGIONAL_IPA_DICTIONARY.sourceBytes,
    );
    return {
      entryCount: status.entryCount,
      usCount,
      ukCount,
    };
  } catch (error) {
    if (databaseConnection) {
      try {
        await (await databaseConnection).execAsync("PRAGMA query_only = ON;");
      } catch {
        // Keep the previous, verified local copy usable after a failed update.
      }
    }
    throw error;
  } finally {
    activeDownload = null;
  }
}

export async function getRegionalIpaForTerm(
  term: string,
): Promise<{ ipa: string; region: string }[]> {
  try {
    const db = await openSupplementDatabase();
    if (installedRevision === undefined) {
      installedRevision = await hasCurrentRevision(db);
      if (installedRevision) await db.execAsync("PRAGMA query_only = ON;");
    }
    if (!installedRevision) return [];
    return db.getAllAsync<{ ipa: string; region: string }>(
      `SELECT ipa, CASE region WHEN 'us' THEN 'NAmE' ELSE 'BrE' END AS region
       FROM ${dataTable} WHERE term_key = ? COLLATE NOCASE ORDER BY region`,
      normalizeRegionalIpaTerm(term),
    );
  } catch {
    installedRevision = false;
    return [];
  }
}

export async function getRegionalIpaForTerms(
  terms: readonly string[],
): Promise<Map<string, { ipa: string; region: string }[]>> {
  const normalizedTerms = [
    ...new Set(terms.map(normalizeRegionalIpaTerm).filter(Boolean)),
  ];
  const results = new Map<string, { ipa: string; region: string }[]>();
  if (!normalizedTerms.length) return results;

  try {
    const db = await openSupplementDatabase();
    if (installedRevision === undefined) {
      installedRevision = await hasCurrentRevision(db);
      if (installedRevision) await db.execAsync("PRAGMA query_only = ON;");
    }
    if (!installedRevision) return results;

    for (let start = 0; start < normalizedTerms.length; start += 180) {
      const batch = normalizedTerms.slice(start, start + 180);
      const rows = await db.getAllAsync<{
        termKey: string;
        ipa: string;
        region: string;
      }>(
        `SELECT term_key AS termKey, ipa,
                CASE region WHEN 'us' THEN 'NAmE' ELSE 'BrE' END AS region
         FROM ${dataTable}
         WHERE term_key COLLATE NOCASE IN (${batch.map(() => "?").join(",")})
         ORDER BY term_key, region`,
        ...batch,
      );
      for (const row of rows) {
        const key = normalizeRegionalIpaTerm(row.termKey);
        const existing = results.get(key) ?? [];
        existing.push({ ipa: row.ipa, region: row.region });
        results.set(key, existing);
      }
    }
    return results;
  } catch {
    installedRevision = false;
    return new Map();
  }
}

export type RegionalIpaLookupResult =
  | { state: "found"; pronunciations: { ipa: string; region: string }[] }
  | { state: "not-installed" }
  | { state: "not-found" }
  | { state: "damaged" }
  | { state: "failed" };

export async function getRegionalIpaLookupForTerm(
  term: string,
): Promise<RegionalIpaLookupResult> {
  let db: SQLiteDatabase;
  try {
    db = await openSupplementDatabase();
  } catch {
    return { state: "failed" };
  }

  try {
    if (installedRevision !== true) {
      const metadataTableExists = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        metadataTable,
      );
      if (!metadataTableExists) return { state: "not-installed" };

      const metadata = await db.getFirstAsync<{
        revision: string;
        us_sha256: string;
        uk_sha256: string;
        uk_supplement_sha256: string;
        entry_count: number;
      }>(
        `SELECT revision, us_sha256, uk_sha256, uk_supplement_sha256, entry_count
         FROM ${metadataTable} LIMIT 1`,
      );
      if (
        metadata?.revision !== REGIONAL_IPA_DICTIONARY.version ||
        metadata.us_sha256 !== REGIONAL_IPA_DICTIONARY.us.sha256 ||
        metadata.uk_sha256 !== REGIONAL_IPA_DICTIONARY.uk.sha256 ||
        metadata.uk_supplement_sha256 !==
          REGIONAL_IPA_DICTIONARY.ukSupplement.sha256 ||
        metadata.entry_count <= 0
      ) {
        return { state: "damaged" };
      }
      installedRevision = true;
      await db.execAsync("PRAGMA query_only = ON;");
    }

    const pronunciations = await db.getAllAsync<{
      ipa: string;
      region: string;
    }>(
      `SELECT ipa, CASE region WHEN 'us' THEN 'NAmE' ELSE 'BrE' END AS region
       FROM ${dataTable} WHERE term_key = ? COLLATE NOCASE ORDER BY region`,
      normalizeRegionalIpaTerm(term),
    );
    return pronunciations.length
      ? { state: "found", pronunciations }
      : { state: "not-found" };
  } catch {
    return { state: "failed" };
  }
}

export async function deleteOfflineRegionalIpa(): Promise<void> {
  activeDownload?.abort();
  activeDownload = null;
  const current = databaseConnection;
  databaseConnection = undefined;
  installedRevision = undefined;
  if (current) {
    try {
      await (await current).closeAsync();
    } catch {
      // The database may already be closed after an interrupted installation.
    }
  }
  await deleteDatabaseAsync(filename);
}
