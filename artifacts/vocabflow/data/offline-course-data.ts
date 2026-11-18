import { sha256 } from "@noble/hashes/sha2.js";
import { Directory, File, FileMode, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { DictionaryCourseIndex } from "../domain/dictionary";
import { setOfflineCourseExampleTranslations } from "../domain/review-result-details";
import {
  OFFLINE_COURSE_DATA,
  OFFLINE_COURSE_DATA_CHUNK_BYTES,
  courseDataResumeOffset,
} from "../domain/course-data-package";

export type OfflineCourseQuestion = {
  term: string;
  prompt: string;
  choices: readonly string[];
  dialoguePrompt?: string;
};

export type OfflineCourseLesson = {
  id: string;
  title: string;
  focus: string;
  topicId?: string;
  topicTitle?: string;
  chapterId?: string;
  chapterTitle?: string;
  chapterNumber?: number;
  questions: readonly OfflineCourseQuestion[];
};

export type OfflineCourseEntry = {
  definition: string;
  example: string;
  exampleTranslation?: string;
  spellingNote?: string;
  partOfSpeech?: string;
};

export type OfflineCourse = {
  id: string;
  title: string;
  description: string;
  lessons: readonly OfflineCourseLesson[];
  entriesByTerm: Readonly<Record<string, OfflineCourseEntry>>;
  wordCount?: number;
  unitLabel?: string;
  topicCount?: number;
  progressPrefixes?: readonly string[];
};

export type OfflineCourseBundle = {
  formatVersion: number;
  dictionaryIndex: DictionaryCourseIndex;
  ieltsAttemptMigration: {
    originalLessonTerms: Readonly<Record<string, readonly string[]>>;
    standardTerms: readonly string[];
    advancedSourceLessonIds: Readonly<Record<string, readonly string[]>>;
  };
  sentenceStructureDistractorExplanations: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  courses: readonly OfflineCourse[];
};

type CourseChunkRecord = { offset: number; bytes: Uint8Array };
type CourseBundleRecord = { id: "bundle"; bytes: Uint8Array };

let activeDownload = false;
let installedBundle:
  | { fileSize: number; data: OfflineCourseBundle }
  | undefined;
let indexedDbConnection: Promise<IDBDatabase> | undefined;

function isValidCourseBundle(value: unknown): value is OfflineCourseBundle {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OfflineCourseBundle>;
  const courses = candidate.courses;
  if (!Array.isArray(courses)) return false;
  const typedCourses = courses as OfflineCourse[];
  return (
    candidate.formatVersion === OFFLINE_COURSE_DATA.version &&
    typedCourses.length === OFFLINE_COURSE_DATA.courseCount &&
    Boolean(candidate.dictionaryIndex?.contentSha256) &&
    typedCourses.every(
      (course) =>
        typeof course.id === "string" &&
        typeof course.title === "string" &&
        Array.isArray(course.lessons) &&
        course.lessons.length > 0 &&
        Boolean(course.entriesByTerm) &&
        course.lessons.every(
          (lesson) =>
            Array.isArray(lesson.questions) &&
            (lesson.questions as readonly OfflineCourseQuestion[]).every(
              (question) =>
                typeof question.term === "string" &&
                Array.isArray(question.choices) &&
                Boolean(course.entriesByTerm?.[question.term]),
            ),
        ),
    )
  );
}

export function parseOfflineCourseBundle(
  serialized: string,
): OfflineCourseBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Gói khóa học không phải JSON hợp lệ. Hãy tải lại.");
  }
  if (!isValidCourseBundle(parsed)) {
    throw new Error(
      "Gói khóa học thiếu dữ liệu hoặc không đúng phiên bản. Hãy tải lại.",
    );
  }
  return parsed;
}

function sha256Hex(bytes: Uint8Array): string {
  return Array.from(sha256(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function packageUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) throw new Error("Không tìm thấy máy chủ tải khóa học.");
  return new URL(
    OFFLINE_COURSE_DATA.assetPath,
    `https://${domain}`,
  ).toString();
}

function nativePackageFile(): File {
  return new File(Paths.document, OFFLINE_COURSE_DATA.filename);
}

function nativePartialFile(): File {
  return new File(
    Paths.document,
    `${OFFLINE_COURSE_DATA.filename}.download`,
  );
}

function getIndexedDb(): Promise<IDBDatabase> {
  if (Platform.OS !== "web" || typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("Lưu dữ liệu khóa học ngoại tuyến không khả dụng."),
    );
  }
  if (!indexedDbConnection) {
    indexedDbConnection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("vocabflow-offline-courses", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("bundle", { keyPath: "id" });
        database.createObjectStore("chunks", { keyPath: "offset" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Không mở được dữ liệu khóa học."));
      request.onblocked = () =>
        reject(
          new Error(
            "Dữ liệu khóa học đang được dùng ở thẻ khác. Đóng thẻ còn lại rồi thử lại.",
          ),
        );
    }).catch((error) => {
      indexedDbConnection = undefined;
      throw error;
    });
  }
  return indexedDbConnection;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Không lưu được dữ liệu khóa học."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Đã hủy lưu dữ liệu khóa học."));
  });
}

