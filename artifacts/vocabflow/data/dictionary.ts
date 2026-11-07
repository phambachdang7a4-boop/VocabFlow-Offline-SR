import { backupDatabaseAsync, deleteDatabaseAsync, deserializeDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { sha256 } from '@noble/hashes/sha2.js';
import { DICTIONARY, type DictionaryStage } from '../domain/dictionary';
import { dictionaryDownloadUrl } from '../domain/dictionary-download';
import { draftInDictionary, entryInDictionary, searchInDictionary } from './dictionary-queries';
import { openDatabaseSafely, storageFailureMessage } from './sqlite-connection';

const filename = `vocabflow-dictionary-${DICTIONARY.sha256.slice(0, 16)}.db`;
let connection: Promise<SQLiteDatabase> | undefined;

export class DictionaryDownloadConsentRequired extends Error {
  constructor() {
    super('Cần xác nhận trước khi tải từ điển.');
    this.name = 'DictionaryDownloadConsentRequired';
  }
}

async function initialize(onStage?: (stage: DictionaryStage) => void, allowDownload = false): Promise<SQLiteDatabase> {
  onStage?.('checking');
  const db = await openDatabaseSafely(() => openDatabaseAsync(filename));
  try {
    const table = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vocabflow_dictionary_meta'",
    );
    const cached = table ? await db.getFirstAsync<{ source_hash: string }>('SELECT source_hash FROM vocabflow_dictionary_meta LIMIT 1') : null;
    if (cached?.source_hash !== DICTIONARY.sha256) {
      if (!allowDownload) {
        onStage?.('awaiting-consent');
        throw new DictionaryDownloadConsentRequired();
      }
      onStage?.('downloading');
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 180_000);
      let buffer: Uint8Array;
      try {
        const response = await fetch(dictionaryDownloadUrl(), { signal: abort.signal, credentials: 'omit' });
        if (!response.ok) throw new Error(`Tải từ điển thất bại (HTTP ${response.status}).`);
        buffer = new Uint8Array(await response.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
      onStage?.('verifying');
      if (buffer.byteLength !== DICTIONARY.bytes) throw new Error('Tệp từ điển chưa tải đủ. Hãy thử lại khi có mạng ổn định.');
      const hash = Array.from(sha256(buffer), value => value.toString(16).padStart(2, '0')).join('');
      if (hash !== DICTIONARY.sha256) throw new Error('Tệp từ điển không đúng phiên bản hoặc bị hỏng. Hãy tải lại.');
      const imported = await deserializeDatabaseAsync(buffer);
      try {
        const check = await imported.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
        if (check?.quick_check !== 'ok') throw new Error('Kho từ điển bị lỗi. Hãy tải lại.');
        await backupDatabaseAsync({ sourceDatabase: imported, destDatabase: db });
      } finally {
        await imported.closeAsync();
      }
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_vocabflow_words_nocase ON words(word COLLATE NOCASE, id);');
      const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM words');
      if (count?.count !== DICTIONARY.wordCount) throw new Error('Số lượng từ điển không khớp phiên bản đã kiểm tra.');
      await db.withTransactionAsync(async () => {
        await db.execAsync('CREATE TABLE IF NOT EXISTS vocabflow_dictionary_meta (source_hash TEXT NOT NULL); DELETE FROM vocabflow_dictionary_meta;');
        await db.runAsync('INSERT INTO vocabflow_dictionary_meta (source_hash) VALUES (?)', DICTIONARY.sha256);
      });
    }
    // No application query may mutate the reference dictionary after setup.
    await db.execAsync('PRAGMA query_only = ON;');
    // A persisted marker alone is insufficient if the file has become unreadable.
    await db.getFirstAsync('SELECT id FROM words LIMIT 1');
    onStage?.('ready');
    return db;
  } catch (failure) {
    await db.closeAsync();
    // Only this disposable reference cache is removed; never vocabflow.db.
    // A failed/partial import must be recoverable with the Retry button.
    if (!(failure instanceof DictionaryDownloadConsentRequired)) await deleteDatabaseAsync(filename);
    throw failure;
  }
}

export function openDictionary(onStage?: (stage: DictionaryStage) => void, options: { allowDownload?: boolean } = {}): Promise<SQLiteDatabase> {
  if (!connection) {
    connection = initialize(onStage, options.allowDownload === true).catch(failure => {
      connection = undefined;
      if (failure instanceof DictionaryDownloadConsentRequired) throw failure;
      const detail = failure instanceof Error ? failure.message : '';
      throw new Error(storageFailureMessage(failure,
        /từ điển|kho tra cứu/i.test(detail) ? detail
          : 'Không thể nạp kho từ điển. Lần đầu cần có mạng và đủ dung lượng trống. Hãy thử lại; sổ cá nhân không bị thay đổi.',
      ));
    });
  }
  return connection;
}

export async function searchDictionary(query: string, offset = 0) {
  return searchInDictionary(await openDictionary(), query, offset);
}
export async function getDictionaryEntry(id: number, offset = 0) {
  return entryInDictionary(await openDictionary(), id, offset);
}
export async function getDictionaryDraft(id: number, senseId: number) {
  return draftInDictionary(await openDictionary(), id, senseId);
}
