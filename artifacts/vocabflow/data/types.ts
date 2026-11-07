import type { SrsProgress } from '../domain/srs';

export interface WordInput {
  term: string;
  meaning: string;
  ipa: string;
  example: string;
  note: string;
  dictionaryEntryId?: number | null;
  dictionarySenseId?: number | null;
}

export interface VocabularyWord extends WordInput, SrsProgress {
  id: number;
  createdAt: string;
  updatedAt: string;
}
