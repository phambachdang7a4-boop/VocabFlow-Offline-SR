import type { VocabularyWord } from "@/data/types";
import { fold } from "@/utils/text";

export function filterNotebookWords(
  words: readonly VocabularyWord[],
  query: string,
  selectedLevel: number | null,
): VocabularyWord[] {
  const foldedQuery = fold(query);
  return words.filter(
    (word) =>
      !word.frozen &&
      (selectedLevel === null || word.level === selectedLevel) &&
      (!foldedQuery ||
        [word.term, word.meaning, word.example].some((text) =>
          fold(text ?? "").includes(foldedQuery),
        )),
  );
}