async function clearWebChunks(): Promise<void> {
  const database = await getIndexedDb();
  const transaction = database.transaction("chunks", "readwrite");
  transaction.objectStore("chunks").clear();
  await transactionDone(transaction);
}

async function discardWebChunksFrom(offset: number): Promise<void> {
  const database = await getIndexedDb();
  const transaction = database.transaction("chunks", "readwrite");
  const store = transaction.objectStore("chunks");
  const request = store.getAll();
  request.onsuccess = () => {
    for (const chunk of request.result as CourseChunkRecord[]) {
      if (chunk.offset + chunk.bytes.byteLength > offset) {
        store.delete(chunk.offset);
      }
    }
  };
  await transactionDone(transaction);
}

async function readWebBundleBytes(): Promise<Uint8Array | null> {
  const database = await getIndexedDb();
  const transaction = database.transaction("bundle", "readonly");
  const record = await new Promise<CourseBundleRecord | undefined>(
    (resolve, reject) => {
      const request = transaction.objectStore("bundle").get("bundle");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Không đọc được gói khóa học."));
    },
  );
  return record?.bytes ?? null;
}

async function readWebChunks(): Promise<CourseChunkRecord[]> {
  const database = await getIndexedDb();
  const transaction = database.transaction("chunks", "readonly");
  return new Promise((resolve, reject) => {
    const request = transaction.objectStore("chunks").getAll();
    request.onsuccess = () => resolve(request.result as CourseChunkRecord[]);
    request.onerror = () =>
      reject(request.error ?? new Error("Không đọc được phần tải khóa học."));
  });
}

async function writeWebChunk(offset: number, bytes: Uint8Array): Promise<void> {
  const database = await getIndexedDb();
  const transaction = database.transaction("chunks", "readwrite");
  transaction.objectStore("chunks").put({ offset, bytes });
  await transactionDone(transaction);
}

async function readInstalledBundle(
  bytes: Uint8Array,
): Promise<OfflineCourseBundle> {
  if (bytes.byteLength !== OFFLINE_COURSE_DATA.bytes) {
    throw new Error("Gói khóa học bị thiếu hoặc hỏng. Hãy tải lại.");
  }
  if (sha256Hex(bytes) !== OFFLINE_COURSE_DATA.sha256) {
    throw new Error("Gói khóa học không đúng phiên bản. Hãy tải lại.");
  }
  const bundle = parseOfflineCourseBundle(new TextDecoder().decode(bytes));
  const translations: [string, string][] = [];
  for (const course of bundle.courses) {
    for (const entry of Object.values(course.entriesByTerm)) {
      if (entry.example?.trim() && entry.exampleTranslation?.trim()) {
        translations.push([entry.example, entry.exampleTranslation]);
      }
    }
  }
  setOfflineCourseExampleTranslations(translations);
  return bundle;
}

export async function getOfflineCourseBundle(): Promise<OfflineCourseBundle | null> {
  if (
    installedBundle?.fileSize === OFFLINE_COURSE_DATA.bytes
  ) {
    return installedBundle.data;
  }
  try {
    let bytes: Uint8Array | null;
    if (Platform.OS === "web") {
      bytes = await readWebBundleBytes();
    } else {
      const file = nativePackageFile();
      if (!file.exists) return null;
      bytes = await file.bytes();
    }
    if (!bytes) return null;
    const data = await readInstalledBundle(bytes);
    installedBundle = { fileSize: bytes.byteLength, data };
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("bị thiếu hoặc hỏng")) {
      throw error;
    }
    throw error;
  }
}

