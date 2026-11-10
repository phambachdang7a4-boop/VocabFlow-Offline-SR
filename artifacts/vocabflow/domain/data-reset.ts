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
