import {
  backupDatabaseAsync,
  deleteDatabaseAsync,
  deserializeDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { File, FileMode, Paths } from "expo-file-system";
import { DICTIONARY, type DictionaryStage } from "../domain/dictionary";
import { dictionaryDownloadUrl } from "../domain/dictionary-download";
import { dictionaryImportBytes } from "../domain/dictionary-import";
import {
  DICTIONARY_EXAMPLE_REVISION,
  DICTIONARY_EXAMPLE_UPDATES,
} from "../domain/dictionary-example-updates";
import {
  LOCAL_DICTIONARY_ADDITIONS,
  LOCAL_DICTIONARY_ADDITIONS_REVISION,
} from "../domain/dictionary-local-additions";
import { applyLocalDictionaryAdditions } from "./dictionary-local-additions";
import {
  draftInDictionary,
  entryInDictionary,
  searchInDictionary,
  suggestInDictionary,
} from "./dictionary-queries";
import type { DictionaryPartOfSpeech } from "../domain/dictionary";
import { openDatabaseSafely, storageFailureMessage } from "./sqlite-connection";

const filename = `vocabflow-dictionary-${DICTIONARY.sha256.slice(0, 16)}.db`;
const DICTIONARY_CONTENT_REVISION =
  `${DICTIONARY_EXAMPLE_REVISION}+${LOCAL_DICTIONARY_ADDITIONS_REVISION}`;
let connection: Promise<SQLiteDatabase> | undefined;

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
    }
    const cached = table
      ? await db.getFirstAsync<{
          source_hash: string;
          example_revision: string;
        }>(
          "SELECT source_hash, example_revision FROM vocabflow_dictionary_meta LIMIT 1",
        )
      : null;
    if (cached?.source_hash !== DICTIONARY.sha256) {
      if (!allowDownload) {
        onStage?.("awaiting-consent");
        throw new DictionaryDownloadConsentRequired();
      }
      onStage?.("downloading");
      const downloadFile = new File(Paths.cache, `${filename}.download`);
      let buffer: Uint8Array;
      try {
        if (downloadFile.exists) downloadFile.delete();
        const downloaded = await File.downloadFileAsync(
          dictionaryDownloadUrl(),
          downloadFile,
          {
            idempotent: true,
            onProgress: (progress) =>
              onProgress?.(progress.bytesWritten, progress.totalBytes),
          },
        );
        if (downloaded.size !== DICTIONARY.bytes) {
          throw new Error(
            "Tệp từ điển chưa tải đủ. Hãy thử lại khi có mạng ổn định.",
          );
        }
        onStage?.("verifying");
        const hash = await downloaded.digest("SHA-256");
        if (hash.toLowerCase() !== DICTIONARY.sha256)
          throw new Error(
            "Tệp từ điển không đúng phiên bản hoặc bị hỏng. Hãy tải lại.",
          );
        const handle = downloaded.open(FileMode.ReadOnly);
        try {
          buffer = await handle.readBytes(DICTIONARY.bytes);
        } finally {
          handle.close();
          downloaded.delete();
        }
      } finally {
        if (downloadFile.exists) downloadFile.delete();
      }
      if (buffer.byteLength !== DICTIONARY.bytes)
        throw new Error(
          "Tệp từ điển chưa tải đủ. Hãy thử lại khi có mạng ổn định.",
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
      if (
        count?.count !==
        DICTIONARY.wordCount + LOCAL_DICTIONARY_ADDITIONS.length
      )
        throw new Error("Số lượng từ điển không khớp phiên bản đã kiểm tra.");
      await db.withTransactionAsync(async () => {
        await db.execAsync(`CREATE TABLE IF NOT EXISTS vocabflow_dictionary_meta (
          source_hash TEXT NOT NULL,
          example_revision TEXT NOT NULL DEFAULT ''
        ); DELETE FROM vocabflow_dictionary_meta;`);
        await db.runAsync(
          "INSERT INTO vocabflow_dictionary_meta (source_hash, example_revision) VALUES (?, ?)",
          DICTIONARY.sha256,
          DICTIONARY_CONTENT_REVISION,
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
      if (
        count?.count !==
        DICTIONARY.wordCount + LOCAL_DICTIONARY_ADDITIONS.length
      )
        throw new Error("Số lượng từ điển không khớp phiên bản đã kiểm tra.");
      await db.runAsync(
        "UPDATE vocabflow_dictionary_meta SET example_revision = ?",
        DICTIONARY_CONTENT_REVISION,
      );
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

export async function getOfflineDictionaryStatus(): Promise<{
  state: "missing" | "installed" | "damaged";
  bytes: number;
}> {
  const file = new File(Paths.document, "SQLite", filename);
  if (!file.exists) return { state: "missing", bytes: 0 };
  const bytes = file.size ?? 0;
  if (bytes !== DICTIONARY.bytes) return { state: "damaged", bytes };
  try {
    const db = await openDictionary();
    const count = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM words",
    );
    if (count?.count !== DICTIONARY.wordCount)
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
  const file = new File(Paths.document, "SQLite", filename);
  if (file.exists) await deleteDatabaseAsync(filename);
}

export async function searchDictionary(query: string, offset = 0) {
  return searchInDictionary(await openDictionary(), query, offset);
}
export async function suggestDictionary(query: string) {
  return suggestInDictionary(await openDictionary(), query);
}
export async function getDictionaryEntry(
  id: number,
  offset = 0,
  parts: DictionaryPartOfSpeech[] | "first" = [],
) {
  return entryInDictionary(await openDictionary(), id, offset, parts);
}
export async function getDictionaryDraft(id: number, senseId: number) {
  return draftInDictionary(await openDictionary(), id, senseId);
}
