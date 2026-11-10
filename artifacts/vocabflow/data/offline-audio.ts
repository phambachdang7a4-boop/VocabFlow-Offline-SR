import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import {
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { OFFLINE_AUDIO_DICTIONARY } from "../domain/offline-audio";

let databaseConnection: Promise<SQLiteDatabase> | undefined;
let activePlayer: AudioPlayer | null = null;
let activeAudioFile: File | null = null;
let playbackGeneration = 0;
let activeDownload: AbortController | null = null;

function databaseFile(): File {
  return new File(Paths.document, "SQLite", OFFLINE_AUDIO_DICTIONARY.filename);
}

function getDownloadUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error("Không tìm thấy địa chỉ máy chủ để tải audio.");
  return `https://${domain}${OFFLINE_AUDIO_DICTIONARY.assetPath}`;
}

async function openAudioDatabase(): Promise<SQLiteDatabase> {
  const file = databaseFile();
  if (!file.exists || file.size !== OFFLINE_AUDIO_DICTIONARY.bytes) {
    throw new Error("Chưa cài kho audio offline hoặc tệp bị thiếu.");
  }
  if (!databaseConnection) {
    databaseConnection = openDatabaseAsync(OFFLINE_AUDIO_DICTIONARY.filename)
      .then(async (db) => {
        const entryCount = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM audio_dictionary_meta WHERE key = 'entry_count'",
        );
        if (Number(entryCount?.value) !== OFFLINE_AUDIO_DICTIONARY.entryCount) {
          await db.closeAsync();
          throw new Error("Kho audio offline bị lỗi. Hãy xóa và tải lại.");
        }
        await db.execAsync("PRAGMA query_only = ON;");
        return db;
      })
      .catch((error) => {
        databaseConnection = undefined;
        throw error;
      });
  }
  return databaseConnection;
}

export async function getOfflineAudioStatus(): Promise<{
  state: "missing" | "installed" | "damaged" | "unavailable";
  bytes: number;
}> {
  if (Platform.OS === "web") return { state: "unavailable", bytes: 0 };
  const file = databaseFile();
  if (!file.exists) return { state: "missing", bytes: 0 };
  const bytes = file.size ?? 0;
  if (bytes !== OFFLINE_AUDIO_DICTIONARY.bytes)
    return { state: "damaged", bytes };
  try {
    await openAudioDatabase();
    return { state: "installed", bytes };
  } catch {
    return { state: "damaged", bytes };
  }
}

export async function downloadOfflineAudio(
  onProgress?: (bytesWritten: number, totalBytes: number) => void,
): Promise<void> {
  if (Platform.OS === "web")
    throw new Error("Tải audio offline khả dụng trong ứng dụng Android.");
  if (activeDownload) throw new Error("Đang tải gói audio. Hãy đợi tải xong.");
  const destination = databaseFile();
  const controller = new AbortController();
  activeDownload = controller;
  try {
    const sqliteDirectory = new Directory(Paths.document, "SQLite");
    if (!sqliteDirectory.exists)
      sqliteDirectory.create({ intermediates: true, idempotent: true });
    if (destination.exists) destination.delete();
    const downloaded = await File.downloadFileAsync(
      getDownloadUrl(),
      destination,
      {
        idempotent: true,
        signal: controller.signal,
        onProgress: (progress) =>
          onProgress?.(progress.bytesWritten, progress.totalBytes),
      },
    );
    if (downloaded.size !== OFFLINE_AUDIO_DICTIONARY.bytes) {
      throw new Error(
        "Gói audio tải chưa đủ. Hãy thử lại với kết nối ổn định.",
      );
    }
    if (
      (await downloaded.digest("SHA-256")).toLowerCase() !==
      OFFLINE_AUDIO_DICTIONARY.sha256
    ) {
      throw new Error(
        "Gói audio không đúng phiên bản hoặc bị hỏng. Hãy tải lại.",
      );
    }
    databaseConnection = undefined;
    await openAudioDatabase();
  } catch (error) {
    databaseConnection = undefined;
    if (destination.exists) destination.delete();
    throw error;
  } finally {
    activeDownload = null;
  }
}

function stopActivePlayer(): void {
  const player = activePlayer;
  const audioFile = activeAudioFile;
  activePlayer = null;
  activeAudioFile = null;
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {
      // The player may have already been released during navigation.
    }
  }
  if (audioFile?.exists) audioFile.delete();
}

export function stopOfflineAudioPlayback(): void {
  playbackGeneration += 1;
  stopActivePlayer();
}

export async function playOfflineDictionaryAudio(
  entryId: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(entryId) || entryId <= 0 || Platform.OS === "web")
    return false;
  const request = ++playbackGeneration;
  try {
    const db = await openAudioDatabase();
    const row = await db.getFirstAsync<{ audio_opus: Uint8Array }>(
      "SELECT audio_opus FROM audio_dictionary WHERE entry_id = ?",
      entryId,
    );
    if (
      request !== playbackGeneration ||
      !(row?.audio_opus instanceof Uint8Array)
    )
      return false;

    stopActivePlayer();
    const directory = new Directory(Paths.cache, "vocabflow-pronunciation");
    if (!directory.exists)
      directory.create({ intermediates: true, idempotent: true });
    const audioFile = new File(directory, `${entryId}.opus`);
    if (audioFile.exists) audioFile.delete();
    audioFile.create({ intermediates: true, overwrite: true });
    await audioFile.write(row.audio_opus);

    if (request !== playbackGeneration) {
      audioFile.delete();
      return false;
    }
    const player = createAudioPlayer(
      { uri: audioFile.uri },
      { updateInterval: 250 },
    );
    activePlayer = player;
    activeAudioFile = audioFile;
    player.addListener("playbackStatusUpdate", (status) => {
      if ((status.didJustFinish || status.error) && activePlayer === player) {
        activePlayer = null;
        activeAudioFile = null;
        player.remove();
        if (audioFile.exists) audioFile.delete();
      }
    });
    player.play();
    return true;
  } catch {
    stopActivePlayer();
    return false;
  }
}

export async function deleteOfflineAudio(): Promise<void> {
  activeDownload?.abort();
  activeDownload = null;
  stopOfflineAudioPlayback();
  const current = databaseConnection;
  databaseConnection = undefined;
  if (current) {
    try {
      await (await current).closeAsync();
    } catch {
      // A failed or interrupted download may leave no open SQLite connection.
    }
  }
  const database = databaseFile();
  if (database.exists)
    await deleteDatabaseAsync(OFFLINE_AUDIO_DICTIONARY.filename);
  const cache = new Directory(Paths.cache, "vocabflow-pronunciation");
  if (cache.exists) cache.delete();
}
