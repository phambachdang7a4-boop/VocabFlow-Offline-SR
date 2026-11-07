import type { DictionarySuggestion } from './dictionary';

export const SUGGESTION_LIMIT = 10;
export const SPELLING_VARIANT_LIMIT = 1024;

export function suggestionTerm(input: string): string {
  if (input.length > 200) throw new Error('Từ tra cứu tối đa 200 ký tự.');
  return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

export function canSuggest(term: string): boolean {
  return term.length >= 2 && term.length <= 32 && /^[a-z][a-z '-]*$/.test(term);
}

/** Bounded edit-one probes use the existing NOCASE index, including typos in
 * the first letter. No extra dictionary download, table or full-word scan. */
export function spellingVariants(term: string): string[] {
  const variants = new Set<string>([term]);
  const add = (value: string) => {
    if (value.trim() && variants.size < SPELLING_VARIANT_LIMIT) variants.add(value);
  };
  for (let i = 0; i < term.length; i++) {
    add(term.slice(0, i) + term.slice(i + 1));
    if (i + 1 < term.length) {
      add(term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2));
    }
  }
  const alphabet = "abcdefghijklmnopqrstuvwxyz'- ";
  for (let i = 0; i < term.length; i++) {
    for (const letter of alphabet) add(term.slice(0, i) + letter + term.slice(i + 1));
  }
  for (let i = 0; i <= term.length; i++) {
    for (const letter of alphabet) add(term.slice(0, i) + letter + term.slice(i));
  }
  return [...variants];
}

/** Optimal-string-alignment distance includes adjacent swapped characters. */
export function spellingDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1, current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
    }
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length];
}

export function rankSuggestions(term: string, candidates: DictionarySuggestion[]): DictionarySuggestion[] {
  const maximum = term.length <= 3 ? 1 : 2;
  const seen = new Set<string>();
  return candidates.flatMap(candidate => {
    const key = candidate.term.normalize('NFKC').trim().toLocaleLowerCase('en');
    if (seen.has(key)) return [];
    seen.add(key);
    const normalized = suggestionTerm(candidate.term.slice(0, 200));
    if (Math.abs(normalized.length - term.length) > maximum) return [];
    const distance = spellingDistance(term, normalized);
    if (distance > maximum) return [];
    let prefix = 0;
    while (prefix < term.length && term[prefix] === normalized[prefix]) prefix++;
    return [{ candidate, distance, prefix, lengthDifference: Math.abs(normalized.length - term.length) }];
  }).sort((a, b) =>
    a.distance - b.distance || b.prefix - a.prefix || a.lengthDifference - b.lengthDifference
    || a.candidate.term.localeCompare(b.candidate.term, 'en') || a.candidate.id - b.candidate.id,
  ).slice(0, SUGGESTION_LIMIT).map(item => item.candidate);
}