export async function getOfflineCourseDataStatus(): Promise<{
  state:
    | "missing"
    | "installed"
    | "updateAvailable"
    | "damaged"
    | "unavailable";
  bytes: number;
}> {
  try {
    if (Platform.OS === "web") {
      const [bundle, chunks] = await Promise.all([
        readWebBundleBytes(),
        readWebChunks(),
      ]);
      if (!bundle) {
        const contiguousBytes = chunks
          .sort((left, right) => left.offset - right.offset)
          .reduce((total, chunk) =>
            chunk.offset === total ? total + chunk.bytes.byteLength : total,
          0);
        return {
          state: "missing",
          bytes: Math.min(contiguousBytes, OFFLINE_COURSE_DATA.bytes),
        };
      }
      try {
        await readInstalledBundle(bundle);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("không đúng phiên bản")
        ) {
          return { state: "updateAvailable", bytes: bundle.byteLength };
        }
        throw error;
      }
      return { state: "installed", bytes: bundle.byteLength };
    }

    const file = nativePackageFile();
    if (!file.exists) {
      const partial = nativePartialFile();
      return { state: "missing", bytes: partial.exists ? partial.size ?? 0 : 0 };
    }
    try {
      const data = await getOfflineCourseBundle();
      return data
        ? { state: "installed", bytes: OFFLINE_COURSE_DATA.bytes }
        : { state: "damaged", bytes: file.size ?? 0 };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("không đúng phiên bản")
      ) {
        return { state: "updateAvailable", bytes: file.size ?? 0 };
      }
      throw error;
    }
  } catch (error) {
    return {
      state:
        error instanceof Error &&
        /not available|không khả dụng|blocked|không mở được dữ liệu/i.test(
          error.message,
        )
          ? "unavailable"
          : "damaged",
      bytes: 0,
    };
  }
}

async function fetchCourseChunk(
  url: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  let lastError = "máy chủ chưa trả dữ liệu";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (signal?.aborted) throw new Error("Đã hủy tải gói khóa học.");
      const response = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        credentials: "omit",
        cache: "no-store",
        signal,
      });
      if (response.status !== 206) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(`máy chủ trả HTTP ${response.status}`);
      }
      const version = response.headers.get("x-course-data-version");
      const checksum = response.headers.get("x-course-data-sha256");
      if (
        version !== String(OFFLINE_COURSE_DATA.version) ||
        checksum?.toLowerCase() !== OFFLINE_COURSE_DATA.sha256
      ) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error("Máy chủ trả về phiên bản gói khóa học không khớp.");
      }
      const expectedRange = `bytes ${start}-${end}/${OFFLINE_COURSE_DATA.bytes}`;
      const actualRange = response.headers.get("content-range");
      if (actualRange !== null && actualRange !== expectedRange) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error("máy chủ trả sai vị trí đoạn dữ liệu khóa học");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== end - start + 1) {
        throw new Error("đoạn dữ liệu khóa học tải chưa đủ byte");
      }
      return bytes;
    } catch (error) {
      if (signal?.aborted) {
        throw new Error("Đã hủy tải gói khóa học.");
      }
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt));
      }
    }
  }
  throw new Error(
    `Không tải được gói khóa học (${lastError}). Phần đã tải vẫn được giữ để thử lại.`,
  );
}

function contiguousWebBytes(chunks: CourseChunkRecord[]): number {
  let offset = 0;
  for (const chunk of chunks.sort((left, right) => left.offset - right.offset)) {
    if (chunk.offset !== offset) break;
    offset += chunk.bytes.byteLength;
  }
  return courseDataResumeOffset(offset);
}

async function assembleWebBundle(
  chunks: CourseChunkRecord[],
): Promise<Uint8Array> {
  const bytes = new Uint8Array(OFFLINE_COURSE_DATA.bytes);
  let expectedOffset = 0;
  for (const chunk of chunks.sort((left, right) => left.offset - right.offset)) {
    if (
      chunk.offset !== expectedOffset ||
      chunk.offset + chunk.bytes.byteLength > bytes.byteLength
    ) {
      throw new Error("Gói khóa học tải chưa đủ hoặc bị trùng đoạn. Hãy thử lại.");
    }
    bytes.set(chunk.bytes, chunk.offset);
    expectedOffset += chunk.bytes.byteLength;
  }
  if (expectedOffset !== bytes.byteLength) {
    throw new Error("Gói khóa học tải chưa đủ. Hãy thử lại.");
  }
  return bytes;
}

async function installWebBundle(bytes: Uint8Array): Promise<void> {
  const database = await getIndexedDb();
  const transaction = database.transaction(
    ["bundle", "chunks"],
    "readwrite",
  );
  transaction.objectStore("bundle").put({ id: "bundle", bytes });
  transaction.objectStore("chunks").clear();
  await transactionDone(transaction);
}

