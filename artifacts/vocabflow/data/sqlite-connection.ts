interface SQLiteAccess {
  opening: Promise<unknown>;
  ownership?: Promise<void>;
}

// Keep the queue/lock across Fast Refresh; acquiring a second lock in the same
// tab would otherwise lock the app out of its own OPFS files.
const runtime = globalThis as typeof globalThis & { __vocabflowSQLiteAccess?: SQLiteAccess };
const access = runtime.__vocabflowSQLiteAccess ??= { opening: Promise.resolve() };

async function acquireBrowserStorage(): Promise<void> {
  // Native SQLite does not use browser OPFS or Web Locks.
  if (typeof document === 'undefined' || !globalThis.navigator?.locks) return;
  if (!access.ownership) {
    access.ownership = new Promise<void>((resolve, reject) => {
      void navigator.locks.request('vocabflow-sqlite-storage', { ifAvailable: true }, async lock => {
        if (!lock) {
          reject(new Error('VocabFlow SQLite storage is locked by another tab.'));
          return;
        }
        resolve();
        // The SDK's OPFS access-handle pool owns the files for the worker's
        // lifetime. The browser releases this Web Lock when the tab closes.
        await new Promise<void>(() => {});
      }).catch(reject);
    }).catch(failure => {
      access.ownership = undefined;
      throw failure;
    });
  }
  await access.ownership;
}

export function openDatabaseSafely<T>(open: () => Promise<T>): Promise<T> {
  const result = access.opening.then(async () => {
    await acquireBrowserStorage();
    return open();
  });
  // A failed caller must not permanently reject the shared queue.
  access.opening = result.then(() => undefined, () => undefined);
  return result;
}

export function storageFailureMessage(failure: unknown, fallback: string): string {
  const detail = (failure instanceof Error ? failure.message : String(failure ?? '')).trim();
  const safe = detail.replace(/https?:\/\/[^\s"'<>]+/g, '[địa chỉ tài nguyên]').slice(0, 280);
  if (/Access.?Handle|NoModificationAllowed|another tab/i.test(detail)
    || (typeof document !== 'undefined' && /locked/i.test(detail))) {
    return 'SQLite đang bị khóa bởi một tab VocabFlow khác. Chỉ giữ một tab VocabFlow, đóng các tab còn lại rồi tải lại trang. Không xóa dữ liệu trình duyệt.';
  }
  if (/Invalid VFS state/i.test(detail)) {
    return 'SQLite của trình duyệt chưa khởi tạo được. Đóng các tab VocabFlow khác rồi tải lại trang này một lần. Không xóa dữ liệu trình duyệt.';
  }
  if (/navigator\.storage|getDirectory|SecurityError|storage.*denied|not allowed/i.test(detail)) {
    return `Trình duyệt chưa mở được vùng lưu trữ cục bộ. Hãy dùng tab Chrome thường và cho phép lưu dữ liệu trang web. Không xóa dữ liệu. Chi tiết: ${safe}`;
  }
  return safe && safe !== fallback ? `${fallback} Chi tiết: ${safe}` : fallback;
}
