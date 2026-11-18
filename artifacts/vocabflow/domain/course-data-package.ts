export const OFFLINE_COURSE_DATA = {
  version: 1,
  bytes: 10_716_186,
  sha256: "8cb5bc7796b11a6dd83a42f02a7e390cce8fa65f256ae593dd7d046f48b18f02",
  filename: "vocabflow-courses-v1.json",
  assetPath: "/api/courses/asset",
  objectKey: "vocabflow/course-data-v1-8cb5bc7796b11a6d.json",
  courseCount: 8,
} as const;

export const OFFLINE_COURSE_DATA_CHUNK_BYTES = 1024 * 1024;

export function courseDataResumeOffset(
  fileSize: number,
  totalBytes = OFFLINE_COURSE_DATA.bytes,
): number {
  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize < 0 ||
    !Number.isSafeInteger(totalBytes) ||
    totalBytes <= 0
  ) {
    throw new Error("Kích thước gói khóa học không hợp lệ.");
  }
  if (fileSize >= totalBytes) return fileSize === totalBytes ? totalBytes : 0;
  return Math.floor(fileSize / OFFLINE_COURSE_DATA_CHUNK_BYTES) *
    OFFLINE_COURSE_DATA_CHUNK_BYTES;
}