export async function downloadOfflineCourseData(
  onProgress?: (bytesWritten: number, totalBytes: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (activeDownload) throw new Error("Đang tải dữ liệu khóa học. Hãy đợi.");
  activeDownload = true;
  try {
    if (signal?.aborted) throw new Error("Đã hủy tải gói khóa học.");
    const url = packageUrl();
    let downloadedBytes = 0;
    let nativeFile: File | null = null;
    let nativeHandle: ReturnType<File["open"]> | null = null;
    let webChunks: CourseChunkRecord[] = [];

    if (Platform.OS === "web") {
      webChunks = await readWebChunks();
      downloadedBytes = contiguousWebBytes(webChunks);
      await discardWebChunksFrom(downloadedBytes);
      webChunks = webChunks.filter(
        (chunk) => chunk.offset + chunk.bytes.byteLength <= downloadedBytes,
      );
    } else {
      const directory = new Directory(Paths.document);
      if (!directory.exists) directory.create({ intermediates: true });
      nativeFile = nativePartialFile();
      if ((nativeFile.size ?? 0) > OFFLINE_COURSE_DATA.bytes) {
        nativeFile.delete();
      }
      if (!nativeFile.exists) {
        nativeFile.create({ intermediates: true, overwrite: true });
      }
      downloadedBytes = courseDataResumeOffset(
        nativeFile.size ?? 0,
      );
      nativeHandle = nativeFile.open(FileMode.ReadWrite);
      nativeHandle.offset = downloadedBytes;
    }

    onProgress?.(downloadedBytes, OFFLINE_COURSE_DATA.bytes);
    try {
      while (downloadedBytes < OFFLINE_COURSE_DATA.bytes) {
        const start = downloadedBytes;
        const end = Math.min(
          start + OFFLINE_COURSE_DATA_CHUNK_BYTES - 1,
          OFFLINE_COURSE_DATA.bytes - 1,
        );
        const chunk = await fetchCourseChunk(url, start, end, signal);
        if (Platform.OS === "web") {
          await writeWebChunk(start, chunk);
          webChunks.push({ offset: start, bytes: chunk });
        } else {
          if (!nativeHandle) throw new Error("Tệp khóa học chưa được mở.");
          nativeHandle.offset = start;
          await nativeHandle.writeBytes(chunk);
        }
        downloadedBytes = end + 1;
        onProgress?.(downloadedBytes, OFFLINE_COURSE_DATA.bytes);
      }
    } finally {
      nativeHandle?.close();
    }
    if (signal?.aborted) throw new Error("Đã hủy tải gói khóa học.");

    let bytes: Uint8Array;
    if (Platform.OS === "web") {
      const storedChunks = await readWebChunks();
      bytes = await assembleWebBundle(storedChunks);
    } else {
      if (!nativeFile) throw new Error("Không tìm thấy tệp khóa học tạm.");
      if (nativeFile.size !== OFFLINE_COURSE_DATA.bytes) {
        throw new Error("Gói khóa học tải chưa đủ. Hãy thử lại.");
      }
      const digest = await nativeFile.digest("SHA-256");
      if (digest.toLowerCase() !== OFFLINE_COURSE_DATA.sha256) {
        nativeFile.delete();
        throw new Error(
          "Gói khóa học không đúng phiên bản hoặc bị hỏng. Hãy tải lại.",
        );
      }
      bytes = await nativeFile.bytes();
    }
    const bundle = await readInstalledBundle(bytes);
    if (signal?.aborted) throw new Error("Đã hủy tải gói khóa học.");
    if (Platform.OS === "web") {
      await installWebBundle(bytes);
    } else {
      const destination = nativePackageFile();
      if (destination.exists) destination.delete();
      if (!nativeFile) throw new Error("Không tìm thấy tệp khóa học tạm.");
      await nativeFile.move(destination);
    }
    installedBundle = { fileSize: bytes.byteLength, data: bundle };
  } catch (error) {
    if (
      error instanceof Error &&
      /phiên bản|tải chưa đủ|bị trùng đoạn|JSON hợp lệ|thiếu dữ liệu/i.test(
        error.message,
      )
    ) {
      if (Platform.OS === "web") {
        await clearWebChunks().catch(() => undefined);
      } else {
        const partial = nativePartialFile();
        if (partial.exists) partial.delete();
      }
    }
    throw error;
  } finally {
    activeDownload = false;
  }
}

export async function deleteOfflineCourseData(): Promise<void> {
  installedBundle = undefined;
  setOfflineCourseExampleTranslations(null);
  if (Platform.OS === "web") {
    const database = await getIndexedDb();
    const transaction = database.transaction(
      ["bundle", "chunks"],
      "readwrite",
    );
    transaction.objectStore("bundle").clear();
    transaction.objectStore("chunks").clear();
    await transactionDone(transaction);
    return;
  }
  const current = nativePackageFile();
  const partial = nativePartialFile();
  if (current.exists) current.delete();
  if (partial.exists) partial.delete();
}

export function clearOfflineCourseDataMemoryCache(): void {
  installedBundle = undefined;
  setOfflineCourseExampleTranslations(null);
}
