import type { VocabularyWord } from '../data/types';

export const WORD_MATCH_BATCH_SIZE = 5;

export type WordMatchSide = 'term' | 'meaning';

export interface WordMatchGameState {
  queue: VocabularyWord[];
  active: VocabularyWord[];
  termOrder: number[];
  meaningOrder: number[];
  matchedIds: number[];
  selectedTermId: number | null;
  selectedMeaningId: number | null;
  mistakes: number;
  correctCount: number;
  lastWrongTermId: number | null;
  lastWrongMeaningId: number | null;
}

export interface WordMatchSelection {
  state: WordMatchGameState;
  result: 'selected' | 'incorrect' | 'correct' | 'ignored';
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function shuffledIds(words: readonly VocabularyWord[], random: () => number): number[] {
  return shuffle(words.map(word => word.id), random);
}

export function createWordMatchGame(
  words: readonly VocabularyWord[],
  random: () => number = Math.random,
): WordMatchGameState {
  const unique = [...new Map(words.map(word => [word.id, word])).values()];
  const active = unique.slice(0, WORD_MATCH_BATCH_SIZE);
  const queue = unique.slice(WORD_MATCH_BATCH_SIZE);
  return {
    queue,
    active,
    termOrder: shuffledIds(active, random),
    meaningOrder: shuffledIds(active, random),
    matchedIds: [],
    selectedTermId: null,
    selectedMeaningId: null,
    mistakes: 0,
    correctCount: 0,
    lastWrongTermId: null,
    lastWrongMeaningId: null,
  };
}

export function selectWordMatch(
  current: WordMatchGameState,
  side: WordMatchSide,
  id: number,
  random: () => number = Math.random,
): WordMatchSelection {
  if (!current.active.some(word => word.id === id)) return { state: current, result: 'ignored' };

  const selected = side === 'term' ? current.selectedTermId : current.selectedMeaningId;
  if (selected === id) {
    return {
      state: {
        ...current,
        selectedTermId: side === 'term' ? null : current.selectedTermId,
        selectedMeaningId: side === 'meaning' ? null : current.selectedMeaningId,
        lastWrongTermId: null,
        lastWrongMeaningId: null,
      },
      result: 'selected',
    };
  }

  const selectedTermId = side === 'term' ? id : current.selectedTermId;
  const selectedMeaningId = side === 'meaning' ? id : current.selectedMeaningId;
  if (selectedTermId === null || selectedMeaningId === null) {
    return {
      state: {
        ...current,
        selectedTermId,
        selectedMeaningId,
        lastWrongTermId: null,
        lastWrongMeaningId: null,
      },
      result: 'selected',
    };
  }

  if (selectedTermId !== selectedMeaningId) {
    return {
      state: {
        ...current,
        selectedTermId: null,
        selectedMeaningId: null,
        mistakes: current.mistakes + 1,
        lastWrongTermId: selectedTermId,
        lastWrongMeaningId: selectedMeaningId,
      },
      result: 'incorrect',
    };
  }

  const remaining = current.active.filter(word => word.id !== selectedTermId);
  const nextWord = current.queue[0];
  const active = nextWord ? [...remaining, nextWord] : remaining;
  return {
    state: {
      ...current,
      queue: nextWord ? current.queue.slice(1) : current.queue,
      active,
      termOrder: shuffledIds(active, random),
      meaningOrder: shuffledIds(active, random),
      matchedIds: [...current.matchedIds, selectedTermId],
      selectedTermId: null,
      selectedMeaningId: null,
      correctCount: current.correctCount + 1,
      lastWrongTermId: null,
      lastWrongMeaningId: null,
    },
    result: 'correct',
  };
}
