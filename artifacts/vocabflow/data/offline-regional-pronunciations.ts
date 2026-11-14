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
let databaseConnection: Promise<SQLiteDatabase> | undefined;
let activeDownload: AbortController | null = null;
let installedRevision: boolean | undefined;

function sha256Hex(bytes: Uint8Array): string {
  return Array.from(sha256(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function sourceUrl(file: string): string {
  return `https://raw.githubusercontent.com/open-dict-data/ipa-dict/${REGIONAL_IPA_DICTIONARY.commit}/${file}`;
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
      entry_count: number;
    }>(
      `SELECT revision, us_sha256, uk_sha256, entry_count
       FROM ${metadataTable} LIMIT 1`,
    );
    return (
      metadata?.revision === REGIONAL_IPA_DICTIONARY.version &&
      metadata.us_sha256 === REGIONAL_IPA_DICTIONARY.us.sha256 &&
      metadata.uk_sha256 === REGIONAL_IPA_DICTIONARY.uk.sha256 &&
      metadata.entry_count > 0
    );
  } catch {
    return false;
  }
}

async function fetchSource(
  source: RegionalIpaSource,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(sourceUrl(source.file), {
    credentials: "omit",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Không tải được IPA ${source.label} (HTTP ${response.status}). Hãy thử lại.`,
    );
  }
  const textPromise = response.clone().text();
  const bytes = new Uint8Array(await response.arrayBuffer());
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
  return textPromise;
}

function progressYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function downloadAndParse(
  source: RegionalIpaSource,
  signal: AbortSignal,
  onProgress?: (stage: string, bytesWritten: number) => void,
  bytesBefore = 0,
): Promise<{ region: RegionalIpaAccent; records: RegionalIpaRecord[] }> {
  onProgress?.(`Đang tải IPA ${source.label}`, bytesBefore);
  const text = await fetchSource(source, signal);
  const entries = parseRegionalIpaSource(text);
  const records: RegionalIpaRecord[] = entries.map((entry) => ({
    ...entry,
    region: source.accent,
  }));
  onProgress?.(`Đã tải IPA ${source.label}`, bytesBefore + source.bytes);
  return { region: source.accent, records };
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
      entry_count: number;
    }>(
      `SELECT revision, us_sha256, uk_sha256, entry_count
       FROM ${metadataTable} LIMIT 1`,
    );
    if (
      metadata?.revision !== REGIONAL_IPA_DICTIONARY.version ||
      metadata.us_sha256 !== REGIONAL_IPA_DICTIONARY.us.sha256 ||
      metadata.uk_sha256 !== REGIONAL_IPA_DICTIONARY.uk.sha256 ||
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
    const us = await downloadAndParse(
      REGIONAL_IPA_DICTIONARY.us,
      controller.signal,
      (stage, bytes) =>
        onProgress?.(stage, bytes, REGIONAL_IPA_DICTIONARY.sourceBytes),
    );
    const uk = await downloadAndParse(
      REGIONAL_IPA_DICTIONARY.uk,
      controller.signal,
      (stage, bytes) =>
        onProgress?.(stage, bytes, REGIONAL_IPA_DICTIONARY.sourceBytes),
      REGIONAL_IPA_DICTIONARY.us.bytes,
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
      [us, uk],
    );

    if (records.length < 50_000) {
      throw new Error(
        "Số mục IPA ghép được ít hơn dự kiến. Dữ liệu trên thiết bị chưa bị thay đổi.",
      );
    }

    const db = await openSupplementDatabase();
    await db.execAsync("PRAGMA query_only = OFF;");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${metadataTable} (
        revision TEXT NOT NULL,
        us_sha256 TEXT NOT NULL,
        uk_sha256 TEXT NOT NULL,
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
         (revision, us_sha256, uk_sha256, entry_count, us_count, uk_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        REGIONAL_IPA_DICTIONARY.version,
        REGIONAL_IPA_DICTIONARY.us.sha256,
        REGIONAL_IPA_DICTIONARY.uk.sha256,
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
        entry_count: number;
      }>(
        `SELECT revision, us_sha256, uk_sha256, entry_count
         FROM ${metadataTable} LIMIT 1`,
      );
      if (
        metadata?.revision !== REGIONAL_IPA_DICTIONARY.version ||
        metadata.us_sha256 !== REGIONAL_IPA_DICTIONARY.us.sha256 ||
        metadata.uk_sha256 !== REGIONAL_IPA_DICTIONARY.uk.sha256 ||
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
