import {
  backupDatabaseAsync,
  deleteDatabaseAsync,
  deserializeDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { File, FileMode, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  DICTIONARY,
  formatDictionaryPronunciations,
  mergeDictionaryPronunciations,
  type DictionaryStage,
  type DictionaryPronunciation,
} from "../domain/dictionary";
import { dictionaryDownloadUrl } from "../domain/dictionary-download";
import { dictionaryImportBytes } from "../domain/dictionary-import";
import {
  DICTIONARY_EXAMPLE_REVISION,
  DICTIONARY_EXAMPLE_UPDATES,
} from "../domain/dictionary-example-updates";
import {
  LOCAL_DICTIONARY_ADDITIONS_REVISION,
} from "../domain/dictionary-local-additions";
import { applyLocalDictionaryAdditions } from "./dictionary-local-additions";
import {
  getRegionalIpaForTerm,
  getRegionalIpaForTerms,
  installOfflineRegionalIpa,
  downloadOfflineRegionalIpaPart as downloadRegionalIpaPart,
  type RegionalIpaSourceId,
} from "./offline-regional-pronunciations";
import {
  draftInDictionary,
  entryInDictionary,
  inflectionRootsInDictionary,
  randomUnlearnedInDictionary,
  searchInDictionary,
  suggestInDictionary,
} from "./dictionary-queries";
import type { DictionaryPartOfSpeech } from "../domain/dictionary";
import { openDatabaseSafely, storageFailureMessage } from "./sqlite-connection";

const filename = `vocabflow-dictionary-${DICTIONARY.sha256.slice(0, 16)}.db`;
const DICTIONARY_DOWNLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const DICTIONARY_CONTENT_REVISION =
  `${DICTIONARY_EXAMPLE_REVISION}+${LOCAL_DICTIONARY_ADDITIONS_REVISION}`;
let connection: Promise<SQLiteDatabase> | undefined;

function sha256Hex(bytes: Uint8Array): string {
  return Array.from(sha256(bytes), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchDictionaryChunk(
  url: string,
  start: number,
  end: number,
): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
    credentials: "omit",
    cache: "no-store",
  });
  if (response.status !== 206) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(
      `Không thể tải đoạn từ điển ${start}-${end} (HTTP ${response.status}). Hãy thử lại.`,
    );
  }
  const expectedRange = `bytes ${start}-${end}/${DICTIONARY.bytes}`;
  if (response.headers.get("content-range") !== expectedRange) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Máy chủ trả về đoạn từ điển không đúng vị trí.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== end - start + 1) {
    throw new Error("Đoạn từ điển tải chưa đủ. Hãy thử lại.");
  }
  return bytes;
}

async function forEachDictionaryDownloadChunk(
  receiveChunk: (bytes: Uint8Array, offset: number) => Promise<void>,
  onProgress?: (bytesWritten: number, totalBytes: number) => void,
): Promise<void> {
  const url = dictionaryDownloadUrl();
  for (let start = 0; start < DICTIONARY.bytes; start += DICTIONARY_DOWNLOAD_CHUNK_BYTES) {
    const end = Math.min(
      start + DICTIONARY_DOWNLOAD_CHUNK_BYTES - 1,
      DICTIONARY.bytes - 1,
    );
    const chunk = await fetchDictionaryChunk(url, start, end);
    await receiveChunk(chunk, start);
    onProgress?.(end + 1, DICTIONARY.bytes);
  }
}

export class DictionaryDownloadConsentRequired extends Error {
  constructor() {
    super("Cần xác nhận trước khi tải từ điển.");
    this.name = "DictionaryDownloadConsentRequired";
  }
}

async function applyExampleUpdates(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const update of DICTIONARY_EXAMPLE_UPDATES) {
      const result = await db.runAsync(
        `UPDATE word_definitions
         SET example = ?
         WHERE id = ? AND word_id = ?
           AND EXISTS (SELECT 1 FROM words WHERE id = ? AND word = ?)`,
        update.example,
        update.senseId,
        update.entryId,
        update.entryId,
        update.term,
      );
      if (result.changes !== 1) {
        throw new Error(
          `Không thể cập nhật ví dụ từ điển cho "${update.term}".`,
        );
      }
    }
  });
}

