export const OFFLINE_AUDIO_DICTIONARY = {
  sha256: "b3821cbbe15ee0e42dad72867a14202adbcefae2ed1e1712e24fcc9c389f4acc",
  bytes: 321847296,
  entryCount: 104829,
  filename: "vocabflow-audio-dictionary-b3821cbbe15ee0e4.db",
  objectKey: "vocabflow/audio-dictionary-b3821cbbe15ee0e4.db",
  assetPath: "/api/dictionary/audio",
} as const;

// The API serves byte ranges from one verified asset; each request downloads 4 MiB.
export const OFFLINE_AUDIO_CHUNK_BYTES = 4 * 1024 * 1024;

export function offlineAudioResumeOffset(
  fileSize: number,
  totalBytes = OFFLINE_AUDIO_DICTIONARY.bytes,
): number {
  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize < 0 ||
    !Number.isSafeInteger(totalBytes) ||
    totalBytes <= 0
  ) {
    throw new Error("Kích thước gói audio không hợp lệ.");
  }
  if (fileSize >= totalBytes) return fileSize === totalBytes ? totalBytes : 0;
  return Math.floor(fileSize / OFFLINE_AUDIO_CHUNK_BYTES) * OFFLINE_AUDIO_CHUNK_BYTES;
}
