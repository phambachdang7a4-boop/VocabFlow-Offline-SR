import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import {
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { Directory, File, FileMode, Paths } from "expo-file-system";
import { Platform } from "react-native";
import {
  OFFLINE_AUDIO_CHUNK_BYTES,
  OFFLINE_AUDIO_DICTIONARY,
  offlineAudioResumeOffset,
} from "../domain/offline-audio";

let databaseConnection: Promise<SQLiteDatabase> | undefined;
let activePlayer: AudioPlayer | null = null;
let activeAudioFile: File | null = null;
let playbackGeneration = 0;
let activeDownload: AbortController | null = null;
let activeDownloadTask: Promise<void> | null = null;
const AUDIO_CHUNK_TIMEOUT_MS = 20_000;

function databaseFile(): File {
  return new File(Paths.document, "SQLite", OFFLINE_AUDIO_DICTIONARY.filename);
}

function partialDatabaseFile(): File {
  return new File(
    Paths.document,
    "SQLite",
    `${OFFLINE_AUDIO_DICTIONARY.filename}.download`,
  );
}

function getDownloadUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error("Không tìm thấy địa chỉ máy chủ để tải audio.");
  return `https://${domain}${OFFLINE_AUDIO_DICTIONARY.assetPath}`;
}

function waitBeforeRetry(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Đã hủy tải gói audio."));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

async function downloadAudioChunk(
  url: string,
  start: number,
  end: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const expectedBytes = end - start + 1;
  let lastError = "máy chủ chưa trả dữ liệu";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (signal.aborted) throw new Error("Đã hủy tải gói audio.");
    const requestController = new AbortController();
    let timedOut = false;
    const abortRequest = () => requestController.abort();
    signal.addEventListener("abort", abortRequest, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      requestController.abort();
    }, AUDIO_CHUNK_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        credentials: "omit",
        cache: "no-store",
        signal: requestController.signal,
      });
      if (response.status !== 206) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(`máy chủ trả HTTP ${response.status}`);
      }
      const expectedRange = `bytes ${start}-${end}/${OFFLINE_AUDIO_DICTIONARY.bytes}`;
      if (response.headers.get("content-range") !== expectedRange) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error("máy chủ trả sai vị trí đoạn audio");
      }
      const chunk = new Uint8Array(await response.arrayBuffer());
      if (chunk.byteLength !== expectedBytes) {
        throw new Error("đoạn audio tải chưa đủ byte");
      }
      return chunk;
    } catch (error) {
      if (signal.aborted) throw new Error("Đã hủy tải gói audio.");
      lastError = timedOut
        ? `hết thời gian chờ ${AUDIO_CHUNK_TIMEOUT_MS / 1000} giây`
        : error instanceof Error
          ? error.message
          : String(error);
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abortRequest);
      if (!requestController.signal.aborted) requestController.abort();
    }
    if (attempt < 2) await waitBeforeRetry(400 * 2 ** attempt, signal);
  }

  throw new Error(
    `Không tải được đoạn audio ${start}-${end} sau 3 lần thử (${lastError}). Các đoạn đã tải vẫn được giữ lại; hãy tải lại để tiếp tục.`,
  );
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
  if (!file.exists) {
    const partial = partialDatabaseFile();
    return {
      state: "missing",
      bytes: partial.exists
        ? offlineAudioResumeOffset(
            partial.size ?? 0,
            OFFLINE_AUDIO_DICTIONARY.bytes,
          )
        : 0,
    };
  }
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
  signal?: AbortSignal,
  onStage?: (stage: "downloading" | "verifying" | "saving") => void,
): Promise<void> {
  if (Platform.OS === "web")
    throw new Error("Tải audio offline khả dụng trong ứng dụng Android.");
  if (activeDownload) throw new Error("Đang tải gói audio. Hãy đợi tải xong.");
  const destination = databaseFile();
  const downloadFile = partialDatabaseFile();
  const controller = new AbortController();
  activeDownload = controller;
  const abortDownload = () => controller.abort();
  signal?.addEventListener("abort", abortDownload, { once: true });
  const task = (async () => {
    if (signal?.aborted) controller.abort();
    const sqliteDirectory = new Directory(Paths.document, "SQLite");
    if (!sqliteDirectory.exists)
      sqliteDirectory.create({ intermediates: true, idempotent: true });
    if ((downloadFile.size ?? 0) > OFFLINE_AUDIO_DICTIONARY.bytes)
      downloadFile.delete();
    if (!downloadFile.exists)
      downloadFile.create({ intermediates: true, overwrite: true });

    let downloadedBytes = offlineAudioResumeOffset(
      downloadFile.size ?? 0,
      OFFLINE_AUDIO_DICTIONARY.bytes,
    );
    const destinationHandle = downloadFile.open(FileMode.ReadWrite);
    destinationHandle.offset = downloadedBytes;
    onProgress?.(downloadedBytes, OFFLINE_AUDIO_DICTIONARY.bytes);
    try {
      const url = getDownloadUrl();
      onStage?.("downloading");
      while (downloadedBytes < OFFLINE_AUDIO_DICTIONARY.bytes) {
        const start = downloadedBytes;
        const end = Math.min(
          start + OFFLINE_AUDIO_CHUNK_BYTES - 1,
          OFFLINE_AUDIO_DICTIONARY.bytes - 1,
        );
        const chunk = await downloadAudioChunk(
          url,
          start,
          end,
          controller.signal,
        );
        destinationHandle.offset = start;
        await destinationHandle.writeBytes(chunk);
        downloadedBytes = end + 1;
        onProgress?.(downloadedBytes, OFFLINE_AUDIO_DICTIONARY.bytes);
      }
    } finally {
      destinationHandle.close();
    }
    if (controller.signal.aborted) throw new Error("Đã hủy tải gói audio.");
    if (downloadFile.size !== OFFLINE_AUDIO_DICTIONARY.bytes) {
      throw new Error(
        "Gói audio tải chưa đủ. Phần đã tải được giữ lại; hãy thử tải tiếp.",
      );
    }
    onStage?.("verifying");
    if (
      (await downloadFile.digest("SHA-256")).toLowerCase() !==
      OFFLINE_AUDIO_DICTIONARY.sha256
    ) {
      downloadFile.delete();
      throw new Error(
        "Gói audio không đúng phiên bản hoặc bị hỏng. Hãy tải lại.",
      );
    }
    if (controller.signal.aborted) throw new Error("Đã hủy tải gói audio.");
    onStage?.("saving");
    if (destination.exists) destination.delete();
    await downloadFile.move(destination);
    databaseConnection = undefined;
    await openAudioDatabase();
  })();
  activeDownloadTask = task;
  try {
    await task;
  } catch (error) {
    databaseConnection = undefined;
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortDownload);
    if (activeDownload === controller) {
      activeDownload = null;
      activeDownloadTask = null;
    }
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
  const controller = activeDownload;
  const task = activeDownloadTask;
  controller?.abort();
  if (task) await task.catch(() => undefined);
  activeDownload = null;
  activeDownloadTask = null;
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
  if (Platform.OS === "web") {
    await deleteDatabaseAsync(OFFLINE_AUDIO_DICTIONARY.filename);
    return;
  }
  const database = databaseFile();
  if (database.exists)
    await deleteDatabaseAsync(OFFLINE_AUDIO_DICTIONARY.filename);
  const partial = partialDatabaseFile();
  if (partial.exists) partial.delete();
  const cache = new Directory(Paths.cache, "vocabflow-pronunciation");
  if (cache.exists) cache.delete();
}
