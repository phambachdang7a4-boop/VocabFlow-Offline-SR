export interface WordInput {
  term: string;
  meaning: string;
  ipa: string;
  example: string;
  note: string;
}

export interface VocabularyWord extends WordInput {
  id: number;
  createdAt: string;
  updatedAt: string;
  reviewCount: number;
}
