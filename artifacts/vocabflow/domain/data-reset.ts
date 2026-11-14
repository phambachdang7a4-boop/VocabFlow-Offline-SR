export interface CloudResetResult {
  revision: number;
}

export async function resetCloudFirst(options: {
  replaceCloud: () => Promise<CloudResetResult>;
  clearLocal: (revision: number) => Promise<void>;
  clearOfflineResources: () => Promise<void>;
}): Promise<void> {
  const remote = await options.replaceCloud();
  if (!Number.isSafeInteger(remote.revision) || remote.revision < 0) {
    throw new Error("Máy chủ trả về phiên bản dữ liệu không hợp lệ.");
  }
  await options.clearLocal(remote.revision);
  await options.clearOfflineResources();
}

export async function resetLocalOnly(options: {
  currentRevision: number;
  clearLocal: (revision: number) => Promise<void>;
  clearOfflineResources: () => Promise<void>;
}): Promise<void> {
  if (
    !Number.isSafeInteger(options.currentRevision) ||
    options.currentRevision < 0 ||
    options.currentRevision >= Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("Phiên bản dữ liệu trên thiết bị không hợp lệ.");
  }
  await options.clearLocal(options.currentRevision + 1);
  await options.clearOfflineResources();
}
