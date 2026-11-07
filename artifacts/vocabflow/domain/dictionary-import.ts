/**
 * sqlite3_deserialize cannot read a WAL-mode database without its sidecars.
 * After the original download has passed size/SHA-256 verification, normalize
 * only the journal format bytes on a private import copy. No row data changes.
 */
export function dictionaryImportBytes(verifiedSource: Uint8Array): Uint8Array {
  const magic = 'SQLite format 3\0';
  if (verifiedSource.length < 100
    || !Array.from(magic).every((character, index) => verifiedSource[index] === character.charCodeAt(0))) {
    throw new Error('Tệp từ điển không có phần đầu SQLite hợp lệ.');
  }
  const writeVersion = verifiedSource[18];
  const readVersion = verifiedSource[19];
  if (![1, 2].includes(writeVersion) || ![1, 2].includes(readVersion)) {
    throw new Error('Tệp từ điển dùng định dạng nhật ký SQLite không được hỗ trợ.');
  }
  if (writeVersion === 1 && readVersion === 1) return verifiedSource;
  const importCopy = verifiedSource.slice();
  importCopy[18] = 1;
  importCopy[19] = 1;
  return importCopy;
}
