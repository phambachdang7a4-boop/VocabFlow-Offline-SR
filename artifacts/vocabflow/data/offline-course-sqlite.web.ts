import type {
  OfflineCourseBundle,
  OfflineCourseDictionaryIndexData,
} from "./offline-course-data";

export async function getBundledCourseDataStatus(): Promise<{
  state: "unavailable";
  bytes: 0;
}> {
  return { state: "unavailable", bytes: 0 };
}

export async function getBundledOfflineCourseBundle(): Promise<OfflineCourseBundle> {
  throw new Error("Gói SQLite khóa học chỉ khả dụng trong ứng dụng.");
}

export function getBundledCourseDictionaryIndexRevision(): string {
  return "";
}

export async function getBundledCourseDictionaryIndexData(): Promise<OfflineCourseDictionaryIndexData> {
  throw new Error("Gói SQLite khóa học chỉ khả dụng trong ứng dụng.");
}

export function clearBundledOfflineCourseBundleCache(): void {}
