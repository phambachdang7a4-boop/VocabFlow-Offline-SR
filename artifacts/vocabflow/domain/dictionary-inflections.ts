const VI_FORM_DEFINITION_PREFIX =
  /^(?:quá khứ|phân từ quá khứ|phân từ hiện tại|hiện tại phân từ|dạng quá khứ|dạng phân từ quá khứ|dạng phân từ hiện tại|(?:(?:danh từ|động từ|tính từ|trạng từ)\s+)?số nhiều|(?:(?:danh từ|động từ|tính từ|trạng từ)\s+)?ngôi thứ ba số ít|(?:(?:danh từ|động từ|tính từ|trạng từ)\s+)?so sánh hơn|(?:(?:danh từ|động từ|tính từ|trạng từ)\s+)?so sánh nhất|dạng số nhiều|dạng so sánh hơn|dạng so sánh nhất|động từ\s+chia\s+ở\s+ngôi thứ ba số ít)(?=\s|$)/iu;
const EN_FORM_DEFINITION_PREFIX =
  /^(?:past(?: tense| participle)?|present participle|third[- ]person singular|plural(?: form)?|comparative(?: form)?|superlative(?: form)?)\b/iu;
const ROOT_TERM_AFTER_FORM =
  /\b(?:của|of)\s+(?:(?:từ\s+)?(?:danh|động|tính|trạng)\s+từ\s+)?([\p{L}]+(?:['’\-][\p{L}]+)*)/iu;

/** Only return lemmas explicitly identified by a grammatical-form definition. */
export function explicitInflectionLemmas(
  definitions: readonly string[],
): string[] {
  const lemmas = new Set<string>();
  for (const definition of definitions) {
    const normalized = definition.trim().normalize("NFKC");
    if (
      !VI_FORM_DEFINITION_PREFIX.test(normalized) &&
      !EN_FORM_DEFINITION_PREFIX.test(normalized)
    ) {
      continue;
    }
    const match = ROOT_TERM_AFTER_FORM.exec(normalized);
    const lemma = match?.[1]?.toLocaleLowerCase("en");
    if (lemma && lemma.length >= 2) lemmas.add(lemma);
    if (lemmas.size >= 8) break;
  }
  return [...lemmas];
}