async function initialize(
  onStage?: (stage: DictionaryStage) => void,
  allowDownload = false,
  onProgress?: (bytesWritten: number, totalBytes: number) => void,
): Promise<SQLiteDatabase> {
  onStage?.("checking");
  const db = await openDatabaseSafely(() => openDatabaseAsync(filename));
  try {
    const table = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vocabflow_dictionary_meta'",
    );
    if (table) {
      const columns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(vocabflow_dictionary_meta)",
      );
      if (!columns.some((column) => column.name === "example_revision")) {
        await db.execAsync(
          "ALTER TABLE vocabflow_dictionary_meta ADD COLUMN example_revision TEXT NOT NULL DEFAULT '';",
        );
      }
      if (!columns.some((column) => column.name === "dictionary_word_count")) {
        await db.execAsync(
          "ALTER TABLE vocabflow_dictionary_meta ADD COLUMN dictionary_word_count INTEGER NOT NULL DEFAULT 0;",
        );
      }
    }
    const cached = table
      ? await db.getFirstAsync<{
          source_hash: string;
          example_revision: string;
          dictionary_word_count: number;
        }>(
          "SELECT source_hash, example_revision, dictionary_word_count FROM vocabflow_dictionary_meta LIMIT 1",
        )
      : null;
    if (cached?.source_hash !== DICTIONARY.sha256) {
      if (!allowDownload) {
        onStage?.("awaiting-consent");
        throw new DictionaryDownloadConsentRequired();
      }
      onStage?.("downloading");
      let buffer: Uint8Array;
      let hash: string;
      if (Platform.OS === "web") {
        buffer = new Uint8Array(DICTIONARY.bytes);
        await forEachDictionaryDownloadChunk(
          async (chunk, offset) => buffer.set(chunk, offset),
          onProgress,
        );
        onStage?.("verifying");
        hash = sha256Hex(buffer);
      } else {
        const downloadFile = new File(Paths.cache, `${filename}.download`);
        try {
          if (downloadFile.exists) downloadFile.delete();
          downloadFile.create({ intermediates: true, overwrite: true });
          const handle = downloadFile.open(FileMode.WriteOnly);
          try {
            await forEachDictionaryDownloadChunk(
              (chunk) => handle.writeBytes(chunk),
              onProgress,
            );
          } finally {
            handle.close();
          }
          if (downloadFile.size !== DICTIONARY.bytes) {
            throw new Error(
              "Tệp từ điển chưa tải đủ. Hãy thử lại khi có mạng ổn định.",
            );
          }
          onStage?.("verifying");
          hash = await downloadFile.digest("SHA-256");
          const readHandle = downloadFile.open(FileMode.ReadOnly);
          try {
            buffer = await readHandle.readBytes(DICTIONARY.bytes);
          } finally {
            readHandle.close();
          }
        } finally {
          if (downloadFile.exists) downloadFile.delete();
        }
      }
      if (buffer.byteLength !== DICTIONARY.bytes)
        throw new Error(
          "Tệp từ điển chưa tải đủ. Hãy thử lại khi có mạng ổn định.",
        );
      if (hash.toLowerCase() !== DICTIONARY.sha256)
        throw new Error(
          "Tệp từ điển không đúng phiên bản hoặc bị hỏng. Hãy tải lại.",
        );
      onStage?.("importing");
      const imported = await deserializeDatabaseAsync(
        dictionaryImportBytes(buffer),
      );
      try {
        const check = await imported.getFirstAsync<{ quick_check: string }>(
          "PRAGMA quick_check",
        );
        if (check?.quick_check !== "ok")
          throw new Error("Kho từ điển bị lỗi. Hãy tải lại.");
        const sourceWordCount = await imported.getFirstAsync<{
          count: number;
        }>("SELECT COUNT(*) AS count FROM words");
        if (sourceWordCount?.count !== DICTIONARY.wordCount)
          throw new Error(
            "Số lượng từ điển gốc không khớp phiên bản đã kiểm tra.",
          );
        await applyExampleUpdates(imported);
        await applyLocalDictionaryAdditions(imported);
        const totalWordCount = await imported.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM words",
        );
        if ((totalWordCount?.count ?? 0) < DICTIONARY.wordCount)
          throw new Error("Số lượng từ điển không khớp phiên bản đã kiểm tra.");
        await backupDatabaseAsync({
          sourceDatabase: imported,
          destDatabase: db,
        });
      } finally {
        await imported.closeAsync();
      }
      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_vocabflow_words_nocase ON words(word COLLATE NOCASE, id);",
      );
      const count = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM words",
      );
      if (!count || count.count < DICTIONARY.wordCount)
        throw new Error("Số lượng từ điển không khớp phiên bản đã kiểm tra.");
      await db.withTransactionAsync(async () => {
        await db.execAsync(`CREATE TABLE IF NOT EXISTS vocabflow_dictionary_meta (
          source_hash TEXT NOT NULL,
          example_revision TEXT NOT NULL DEFAULT '',
          dictionary_word_count INTEGER NOT NULL DEFAULT 0
        ); DELETE FROM vocabflow_dictionary_meta;`);
        await db.runAsync(
          "INSERT INTO vocabflow_dictionary_meta (source_hash, example_revision, dictionary_word_count) VALUES (?, ?, ?)",
          DICTIONARY.sha256,
          DICTIONARY_CONTENT_REVISION,
          count.count,
        );
      });
    } else if (cached.example_revision !== DICTIONARY_CONTENT_REVISION) {
      // Upgrade an already-downloaded offline copy in place: no second 44 MB download.
      const check = await db.getFirstAsync<{ quick_check: string }>(
        "PRAGMA quick_check",
      );
      if (check?.quick_check !== "ok")
        throw new Error("Kho từ điển bị lỗi. Hãy tải lại.");
      await db.execAsync("PRAGMA query_only = OFF;");
      await applyExampleUpdates(db);
      await applyLocalDictionaryAdditions(db);
      const count = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM words",
      );
      if (!count || count.count < DICTIONARY.wordCount)
        throw new Error("Số lượng từ điển không khớp phiên bản đã kiểm tra.");
      await db.runAsync(
        "UPDATE vocabflow_dictionary_meta SET example_revision = ?, dictionary_word_count = ?",
        DICTIONARY_CONTENT_REVISION,
        count.count,
      );
    } else if (cached?.dictionary_word_count) {
      const count = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM words",
      );
      if (count?.count !== cached.dictionary_word_count)
        throw new Error("Số lượng từ điển không khớp phiên bản đã kiểm tra.");
    }
    // No application query may mutate the reference dictionary after setup.
    await db.execAsync("PRAGMA query_only = ON;");
    // A persisted marker alone is insufficient if the file has become unreadable.
    await db.getFirstAsync("SELECT id FROM words LIMIT 1");
    onStage?.("ready");
    return db;
  } catch (failure) {
    await db.closeAsync();
    // Only this disposable reference cache is removed; never vocabflow.db.
    // A failed/partial import must be recoverable with the Retry button.
    if (!(failure instanceof DictionaryDownloadConsentRequired))
      await deleteDatabaseAsync(filename);
    throw failure;
  }
}

