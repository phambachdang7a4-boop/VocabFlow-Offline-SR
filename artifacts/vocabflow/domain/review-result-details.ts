import {
  pronunciationAccent,
  type DictionaryPronunciation,
} from "./dictionary";

export interface ReviewPronunciationLines {
  us: string[];
  uk: string[];
}

function uniqueIpa(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseSavedPronunciations(value: string): ReviewPronunciationLines {
  const result: ReviewPronunciationLines = { us: [], uk: [] };
  const unlabelled: string[] = [];

  for (const segment of value.split(/\s*·\s*/u).map((part) => part.trim())) {
    if (!segment) continue;
    const match = segment.match(
      /^(Anh-Mỹ\/Anh-Anh|Anh-Mỹ|Anh-Anh|NAmE|BrE|US|UK)\s*:\s*(.+)$/iu,
    );
    if (!match) {
      unlabelled.push(segment);
      continue;
    }

    const label = match[1].toLocaleLowerCase("vi");
    if (label === "anh-mỹ/anh-anh") {
      result.us.push(match[2]);
      result.uk.push(match[2]);
    } else if (label === "anh-anh" || label === "bre" || label === "uk") {
      result.uk.push(match[2]);
    } else {
      result.us.push(match[2]);
    }
  }

  if (!result.us.length && !result.uk.length) result.us.push(...unlabelled);
  return { us: uniqueIpa(result.us), uk: uniqueIpa(result.uk) };
}

export function groupReviewPronunciations(
  pronunciations: readonly DictionaryPronunciation[],
  savedIpa: string,
): ReviewPronunciationLines {
  const saved = parseSavedPronunciations(savedIpa);
  const us = uniqueIpa(
    pronunciations
      .filter((item) => pronunciationAccent(item.region) === "us")
      .map((item) => item.ipa),
  );
  const uk = uniqueIpa(
    pronunciations
      .filter((item) => pronunciationAccent(item.region) === "uk")
      .map((item) => item.ipa),
  );

  return {
    us: us.length ? us : saved.us,
    uk: uk.length ? uk : saved.uk,
  };
}

const REVIEW_EXAMPLE_TRANSLATIONS: Record<string, string> = {
  "it is important to reciprocate a favor kindly.":
    "Điều quan trọng là đáp lại một ân huệ một cách tử tế.",
};

function normalizeExample(example: string): string {
  return example.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

export function reviewExampleTranslation(example: string): string | null {
  return REVIEW_EXAMPLE_TRANSLATIONS[normalizeExample(example)] ?? null;
}
