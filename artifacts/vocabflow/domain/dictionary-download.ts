import { DICTIONARY } from './dictionary';
import { publicDataAssetUrl } from './public-data-asset-url';

/** Public reference data must not depend on a private preview's login cookies.
 * Pin the original file by commit; the loader also verifies its full SHA-256. */
export function dictionaryDownloadUrl(): string {
  return publicDataAssetUrl(
    DICTIONARY.objectKey,
    `https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/${DICTIONARY.commit}/dictionary_en_vi.db`,
  );
}
