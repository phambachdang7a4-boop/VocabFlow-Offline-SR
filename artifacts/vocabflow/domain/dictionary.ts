import type { WordInput } from '../data/types';
import { ALL_LOCAL_DICTIONARY_ADDITIONS } from './dictionary-local-additions';

const localAdditionTerms = new Set(
  ALL_LOCAL_DICTIONARY_ADDITIONS.map((item) =>
    item.term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'),
  ),
);

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
export type DictionaryStage = 'checking' | 'awaiting-consent' | 'downloading' | 'verifying' | 'importing' | 'indexing-courses' | 'ready';
export interface DictionaryCourseIndexSense {
  definition: string;
  example: string;
  pos: string | null;
  subPos: string | null;
}
export interface DictionaryCourseIndexTerm {
  term: string;
  courseIds: string[];
  senses?: DictionaryCourseIndexSense[];
}
export interface DictionaryCourseIndex {
  sourceSha256: string;
  contentSha256: string;
  courses: Array<{ id: string; title: string }>;
  terms: DictionaryCourseIndexTerm[];
}
export interface DictionaryMatch {
  id: number;
  term: string;
  meaning: string;
  courseTags?: string[];
}
export interface DictionarySuggestion { id: number; term: string }
export interface DictionarySense { id: number; definition: string; pos: string | null; subPos: string | null; example: string | null }
export interface DictionaryPronunciation { ipa: string; region: string | null }
export type PronunciationAccent = 'us' | 'uk';
export function pronunciationAccent(region: string | null): PronunciationAccent | null {
  const normalized = (region ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  if (['us', 'name', 'generalamerican', 'american'].includes(normalized)) return 'us';
  if (['uk', 'bre', 'receivedpronunciation', 'british'].includes(normalized)) return 'uk';
  return null;
}
export const DICTIONARY_PARTS = [
  { id: 'verb', label: 'Verb', viLabel: 'Động từ', codes: ['v', 'verb', 'vt', 'vi'] },
  // Proper names share the noun filter; the source's M (numeral) tag shares the
  // learner-facing determiner group because the dictionary has no separate numeral group.
  { id: 'noun', label: 'Noun', viLabel: 'Danh từ', codes: ['n', 'noun', 'name'] },
  { id: 'adjective', label: 'Adjective', viLabel: 'Tính từ', codes: ['a', 'adj', 'adjective'] },
  { id: 'adverb', label: 'Adverb', viLabel: 'Trạng từ', codes: ['d', 'adv', 'adverb'] },
  { id: 'preposition', label: 'Preposition', viLabel: 'Giới từ', codes: ['e', 'prep', 'preposition', 'prepositions'] },
  { id: 'determiner', label: 'Determiner', viLabel: 'Từ hạn định', codes: ['m', 'det', 'determiner', 'determiners', 'numeral', 'numerals'] },
  { id: 'conjunction', label: 'Conjunction', viLabel: 'Liên từ', codes: ['c', 'conj', 'conjunction', 'conjunctions'] },
  { id: 'idiom', label: 'Idiom', viLabel: 'Thành ngữ', codes: ['idiom', 'idioms'] },
  { id: 'other', label: 'Others', viLabel: 'Khác', codes: [] },
] as const;
export type DictionaryPartOfSpeech = typeof DICTIONARY_PARTS[number]['id'];
export function dictionaryPartOfSpeech(pos: string | null): DictionaryPartOfSpeech {
  const code = (pos ?? '').trim().toLowerCase();
  return DICTIONARY_PARTS.find(part => part.codes.some(value => value === code))?.id ?? 'other';
}
export function dictionaryPartOfSpeechLabel(
  pos: string | null,
  language: 'en' | 'vi' = 'en',
): string {
  const part = dictionaryPartOfSpeech(pos);
  return DICTIONARY_PARTS.find((item) => item.id === part)?.[
    language === 'vi' ? 'viLabel' : 'label'
  ] ?? 'Others';
}
export interface DictionaryEntry {
  id: number;
  term: string;
  pronunciations: DictionaryPronunciation[];
  senses: DictionarySense[];
  hasMore: boolean;
  partsOfSpeech: DictionaryPartOfSpeech[];
  courseTags?: string[];
}
export interface DictionaryMatches { items: DictionaryMatch[]; hasMore: boolean }

export function lookupPrefix(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
    .replace(/[\\%_]/g, '\\$&');
}

export function validDictionaryId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

export function formatDictionaryPronunciations(
  pronunciations: DictionaryPronunciation[],
): string {
  const unique = (region: PronunciationAccent | null) => [
    ...new Set(
      pronunciations
        .filter((item) => pronunciationAccent(item.region) === region)
        .map((item) => item.ipa.trim())
        .filter(Boolean),
    ),
  ];
  const us = unique("us");
  const uk = unique("uk");
  const others = pronunciations
    .filter((item) => pronunciationAccent(item.region) === null)
    .filter((item, index, rows) => rows.findIndex(
      (candidate) => candidate.ipa.trim() === item.ipa.trim() &&
        candidate.region === item.region,
    ) === index)
    .map((item) =>
      item.region ? `${item.region}: ${item.ipa.trim()}` : item.ipa.trim(),
    )
    .filter(Boolean);

  const regions =
    us.length && uk.length && us.join(" · ") === uk.join(" · ")
      ? [`Anh-Mỹ/Anh-Anh: ${us.join(" · ")}`]
      : [
          ...(us.length ? [`Anh-Mỹ: ${us.join(" · ")}`] : []),
          ...(uk.length ? [`Anh-Anh: ${uk.join(" · ")}`] : []),
        ];
  return [...regions, ...others].join(" · ").slice(0, 200);
}

export function mergeDictionaryPronunciations(
  base: DictionaryPronunciation[],
  supplemental: DictionaryPronunciation[],
): DictionaryPronunciation[] {
  const seen = new Set(
    base.map((item) => `${pronunciationAccent(item.region) ?? item.region ?? ""}|${item.ipa.trim()}`),
  );
  const additions = supplemental.filter((item) => {
    const key = `${pronunciationAccent(item.region) ?? item.region ?? ""}|${item.ipa.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...base, ...additions];
}

/** Preserve the source sentence verbatim; match whole headwords, not substrings. */
export function exampleSegments(example: string, term: string): { text: string; underline: boolean }[] {
  const headword = term.trim();
  if (!headword) return [{ text: example, underline: false }];
  const pattern = headword.split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const matches = new RegExp(pattern, 'giu');
  const segments: { text: string; underline: boolean }[] = [];
  let cursor = 0;
  for (const match of example.matchAll(matches)) {
    const start = match.index!;
    const end = start + match[0].length;
    if (/[\p{L}\p{N}\p{M}_]$/u.test(example.slice(0, start))
      || /^[\p{L}\p{N}\p{M}_]/u.test(example.slice(end))) continue;
    if (start > cursor) segments.push({ text: example.slice(cursor, start), underline: false });
    segments.push({ text: match[0], underline: true });
    cursor = end;
  }
  if (cursor < example.length) segments.push({ text: example.slice(cursor), underline: false });
  return segments.length ? segments : [{ text: example, underline: false }];
}

export function dictionaryDraft(entry: Pick<DictionaryEntry, 'id' | 'term' | 'pronunciations'>, sense: DictionarySense): WordInput {
  const kind = [
    dictionaryPartOfSpeechLabel(sense.pos),
    sense.subPos?.trim(),
  ].filter(Boolean).join(' · ');
  const isLocalAddition = localAdditionTerms.has(
    entry.term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'),
  );
  return {
    term: entry.term,
    dictionaryEntryId: entry.id,
    dictionarySenseId: sense.id,
    meaning: `(${kind}) ${sense.definition}`,
    ipa: formatDictionaryPronunciations(entry.pronunciations),
    example: sense.example ?? '',
    note: isLocalAddition
      ? 'Nguồn: Nội dung bổ sung biên soạn cho VocabFlow.'
      : `Nguồn: Skypedia / MinhQND, CC BY-SA 4.0. ${DICTIONARY.repository}`,
  };
}

/** Source IDs survive edits. Legacy/manual items can only be matched by their
 * actual saved meaning, never by the English headword alone. */
export function sameWordSense(left: WordInput, right: WordInput): boolean {
  if (left.dictionaryEntryId != null && left.dictionarySenseId != null &&
      right.dictionaryEntryId != null && right.dictionarySenseId != null) {
    return left.dictionaryEntryId === right.dictionaryEntryId && left.dictionarySenseId === right.dictionarySenseId;
  }
  const normalized = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
  return normalized(left.term) === normalized(right.term) && normalized(left.meaning) === normalized(right.meaning);
}