export function openDictionary(
  onStage?: (stage: DictionaryStage) => void,
  options: {
    allowDownload?: boolean;
    onProgress?: (bytesWritten: number, totalBytes: number) => void;
  } = {},
): Promise<SQLiteDatabase> {
  if (!connection) {
    connection = initialize(
      onStage,
      options.allowDownload === true,
      options.onProgress,
    ).catch((failure) => {
      connection = undefined;
      if (failure instanceof DictionaryDownloadConsentRequired) throw failure;
      const detail = failure instanceof Error ? failure.message : "";
      throw new Error(
        storageFailureMessage(
          failure,
          /từ điển|kho tra cứu/i.test(detail)
            ? detail
            : "Không thể nạp kho từ điển trên thiết bị. Sổ cá nhân không bị thay đổi.",
        ),
      );
    });
  }
  return connection;
}

async function hasExpectedDictionaryWordCount(
  db: SQLiteDatabase,
): Promise<boolean> {
  const [actual, expected] = await Promise.all([
    db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM words"),
    db.getFirstAsync<{ dictionary_word_count: number }>(
      "SELECT dictionary_word_count FROM vocabflow_dictionary_meta LIMIT 1",
    ),
  ]);
  return (
    (actual?.count ?? 0) >= DICTIONARY.wordCount &&
    actual?.count === expected?.dictionary_word_count
  );
}

export async function getOfflineDictionaryStatus(): Promise<{
  state: "missing" | "installed" | "damaged";
  bytes: number;
}> {
  if (Platform.OS === "web") {
    try {
      const db = await openDictionary();
      if (!(await hasExpectedDictionaryWordCount(db))) {
        return { state: "damaged", bytes: DICTIONARY.bytes };
      }
      return { state: "installed", bytes: DICTIONARY.bytes };
    } catch (error) {
      if (error instanceof DictionaryDownloadConsentRequired)
        return { state: "missing", bytes: 0 };
      return { state: "damaged", bytes: DICTIONARY.bytes };
    }
  }
  const file = new File(Paths.document, "SQLite", filename);
  if (!file.exists) return { state: "missing", bytes: 0 };
  const bytes = file.size ?? 0;
  if (bytes < DICTIONARY.bytes) return { state: "damaged", bytes };
  try {
    const db = await openDictionary();
    if (!(await hasExpectedDictionaryWordCount(db)))
      return { state: "damaged", bytes };
    return { state: "installed", bytes };
  } catch (error) {
    if (error instanceof DictionaryDownloadConsentRequired)
      return { state: "missing", bytes: 0 };
    return { state: "damaged", bytes };
  }
}

