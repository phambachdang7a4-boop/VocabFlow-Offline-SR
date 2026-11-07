import type { WordInput } from '../data/types';

export const DICTIONARY = {
  commit: '388adc0826300912e5b0311c089e0e70494b065f',
  sha256: '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a',
  bytes: 44212224,
  wordCount: 104829,
  definitionCount: 158307,
  linkCount: 175735,
  repository: 'https://github.com/skypediacode/english-vietnamese-dictionary',
} as const;

export const DICTIONARY_PAGE_SIZE = 30;
export const DICTIONARY_ASSET_PATH = '/api/dictionary/asset';
export type DictionaryStage = 'checking' | 'awaiting-consent' | 'downloading' | 'verifying' | 'ready';
export interface DictionaryMatch { id: number; term: string; meaning: string }
export interface DictionarySense { id: number; definition: string; pos: string | null; subPos: string | null; example: string | null }
export interface DictionaryPronunciation { ipa: string; region: string | null }
export interface DictionaryEntry {
  id: number;
  term: string;
  pronunciations: DictionaryPronunciation[];
  senses: DictionarySense[];
  hasMore: boolean;
}
export interface DictionaryMatches { items: DictionaryMatch[]; hasMore: boolean }

export function lookupPrefix(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
    .replace(/[\\%_]/g, '\\$&');
}

export function validDictionaryId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

export function dictionaryDraft(entry: Pick<DictionaryEntry, 'term' | 'pronunciations'>, sense: DictionarySense): WordInput {
  const kind = [sense.pos, sense.subPos].filter(Boolean).join(' · ');
  return {
    term: entry.term,
    meaning: `${kind ? `(${kind}) ` : ''}${sense.definition}`,
    ipa: entry.pronunciations[0]?.ipa ?? '',
    example: sense.example ?? '',
    note: `Nguồn: Skypedia / MinhQND, CC BY-SA 4.0. ${DICTIONARY.repository}`,
  };
}
