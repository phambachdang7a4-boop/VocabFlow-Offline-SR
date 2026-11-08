import type { VocabularyWord } from '../data/types';
import { exampleSegments } from './dictionary';

export interface ReviewExercise {
  kind: 'meaning' | 'cloze' | 'multiple-choice';
  prompt: string;
  fallback: boolean;
  fallbackNote?: string;
  hint: string | null;
  choices?: string[];
}

// Tune these independently of SRS dates/levels. Always leave a character hidden.
export const LETTER_HINT_RATIOS = [0.65, 0.4, 0.2] as const;

export function displayReviewAnswer(value: string): string {
  return value.normalize('NFKC')
    // Android keyboards/browsers may use a zero-width space as a word separator.
    .replace(/[\u200B\uFEFF]/gu, ' ')
    // Remove invisible format controls that do not belong to an English answer.
    .replace(/\p{Cf}/gu, '')
    .replace(/[‘’]/g, "'").replace(/[‐‑–]/g, '-')
    .replace(/\p{White_Space}+/gu, ' ');
}

export function normalizeReviewAnswer(value: string): string {
  return displayReviewAnswer(value).trim().toLocaleLowerCase('en');
}

export function checkReviewAnswer(answer: string, term: string): boolean {
  const actual = normalizeReviewAnswer(answer);
  return !!actual && actual === normalizeReviewAnswer(term);
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.codePointAt(0)!, 16777619);
  return result >>> 0;
}

export function letterHint(word: Pick<VocabularyWord, 'id' | 'term' | 'level' | 'reviewCount'>): string | null {
  if (!Number.isInteger(word.level) || word.level < 1 || word.level > 6) throw new Error('Cấp ôn không hợp lệ.');
  if (word.level >= 4) return null;
  const characters = Array.from(word.term.normalize('NFKC'));
  const positions = characters.flatMap((char, index) => /[\p{L}\p{N}]/u.test(char) ? [index] : []);
  if (positions.length === 0) return null;
  // Enforce decreasing counts for words with >=3 letters; for very short words
  // the floor is zero rather than revealing the entire answer.
  const counts = [0, 0, 0];
  for (let tier = 2; tier >= 0; tier--) {
    const next = tier === 2 ? -1 : counts[tier + 1];
    counts[tier] = Math.max(0, Math.min(
      positions.length - tier - 1,
      Math.max(next + 1, Math.floor(positions.length * LETTER_HINT_RATIOS[tier])),
    ));
  }
  const count = counts[word.level - 1];
  const seed = `${word.id}:${word.reviewCount}:${word.term}`;
  const revealed = new Set([...positions].sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`) || a - b).slice(0, count));
  return characters.map((char, index) => /[\p{L}\p{N}]/u.test(char) && !revealed.has(index) ? '_' : char).join('');
}

/** All exact whole-word occurrences are blanked, including repeated matches.
 * An inflected form is not silently treated as the original saved answer. */
export function clozeSentence(example: string, term: string): string | null {
  if (!example.trim()) return null;
  const segments = exampleSegments(example, term);
  if (!segments.some(part => part.underline)) return null;
  return segments.map(part => part.underline ? '________' : part.text).join('');
}

function multipleChoiceOptions(
  word: VocabularyWord,
  notebookWords: readonly VocabularyWord[],
  seed: string,
): string[] | null {
  if (!notebookWords.some(candidate => candidate.id === word.id)) return null;
  const answer = normalizeReviewAnswer(word.term);
  const uniqueDistractors = new Map<string, string>();
  for (const candidate of notebookWords) {
    const key = normalizeReviewAnswer(candidate.term);
    if (!key || key === answer || uniqueDistractors.has(key)) continue;
    uniqueDistractors.set(key, candidate.term);
  }

  const orderedDistractors = [...uniqueDistractors.entries()]
    .sort(([left], [right]) => {
      const leftHash = hash(`${seed}:d:${left}`);
      const rightHash = hash(`${seed}:d:${right}`);
      return leftHash - rightHash || left.localeCompare(right);
    })
    .map(([, term]) => term);
  if (orderedDistractors.length < 2) return null;

  const options = [word.term, ...orderedDistractors.slice(0, 3)];
  return options.sort((left, right) => {
    const leftHash = hash(`${seed}:o:${normalizeReviewAnswer(left)}`);
    const rightHash = hash(`${seed}:o:${normalizeReviewAnswer(right)}`);
    return leftHash - rightHash || left.localeCompare(right);
  });
}

/** Meaning questions remain typed; sentence questions use notebook-only choices.
 * Missing examples or distractors fall back to the saved meaning. */
export function createReviewExercise(
  word: VocabularyWord,
  questionIndex: number,
  formatOffset = word.reviewCount,
  notebookWords: readonly VocabularyWord[] = [],
): ReviewExercise {
  if (!Number.isSafeInteger(questionIndex) || questionIndex < 0 || !Number.isSafeInteger(formatOffset) || formatOffset < 0) throw new Error('Câu ôn không hợp lệ.');
  const mode = (questionIndex + formatOffset) % 3;
  const wantsSentenceChoice = mode !== 0;
  const sentence = wantsSentenceChoice ? clozeSentence(word.example, word.term) : null;
  if (wantsSentenceChoice && sentence) {
    const choices = multipleChoiceOptions(
      word,
      notebookWords,
      `${word.id}:${word.reviewCount}:${questionIndex}:${formatOffset}`,
    );
    if (choices) return { kind: 'multiple-choice', prompt: sentence, fallback: false, hint: null, choices };
    return {
      kind: 'meaning',
      prompt: exampleSegments(word.meaning, word.term).map(part => part.underline ? '________' : part.text).join(''),
      fallback: true,
      fallbackNote: 'Cần ít nhất 3 từ trong Sổ từ để tạo trắc nghiệm; chuyển sang ôn theo nghĩa.',
      hint: letterHint(word),
    };
  }

  if (wantsSentenceChoice) {
    return {
      kind: 'meaning',
      prompt: exampleSegments(word.meaning, word.term).map(part => part.underline ? '________' : part.text).join(''),
      fallback: true,
      fallbackNote: 'Chưa có câu ví dụ phù hợp; chuyển sang ôn theo nghĩa.',
      hint: letterHint(word),
    };
  }

  return {
    kind: 'meaning',
    prompt: exampleSegments(word.meaning, word.term).map(part => part.underline ? '________' : part.text).join(''),
    fallback: false,
    hint: letterHint(word),
  };
}