export async function deleteOfflineDictionary(): Promise<void> {
  const current = connection;
  connection = undefined;
  if (current) {
    try {
      await (await current).closeAsync();
    } catch {
      // The database may already have closed after a failed download.
    }
  }
  if (Platform.OS === "web") {
    await deleteDatabaseAsync(filename);
    return;
  }
  const file = new File(Paths.document, "SQLite", filename);
  if (file.exists) await deleteDatabaseAsync(filename);
}

export async function searchDictionary(query: string, offset = 0) {
  return searchInDictionary(await openDictionary(), query, offset);
}
export async function suggestDictionary(query: string) {
  return suggestInDictionary(await openDictionary(), query);
}

export async function getDictionaryPronunciationsForTerms(
  terms: readonly string[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, string>> {
  const cleanTerms = [...new Set(
    terms.map((term) => term.trim().replace(/\s+/g, " ")).filter(Boolean),
  )];
  const normalizedTerms = [
    ...new Set(cleanTerms.map((term) =>
      term.normalize("NFKC").toLocaleLowerCase("en"),
    )),
  ];
  if (!cleanTerms.length) return new Map();
  const baseByTerm = new Map<string, DictionaryPronunciation[]>();
  let db: SQLiteDatabase | null = null;

  try {
    db = await openDictionary();
  } catch (failure) {
    if (!(failure instanceof DictionaryDownloadConsentRequired)) throw failure;
  }

  if (db) {
    for (let start = 0; start < normalizedTerms.length; start += 180) {
      const batch = normalizedTerms.slice(start, start + 180);
      const rows = await db.getAllAsync<{
        term: string;
        ipa: string;
        region: string | null;
      }>(
        `SELECT w.word AS term, p.ipa, p.region
         FROM words w
         JOIN pronunciations p ON p.word_id = w.id
         WHERE w.lang_code = 'en'
           AND w.word COLLATE NOCASE IN (${batch.map(() => "?").join(",")})
         ORDER BY w.word COLLATE NOCASE, w.id, p.id`,
        ...batch,
      );
      for (const row of rows) {
        const key = row.term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
        const existing = baseByTerm.get(key) ?? [];
        existing.push({ ipa: row.ipa, region: row.region });
        baseByTerm.set(key, existing);
      }
      onProgress?.(start + batch.length, normalizedTerms.length);
    }
  } else {
    onProgress?.(normalizedTerms.length, normalizedTerms.length);
  }

  const regionalByTerm = await getRegionalIpaForTerms(cleanTerms);
  const results = new Map<string, string>();
  for (const term of cleanTerms) {
    const key = term.normalize("NFKC").toLocaleLowerCase("en");
    const merged = mergeDictionaryPronunciations(
      baseByTerm.get(key) ?? [],
      regionalByTerm.get(key) ?? [],
    );
    results.set(term, formatDictionaryPronunciations(merged));
  }
  return results;
}

export async function getRandomUnlearnedDictionaryWord(
  learnedTerms: ReadonlySet<string>,
) {
  return randomUnlearnedInDictionary(await openDictionary(), learnedTerms);
}
export async function getDictionaryEntry(
  id: number,
  offset = 0,
  parts: DictionaryPartOfSpeech[] | "first" = [],
) {
  const entry = await entryInDictionary(
    await openDictionary(),
    id,
    offset,
    parts,
  );
  const supplemental = await getRegionalIpaForTerm(entry.term);
  if (!supplemental.length) return entry;
  return {
    ...entry,
    pronunciations: mergeDictionaryPronunciations(
      entry.pronunciations,
      supplemental,
    ),
  };
}

export async function getDictionaryInflectionRoots(id: number) {
  return inflectionRootsInDictionary(await openDictionary(), id);
}

export async function installOfflineRegionalPronunciations(
  onProgress?: (stage: string, bytesWritten: number, totalBytes: number) => void,
) {
  return installOfflineRegionalIpa(await openDictionary(), onProgress);
}
export async function downloadOfflineRegionalPronunciationPart(
  id: RegionalIpaSourceId,
  onProgress?: (stage: string, bytesWritten: number, totalBytes: number) => void,
) {
  return downloadRegionalIpaPart(await openDictionary(), id, onProgress);
}
export async function getDictionaryDraft(id: number, senseId: number) {
  return draftInDictionary(await openDictionary(), id, senseId);
}
