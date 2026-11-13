export interface CourseWordEntry {
  definition: string;
  example: string;
}

export interface SavedCourseWord {
  term: string;
  meaning: string;
}

export interface CourseWordCandidate {
  key: string;
  term: string;
  meaning: string;
  example: string;
  ipa: string;
  alreadySaved: boolean;
}

export function courseWordSelectionKey(term: string, meaning: string): string {
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return `${normalize(term)}\u0000${normalize(meaning)}`;
}

export function buildCourseWordCandidates(
  terms: readonly string[],
  entriesByTerm: ReadonlyMap<string, CourseWordEntry>,
  savedWords: readonly SavedCourseWord[],
): CourseWordCandidate[] {
  const savedKeys = new Set(
    savedWords.map((word) => courseWordSelectionKey(word.term, word.meaning)),
  );
  const candidates = new Map<string, CourseWordCandidate>();

  for (const term of terms) {
    const entry = entriesByTerm.get(term);
    if (!entry) continue;
    const meaning = entry.definition.trim();
    if (!meaning) continue;

    const key = courseWordSelectionKey(term, meaning);
    if (candidates.has(key)) continue;
    candidates.set(key, {
      key,
      term,
      meaning,
      example: entry.example.trim(),
      ipa: "",
      alreadySaved: savedKeys.has(key),
    });
  }

  return [...candidates.values()];
}
